-- ============================================================================
-- Identificacao das comunidades.
--
-- O group_id da Z-API ("120363421170082651-group") nao diz nada para quem
-- opera; a comunidade e conhecida pelo numero ("#33", "RJ #17"). Estas colunas
-- guardam essa identidade.
--
-- Sao preenchidas por leitura do nome do grupo, que acerta 46 dos 49 -- e
-- editaveis na tela, porque tres nao dao para adivinhar e um numero aparece
-- repetido. O que foi salvo a mao nunca e sobrescrito pela carga.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

alter table whatsapp_groups add column if not exists numero  int;
alter table whatsapp_groups add column if not exists praca   text;
alter table whatsapp_groups add column if not exists apelido text;
-- Grupo desativado sai das telas sem perder o historico: comunidade encerrada
-- continua contando no passado, so nao aparece como ativa hoje.
alter table whatsapp_groups add column if not exists ativo   boolean not null default true;
-- Marca que uma pessoa conferiu. Enquanto for nulo, o valor e so palpite.
alter table whatsapp_groups add column if not exists confirmado_em timestamptz;

comment on column whatsapp_groups.numero is
  'Numero da comunidade, como a FlyTop a chama (#33). Lido do nome, corrigivel na tela.';
comment on column whatsapp_groups.praca is
  'SP, RJ. A numeracao e continua entre as pracas: 15 a 17 sao do Rio e nao existem em SP.';
comment on column whatsapp_groups.apelido is
  'Nome livre, quando numero e praca nao bastam. Tem prioridade nas telas.';
comment on column whatsapp_groups.confirmado_em is
  'Quando alguem confirmou a identificacao. Nulo = ainda e palpite lido do nome.';

create index if not exists whatsapp_groups_numero_idx on whatsapp_groups (praca, numero);

-- ----------------------------------------------------------------------------
-- A view ganha a identificacao para as telas nao repetirem a regra
-- ----------------------------------------------------------------------------
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
  g.members_synced_at,
  g.numero,
  g.praca,
  g.apelido,
  g.ativo,
  g.confirmado_em,
  coalesce(
    nullif(btrim(g.apelido), ''),
    case when g.numero is not null
         then concat_ws(' ', nullif(g.praca, ''), concat('#', g.numero))
    end,
    nullif(btrim(g.name), ''),
    g.group_id
  ) as etiqueta
from whatsapp_groups g;

comment on view v_whatsapp_groups is
  'Grupos com contagem de membros, eventos e a identificacao da comunidade.';
