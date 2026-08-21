-- ============================================================================
-- Tres leituras da comunidade, cada uma respondendo uma pergunta.
--
--   quantos estao dentro     v_whatsapp_comunidades  uma linha por comunidade
--   como se movimentaram     v_whatsapp_movimento    uma linha por dia/comunidade
--   quem ja passou por aqui  v_whatsapp_pessoas      uma linha por PESSOA
--
-- A diferenca entre a segunda e a terceira e o ponto do desenho: entrada e
-- saida sao fatos separados, e quem entrou e saiu aparece duas vezes no
-- movimento -- e uma vez so na lista de pessoas, com o estado de agora.
--
-- Identidade da pessoa: o telefone quando ele e conhecido (direto ou pelo mapa
-- de whatsapp_identities), o LID quando nao. Sem esse coalesce, a mesma pessoa
-- se dividiria em duas -- num grupo pelo telefone, noutro pelo LID.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Quem e a pessoa, resolvendo as duas formas de identidade
-- ----------------------------------------------------------------------------
create or replace view v_whatsapp_membros_resolvidos
with (security_invoker = on) as
select
  m.id,
  m.group_id,
  m.status,
  m.entradas,
  m.saidas,
  m.joined_at,
  m.left_at,
  m.updated_at,
  m.source,
  coalesce(m.phone, i.phone)                 as telefone,
  coalesce(m.lid, i.lid)                     as lid,
  i.nome,
  -- A chave da pessoa: telefone quando ha, LID quando nao.
  coalesce(m.phone, i.phone, m.lid, m.member_key) as pessoa_key
from whatsapp_members m
left join whatsapp_identities i
       on i.lid = m.lid
       or i.phone = m.phone;

comment on view v_whatsapp_membros_resolvidos is
  'whatsapp_members com a identidade resolvida: telefone quando conhecido, LID quando nao.';

-- ----------------------------------------------------------------------------
-- Uma linha por PESSOA -- ja passou por qualquer comunidade
-- ----------------------------------------------------------------------------
create or replace view v_whatsapp_pessoas
with (security_invoker = on) as
select
  r.pessoa_key,
  max(r.telefone)                                            as telefone,
  max(r.lid)                                                 as lid,
  max(r.nome)                                                as nome,
  -- Esta dentro se continua em pelo menos uma comunidade.
  case when count(*) filter (where r.status = 'dentro') > 0
       then 'dentro' else 'fora' end                         as status,
  count(*) filter (where r.status = 'dentro')                as comunidades_dentro,
  count(*)                                                   as comunidades_ja_passou,
  sum(r.entradas)                                            as entradas,
  sum(r.saidas)                                              as saidas,
  min(r.joined_at)                                           as primeira_entrada,
  max(r.left_at)                                             as ultima_saida,
  max(r.updated_at)                                          as ultima_movimentacao,
  -- Quem so apareceu na carga nunca foi visto se mexer: nao da para dizer
  -- quando entrou, so que estava la.
  bool_and(r.source = 'carga')                               as so_da_carga
from v_whatsapp_membros_resolvidos r
group by r.pessoa_key;

comment on view v_whatsapp_pessoas is
  'Uma linha por pessoa que ja passou pelas comunidades, com o estado atual.';

-- ----------------------------------------------------------------------------
-- Uma linha por comunidade -- o numero de agora, derivado do que o webhook viu
-- ----------------------------------------------------------------------------
create or replace view v_whatsapp_comunidades
with (security_invoker = on) as
select
  g.group_id,
  coalesce(
    nullif(btrim(g.apelido), ''),
    case when g.numero is not null
         then concat_ws(' ', nullif(g.praca, ''), concat('#', g.numero)) end,
    nullif(btrim(g.name), ''),
    g.group_id
  )                                                          as etiqueta,
  g.name,
  g.numero,
  g.praca,
  g.ativo,
  (select count(*) from whatsapp_members m
    where m.group_id = g.group_id and m.status = 'dentro')    as membros,
  (select count(*) from whatsapp_members m
    where m.group_id = g.group_id)                            as ja_passaram,
  (select count(*) from whatsapp_group_events e
    where e.group_id = g.group_id and e.kind = 'entrou')      as entradas,
  (select count(*) from whatsapp_group_events e
    where e.group_id = g.group_id and e.kind in ('saiu', 'removido')) as saidas,
  g.last_event_at
from whatsapp_groups g;

comment on view v_whatsapp_comunidades is
  'Uma linha por comunidade: quantos estao dentro agora e quanta movimentacao houve.';

-- ----------------------------------------------------------------------------
-- Movimentacao por dia e por comunidade -- entrada e saida como fatos separados
-- ----------------------------------------------------------------------------
create or replace view v_whatsapp_movimento
with (security_invoker = on) as
select
  e.group_id,
  (e.occurred_at at time zone 'America/Sao_Paulo')::date      as dia,
  count(*) filter (where e.kind = 'entrou')                   as entradas,
  count(*) filter (where e.kind in ('saiu', 'removido'))      as saidas,
  count(*) filter (where e.kind = 'entrou')
    - count(*) filter (where e.kind in ('saiu', 'removido'))  as saldo
from whatsapp_group_events e
group by e.group_id, 2;

comment on view v_whatsapp_movimento is
  'Entradas e saidas por dia e comunidade. Quem entrou e saiu conta nas duas colunas.';
