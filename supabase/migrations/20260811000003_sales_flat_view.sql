-- ============================================================================
-- v_sales_flat: uma linha por venda, com tudo junto.
--
-- As tabelas continuam normalizadas (uma venda tem N bilhetes, cada bilhete
-- tem N trechos e N passageiros) porque achatar o armazenamento faria a mesma
-- venda aparecer varias vezes e o faturamento ser contado em duplicidade.
--
-- Esta view resolve o outro lado: conferir e exportar sem escrever JOIN.
-- Como e view, nunca sai de sincronia com as tabelas.
--
-- Comentarios sem acento de proposito: o SQL Editor corrompeu acentuacao numa
-- migracao anterior ("Economica" virou "Econ..mica").
-- ============================================================================

create or replace view v_sales_flat
with (security_invoker = on) as
with first_ticket as (
  -- O bilhete principal da venda. Quando ha mais de um, tickets_count avisa.
  select distinct on (sale_id)
    sale_id, id as ticket_id, locator, consolidator_name, airline_name
  from monde_sale_tickets
  order by sale_id, ticket_index
),
seg as (
  select
    ft.sale_id,
    g.seq,
    g.origin,
    g.destination,
    g.fare_class,
    g.departure_at,
    g.arrival_at,
    -- Tempo parado entre chegar e voltar a decolar: e o que revela onde a
    -- pessoa efetivamente ficou, separando destino de conexao.
    lead(g.departure_at) over (partition by g.ticket_id order by g.seq) - g.arrival_at as layover
  from monde_ticket_segments g
  join first_ticket ft on ft.ticket_id = g.ticket_id
),
itinerary as (
  select
    sale_id,
    min(departure_at)                                  as departure_at,
    max(arrival_at)                                    as return_at,
    (array_agg(origin      order by seq))[1]           as origin,
    (array_agg(destination order by seq desc))[1]      as last_destination,
    (array_agg(fare_class  order by seq))[1]           as fare_class,
    (array_agg(origin order by seq))[1] || '-' ||
      string_agg(destination, '-' order by seq)        as route_path,
    count(*)                                           as legs
  from seg
  group by sale_id
),
turnaround as (
  -- Destino principal: o ponto imediatamente antes da parada mais longa.
  select distinct on (sale_id) sale_id, destination
  from seg
  where layover is not null
  order by sale_id, layover desc
),
pax as (
  select t.sale_id, count(*) as passengers
  from monde_ticket_passengers p
  join monde_sale_tickets t on t.id = p.ticket_id
  group by t.sale_id
),
tickets as (
  select sale_id, count(*) as tickets_count
  from monde_sale_tickets
  group by sale_id
)
select
  s.sale_id,
  s.sale_number,
  s.sale_date,
  s.status,
  s.travel_agent_name                                  as vendedor,

  c.name                                               as cliente,
  c.email                                              as cliente_email,
  c.mobile_number                                      as cliente_telefone,
  c.city_name                                          as cliente_cidade,
  c.state_code                                         as cliente_uf,

  i.origin                                             as origem,
  coalesce(tr.destination, i.last_destination)         as destino,
  i.route_path                                         as trecho,
  i.legs                                               as trechos,
  i.departure_at                                       as ida,
  i.return_at                                          as volta,

  ft.airline_name                                      as companhia,
  ft.consolidator_name                                 as consolidadora,
  ft.locator                                           as localizador,
  coalesce(fc.cabin, 'Nao mapeada')                    as classe,
  i.fare_class                                         as classe_tarifaria,

  coalesce(pax.passengers, 0)                          as passageiros,
  coalesce(tk.tickets_count, 0)                        as bilhetes,

  s.total_final_value                                  as valor,
  s.total_revenue                                      as margem,
  s.total_fees                                         as taxas,
  s.total_discount                                     as desconto,

  s.period_start,
  s.period_end,
  s.registered_at
from monde_sales s
left join monde_customers c  on c.id = s.customer_id
left join first_ticket ft    on ft.sale_id = s.sale_id
left join itinerary i        on i.sale_id = s.sale_id
left join turnaround tr      on tr.sale_id = s.sale_id
left join pax                on pax.sale_id = s.sale_id
left join tickets tk         on tk.sale_id = s.sale_id
left join fare_class_map fc  on fc.fare_class = i.fare_class;

comment on view v_sales_flat is
  'Uma linha por venda, com cliente, itinerario, companhia, consolidadora e valores. Para conferencia e exportacao; as telas usam as tabelas normalizadas.';
