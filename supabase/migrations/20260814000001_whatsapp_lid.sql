-- ============================================================================
-- Identidade dos membros: o WhatsApp parou de entregar telefone.
--
-- A carga inicial dos grupos revelou o que o desenho original nao previa: 99,8%
-- dos participantes chegam apenas com LID (ex.: "193084734365861@lid"), o
-- identificador anonimo que o WhatsApp adotou. O telefone so aparece para quem
-- esta na agenda do numero conectado -- 0,3% de cobertura, medido.
--
-- Duas consequencias no schema:
--
--   1. `phone` deixa de ser obrigatorio. Guardar o LID na coluna de telefone
--      seria pior que nao guardar: "193084734365861" tem cara de telefone e
--      contaminaria o cruzamento com monde_customers.mobile_number, ligando
--      venda a cliente errado.
--   2. A identidade do membro passa a ser `member_key` -- o telefone quando ele
--      existe, o LID quando nao. E o que a unique usa.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Membros
-- ----------------------------------------------------------------------------
alter table whatsapp_members add column if not exists lid        text;
alter table whatsapp_members add column if not exists member_key text;
-- 'webhook' = entrou depois que passamos a escutar; 'carga' = ja estava no
-- grupo quando ligamos o sistema. Sem isso, a carga inicial viraria um pico de
-- 80 mil entradas no grafico do primeiro dia.
alter table whatsapp_members add column if not exists source     text
  not null default 'webhook' check (source in ('webhook', 'carga'));

update whatsapp_members set member_key = phone where member_key is null;

alter table whatsapp_members alter column phone drop not null;
alter table whatsapp_members alter column member_key set not null;

alter table whatsapp_members drop constraint if exists whatsapp_members_group_id_phone_key;
create unique index if not exists whatsapp_members_identidade_idx
  on whatsapp_members (group_id, member_key);
create index if not exists whatsapp_members_lid_idx on whatsapp_members (lid);

comment on column whatsapp_members.phone is
  'Telefone com DDI, so digitos -- quando o WhatsApp entrega. Costuma ser nulo.';
comment on column whatsapp_members.lid is
  'Identificador anonimo do WhatsApp. Estavel por pessoa, mas nao revela o numero.';
comment on column whatsapp_members.member_key is
  'Identidade usada para nao duplicar: o telefone se houver, senao o LID.';

-- ----------------------------------------------------------------------------
-- Log
-- ----------------------------------------------------------------------------
alter table whatsapp_group_events add column if not exists lid        text;
alter table whatsapp_group_events add column if not exists actor_lid  text;
alter table whatsapp_group_events add column if not exists member_key text;

update whatsapp_group_events set member_key = phone where member_key is null;

alter table whatsapp_group_events alter column phone drop not null;
alter table whatsapp_group_events alter column member_key set not null;

create index if not exists whatsapp_events_key_idx on whatsapp_group_events (member_key);

-- ----------------------------------------------------------------------------
-- Retrato do grupo
--
-- Contagem de participantes lida direto da Z-API, um retrato por dia. Existe
-- porque nao depende do webhook: se um aviso se perder, o retrato do dia
-- seguinte corrige o numero. O log conta o que aconteceu; isto confere o saldo.
-- ----------------------------------------------------------------------------
create table if not exists whatsapp_group_snapshots (
  group_id   text not null references whatsapp_groups(group_id) on delete cascade,
  taken_on   date not null,
  members    int  not null,
  admins     int  not null default 0,
  taken_at   timestamptz not null default now(),
  primary key (group_id, taken_on)
);

comment on table whatsapp_group_snapshots is
  'Quantos participantes cada grupo tinha em cada dia, lido da Z-API. Confere o saldo do log.';

-- ----------------------------------------------------------------------------
-- Grupos: o que a Z-API sabe alem do nome
-- ----------------------------------------------------------------------------
alter table whatsapp_groups add column if not exists community_id     text;
alter table whatsapp_groups add column if not exists is_announcement  boolean;
alter table whatsapp_groups add column if not exists invitation_link  text;
alter table whatsapp_groups add column if not exists members_count    int;
alter table whatsapp_groups add column if not exists members_synced_at timestamptz;

comment on column whatsapp_groups.members_count is
  'Ultima contagem lida da Z-API. Numero de referencia da tela, mais confiavel que somar o log.';

-- ----------------------------------------------------------------------------
-- Views
-- ----------------------------------------------------------------------------
-- A carga inicial nao e entrada: sem o filtro, ligar o sistema apareceria como
-- 80 mil pessoas entrando no mesmo dia.
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
    where e.group_id = g.group_id) as eventos,
  g.community_id,
  g.is_announcement,
  g.members_count,
  g.members_synced_at
from whatsapp_groups g;

-- Crescimento por dia a partir dos retratos: independe de o webhook ter
-- recebido cada aviso.
create or replace view v_whatsapp_crescimento
with (security_invoker = on) as
select
  s.taken_on                                            as dia,
  sum(s.members)                                        as membros,
  sum(s.members) - lag(sum(s.members)) over (order by s.taken_on) as variacao
from whatsapp_group_snapshots s
group by s.taken_on;

comment on view v_whatsapp_crescimento is
  'Total de membros por dia, somando todos os grupos, e a variacao em relacao ao dia anterior.';

alter table whatsapp_group_snapshots enable row level security;
