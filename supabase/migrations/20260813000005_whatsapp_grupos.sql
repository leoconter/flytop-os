-- ============================================================================
-- Entradas e saidas das comunidades de WhatsApp (via Z-API).
--
-- Tres tabelas com papeis diferentes:
--
--   whatsapp_group_events  o log cru, append-only. E a fonte da verdade: se a
--                          leitura do estado errar, da para recontar a partir
--                          daqui. Nunca e atualizado, so recebe linha.
--   whatsapp_members       o estado atual de cada pessoa em cada grupo,
--                          derivado do log. Responde "quem esta dentro agora"
--                          sem varrer o historico inteiro.
--   whatsapp_groups        o grupo em si, com o nome mais recente visto.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

create table if not exists whatsapp_groups (
  -- O identificador que a Z-API manda no campo `phone`, ex.: "12036...-group".
  group_id      text primary key,
  name          text,
  first_seen_at timestamptz not null default now(),
  last_event_at timestamptz not null default now()
);

comment on table whatsapp_groups is
  'Grupos de WhatsApp acompanhados. Descobertos pelos proprios eventos, nao cadastrados a mao.';

-- ----------------------------------------------------------------------------
-- Estado atual de cada pessoa em cada grupo
-- ----------------------------------------------------------------------------
create table if not exists whatsapp_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   text not null references whatsapp_groups(group_id) on delete cascade,
  -- So digitos, com DDI. E a mesma forma de monde_customers.mobile_number, que
  -- e o que vai permitir cruzar membro da comunidade com cliente que comprou.
  phone      text not null,
  status     text not null default 'dentro' check (status in ('dentro', 'fora')),
  joined_at  timestamptz,
  left_at    timestamptz,
  -- Quantas vezes essa pessoa ja entrou nesse grupo. Entrar, sair e voltar e
  -- comum, e a contagem separa o membro novo do reincidente.
  entradas   int not null default 0,
  saidas     int not null default 0,
  updated_at timestamptz not null default now(),
  unique (group_id, phone)
);

create index if not exists whatsapp_members_phone_idx  on whatsapp_members (phone);
create index if not exists whatsapp_members_status_idx on whatsapp_members (group_id, status);

comment on table whatsapp_members is
  'Quem esta em cada grupo agora. Derivado de whatsapp_group_events.';

-- ----------------------------------------------------------------------------
-- O log
-- ----------------------------------------------------------------------------
create table if not exists whatsapp_group_events (
  id           uuid primary key default gen_random_uuid(),
  group_id     text not null,
  group_name   text,
  -- Telefone de quem entrou ou saiu.
  phone        text not null,
  -- Quem fez a acao, quando a Z-API informa (adicionou/removeu alguem).
  actor_phone  text,
  kind         text not null
    check (kind in ('entrou', 'saiu', 'removido', 'convidado', 'promovido',
                    'rebaixado', 'pediu_entrada', 'outro')),
  -- O valor original do campo `notification`, guardado como veio: se a Z-API
  -- criar um evento novo, ele fica registrado mesmo caindo em 'outro'.
  notification text not null,
  -- "invite_link" ou "non_admin_add", quando vem.
  method       text,
  occurred_at  timestamptz not null,
  -- Chave de idempotencia: o mesmo aviso reenviado nao vira duas entradas.
  event_key    text not null unique,
  payload      jsonb,
  received_at  timestamptz not null default now()
);

create index if not exists whatsapp_events_group_idx on whatsapp_group_events (group_id, occurred_at desc);
create index if not exists whatsapp_events_dia_idx   on whatsapp_group_events (occurred_at desc);
create index if not exists whatsapp_events_phone_idx on whatsapp_group_events (phone);

comment on table whatsapp_group_events is
  'Log de entradas e saidas dos grupos, como a Z-API notificou. Append-only.';
comment on column whatsapp_group_events.event_key is
  'Identidade do aviso (messageId + telefone). A Z-API pode reenviar; isto impede contar duas vezes.';

-- ----------------------------------------------------------------------------
-- Leitura por dia, para o grafico de entradas x saidas
-- ----------------------------------------------------------------------------
create or replace view v_whatsapp_daily
with (security_invoker = on) as
select
  (occurred_at at time zone 'America/Sao_Paulo')::date as dia,
  count(*) filter (where kind = 'entrou')                       as entradas,
  count(*) filter (where kind in ('saiu', 'removido'))          as saidas,
  count(*) filter (where kind = 'entrou')
    - count(*) filter (where kind in ('saiu', 'removido'))      as saldo
from whatsapp_group_events
group by 1;

comment on view v_whatsapp_daily is
  'Entradas, saidas e saldo por dia (fuso de Sao Paulo).';

create or replace view v_whatsapp_groups
with (security_invoker = on) as
select
  g.group_id,
  g.name,
  g.first_seen_at,
  g.last_event_at,
  (select count(*) from whatsapp_members m
    where m.group_id = g.group_id and m.status = 'dentro') as membros,
  (select count(*) from whatsapp_group_events e
    where e.group_id = g.group_id) as eventos
from whatsapp_groups g;

comment on view v_whatsapp_groups is
  'Grupos com a contagem de membros dentro e de eventos recebidos.';

-- ----------------------------------------------------------------------------
-- Seguranca: RLS ligada, sem policy — igual ao resto. Quem escreve e a rota do
-- webhook, no servidor, com service_role.
-- ----------------------------------------------------------------------------
alter table whatsapp_groups       enable row level security;
alter table whatsapp_members      enable row level security;
alter table whatsapp_group_events enable row level security;
