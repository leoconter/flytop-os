-- ============================================================================
-- O que conta como "ja retornou".
--
-- A primeira versao usava "o bilhete tem mais de um trecho", e errava nos dois
-- sentidos -- conferido nos dois casos reais da janela de 48h:
--
--   Maria Fernanda: GIG -> MIA -> PHL -> TPA. Saiu do Rio e esta em Tampa.
--                   Aparecia como retornada. Ligar perguntando "como foi a
--                   viagem?" para quem ainda esta viajando.
--   Rodrigo:        PMI -> LIS -> GRU, bilhete comprado so para a volta. Nao
--                   fecha circulo, entao a regra de "volta pra origem" o
--                   escondia -- e ele tinha acabado de pousar em Sao Paulo.
--
-- O que separa os dois nao e o formato do bilhete, e onde a pessoa terminou.
-- Dai a regra: e retorno quando o ultimo trecho fecha o circulo OU quando ele
-- desembarca no Brasil, que e de onde a clientela sai e para onde volta.
--
-- Aeroporto brasileiro fora da lista cai no criterio do circulo, que sozinho ja
-- cobre 1.960 dos 2.196 bilhetes -- o erro possivel e esconder um retorno, nao
-- inventar um.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

create or replace view v_voos_etapas
with (security_invoker = on) as
with lim as (
  select ticket_id, min(seq) as mn, max(seq) as mx
    from monde_ticket_segments
   group by ticket_id
)
select
  g.id                                            as segment_id,
  t.id                                            as ticket_id,
  s.sale_id,
  case when g.seq = l.mn then 'ida' else 'volta' end as etapa,
  (l.mx > l.mn)                                   as tem_volta,
  (l.mx > l.mn and g.destination is not distinct from
     (select o.origin from monde_ticket_segments o
       where o.ticket_id = l.ticket_id and o.seq = l.mn)) as volta_pra_origem,

  g.origin,
  g.destination,
  g.departure_at,
  g.arrival_at,
  g.airline_code,
  g.flight_number,
  t.locator,
  t.airline_name,
  s.travel_agent_name                             as vendedor,
  c.name                                          as customer_name,
  c.mobile_number                                 as customer_mobile,
  -- A pergunta que a tela faz: esta pessoa esta em casa agora?
  (
    g.seq = l.mx
    and l.mx > l.mn
    and (
      g.destination is not distinct from
        (select o.origin from monde_ticket_segments o
          where o.ticket_id = l.ticket_id and o.seq = l.mn)
      or g.destination in (
        'GRU','CGH','VCP','GIG','SDU','BSB','CNF','PLU','POA','CWB','FLN',
        'REC','SSA','FOR','BEL','MAO','VIX','GYN','CGB','CGR','NAT','JPA',
        'MCZ','AJU','THE','SLZ','PVH','RBR','BVB','MCP','PMW','IGU','JOI',
        'NVT','LDB','MGF','RAO','SJP','UDI','IPN','JDO','PNZ','IOS','BPS',
        'CXJ','PET','URG','MII','BAU','DOU','SJK','MOC','JJG','CPV'
      )
    )
  )                                               as retorno_para_casa
from monde_ticket_segments g
join lim l
  on l.ticket_id = g.ticket_id
 and g.seq in (l.mn, l.mx)
join monde_sale_tickets t on t.id = g.ticket_id
join monde_sales s on s.sale_id = t.sale_id
left join monde_customers c on c.id = s.customer_id
where s.status <> 'canceled'
  and t.status is distinct from 'canceled';

comment on view v_voos_etapas is
  'Primeiro e ultimo trecho de cada bilhete. retorno_para_casa = o ultimo trecho traz o cliente de volta.';
