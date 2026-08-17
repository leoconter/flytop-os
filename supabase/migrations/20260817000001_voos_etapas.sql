-- ============================================================================
-- Ida e volta de cada bilhete.
--
-- A tela de Embarques e retornos precisa de tres respostas: quem parte nas
-- proximas 48h, quem volta nas proximas 48h e quem ja voltou nas ultimas 48h.
-- As tres saem do mesmo lugar -- o primeiro e o ultimo trecho do bilhete.
--
-- Nao da para usar v_upcoming_flights: ela filtra departure_at >= now(), entao
-- nao enxerga quem ja voltou, e trata todo trecho igual -- uma conexao no meio
-- do caminho apareceria como se fosse um embarque.
--
-- `ida_e_volta` separa a viagem que fecha o circulo (1.960 dos 2.196 bilhetes)
-- da que termina noutro lugar ou e so ida: nessas, o ultimo trecho e o fim da
-- viagem, mas chama-lo de "retorno" seria mentira.
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
  -- Bilhete de um trecho so cai em 'ida', que e o que ele e.
  case when g.seq = l.mn then 'ida' else 'volta' end as etapa,
  (l.mx > l.mn)                                   as tem_volta,
  -- Fecha o circulo: termina de onde partiu.
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
  c.mobile_number                                 as customer_mobile
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
  'Primeiro e ultimo trecho de cada bilhete, para embarques e retornos. etapa = ida | volta.';
