-- ============================================================================
-- Mapa de classe tarifaria por companhia.
--
-- A mesma letra muda de cabine conforme a companhia: "P" e Executiva numa e
-- Premium Economy noutra. A tabela passa a aceitar regra especifica por
-- companhia, com as regras atuais virando o padrao (airline_code nulo) usado
-- quando nao ha regra especifica.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

-- 1. Chave nova: (companhia, classe). As linhas existentes viram padrao.
alter table fare_class_map add column if not exists id uuid default gen_random_uuid();
alter table fare_class_map add column if not exists airline_code text;
alter table fare_class_map add column if not exists updated_at timestamptz not null default now();

update fare_class_map set id = gen_random_uuid() where id is null;
alter table fare_class_map alter column id set not null;

alter table fare_class_map drop constraint if exists fare_class_map_pkey;
alter table fare_class_map add primary key (id);

-- NULLS NOT DISTINCT: garante uma unica regra padrao por classe.
drop index if exists fare_class_map_scope_uk;
create unique index fare_class_map_scope_uk
  on fare_class_map (airline_code, fare_class) nulls not distinct;

comment on column fare_class_map.airline_code is
  'Codigo IATA da companhia. Nulo = regra padrao, usada quando a companhia nao tem regra propria.';

-- 2. Uso real: quais combinacoes companhia+classe aparecem nas vendas e como
--    cada uma esta sendo resolvida hoje. E o que a tela de configuracoes
--    mostra, para ninguem precisar adivinhar o que configurar.
create or replace view v_fare_class_usage
with (security_invoker = on) as
with usage as (
  select
    g.airline_code,
    nullif(trim(g.fare_class), '')      as fare_class,
    count(*)                            as legs,
    count(distinct t.sale_id)           as sales_count,
    max(s.sale_date)                    as last_sale
  from monde_ticket_segments g
  join monde_sale_tickets t on t.id = g.ticket_id
  join monde_sales s        on s.sale_id = t.sale_id
  where s.status <> 'canceled'
  group by g.airline_code, nullif(trim(g.fare_class), '')
)
select
  u.airline_code,
  u.fare_class,
  u.legs,
  u.sales_count,
  u.last_sale,
  coalesce(sp.cabin, df.cabin)                        as cabin,
  case
    when sp.cabin is not null then 'especifica'
    when df.cabin is not null then 'padrao'
    else 'nao mapeada'
  end                                                 as source,
  coalesce(sp.confirmed, df.confirmed, false)         as confirmed,
  sp.id                                               as rule_id
from usage u
left join fare_class_map sp
  on sp.airline_code = u.airline_code and sp.fare_class = u.fare_class
left join fare_class_map df
  on df.airline_code is null and df.fare_class = u.fare_class;

comment on view v_fare_class_usage is
  'Combinacoes companhia+classe encontradas nas vendas, com a cabine resolvida e de onde veio a regra.';

-- 3. Resolucao usada pelas telas: cabine de cada trecho, ja com a precedencia
--    (regra da companhia > regra padrao).
create or replace view v_segment_cabin
with (security_invoker = on) as
select
  g.id                                   as segment_id,
  g.ticket_id,
  g.seq,
  g.airline_code,
  g.fare_class,
  coalesce(sp.cabin, df.cabin)           as cabin
from monde_ticket_segments g
left join fare_class_map sp
  on sp.airline_code = g.airline_code and sp.fare_class = nullif(trim(g.fare_class), '')
left join fare_class_map df
  on df.airline_code is null and df.fare_class = nullif(trim(g.fare_class), '');
