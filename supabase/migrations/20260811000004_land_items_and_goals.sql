-- ============================================================================
-- 1) Produtos terrestres (hotel, carro, seguro, pacote, outros)
-- 2) Metas de venda (agencia e por vendedor)
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Terrestres: uma tabela para todos os tipos.
--
-- Hotel, carro, seguro, pacote e "outros" compartilham o mesmo nucleo
-- (fornecedor, datas, totais, comissao) e mudam so nos detalhes. Uma tabela
-- por tipo daria cinco tabelas quase iguais; o que e especifico de cada um
-- fica em `details`.
-- ----------------------------------------------------------------------------
create table if not exists monde_sale_land_items (
  id                uuid primary key default gen_random_uuid(),
  sale_id           uuid not null references monde_sales(sale_id) on delete cascade,
  product_type      text not null,     -- hotel | car_rental | insurance | package | other
  item_index        int  not null,
  title             text,              -- nome do hotel, do pacote, do servico
  supplier_name     text,
  supplier_cnpj     text,
  consolidator_name text,
  booking_ref       text,              -- reserva, voucher ou documento
  location          text,              -- destino ou local de retirada
  start_date        date,              -- check-in, retirada, inicio da vigencia
  end_date          date,              -- check-out, devolucao, fim da vigencia
  units             int,               -- diarias, dias de locacao, quantidade
  status            text,
  canceled_at       timestamptz,
  issue_date        date,
  currency          text,
  amount            numeric(14,2),
  customer_amount   numeric(14,2),
  fees              numeric(14,2),
  discount          numeric(14,2),
  commission_amount numeric(14,2),
  details           jsonb,             -- o que e especifico de cada tipo
  unique (sale_id, product_type, item_index)
);

comment on table monde_sale_land_items is
  'Produtos nao aereos da venda. Sem eles, as vendas so de terrestre ficavam sem origem, destino e companhia nas telas.';

create index if not exists land_items_sale_idx     on monde_sale_land_items (sale_id);
create index if not exists land_items_type_idx     on monde_sale_land_items (product_type);
create index if not exists land_items_supplier_idx on monde_sale_land_items (supplier_name);
create index if not exists land_items_start_idx    on monde_sale_land_items (start_date);

-- ----------------------------------------------------------------------------
-- Metas de venda.
--
-- Nao vem do Monde: e configuracao da FlyTop. `scope` separa a meta da
-- agencia (seller_id nulo) da meta de cada vendedor.
-- ----------------------------------------------------------------------------
create table if not exists sales_goals (
  id         uuid primary key default gen_random_uuid(),
  month      date not null,            -- sempre o dia 1 do mes
  scope      text not null check (scope in ('agency', 'seller')),
  seller_id  uuid references monde_sellers(seller_id) on delete cascade,
  amount     numeric(14,2) not null,
  updated_at timestamptz not null default now(),
  -- Uma meta por mes para a agencia; uma por mes para cada vendedor.
  constraint sales_goals_scope_ck check (
    (scope = 'agency' and seller_id is null) or
    (scope = 'seller' and seller_id is not null)
  )
);

create unique index if not exists sales_goals_agency_uk
  on sales_goals (month) where scope = 'agency';
create unique index if not exists sales_goals_seller_uk
  on sales_goals (month, seller_id) where scope = 'seller';

comment on table sales_goals is
  'Metas mensais cadastradas na plataforma. O Monde nao tem esse conceito.';

-- ----------------------------------------------------------------------------
-- Views
-- ----------------------------------------------------------------------------

-- Terrestres por tipo de produto.
create or replace view v_land_by_type
with (security_invoker = on) as
select
  l.product_type,
  count(*)                                   as items,
  count(distinct l.sale_id)                  as sales_count,
  sum(l.customer_amount)                     as revenue,
  sum(l.commission_amount)                   as commission,
  sum(l.units)                               as units
from monde_sale_land_items l
join monde_sales s on s.sale_id = l.sale_id
where s.status <> 'canceled' and l.status is distinct from 'canceled'
group by l.product_type;

-- Terrestres por fornecedor.
create or replace view v_land_by_supplier
with (security_invoker = on) as
select
  l.supplier_name,
  l.product_type,
  count(*)                                   as items,
  sum(l.customer_amount)                     as revenue
from monde_sale_land_items l
join monde_sales s on s.sale_id = l.sale_id
where s.status <> 'canceled' and l.status is distinct from 'canceled'
group by l.supplier_name, l.product_type;

-- Uma linha por item terrestre, com a venda e o cliente juntos.
create or replace view v_land_flat
with (security_invoker = on) as
select
  l.id,
  s.sale_id,
  s.sale_number,
  s.sale_date,
  s.status                                   as sale_status,
  s.travel_agent_name                        as vendedor,
  c.name                                     as cliente,
  c.mobile_number                            as cliente_telefone,
  l.product_type,
  l.title,
  l.supplier_name,
  l.consolidator_name,
  l.booking_ref,
  l.location,
  l.start_date,
  l.end_date,
  l.units,
  l.customer_amount                          as valor,
  l.commission_amount                        as comissao,
  l.status                                   as item_status
from monde_sale_land_items l
join monde_sales s on s.sale_id = l.sale_id
left join monde_customers c on c.id = s.customer_id;

-- Meta x realizado por mes, para a tela de metas e o Dashboard Geral.
create or replace view v_goal_vs_actual
with (security_invoker = on) as
with realizado as (
  select
    date_trunc('month', sale_date)::date as month,
    sum(total_final_value)               as revenue,
    count(*)                             as sales_count
  from monde_sales
  where status <> 'canceled'
  group by date_trunc('month', sale_date)
)
select
  coalesce(g.month, r.month)               as month,
  g.amount                                 as goal,
  coalesce(r.revenue, 0)                   as revenue,
  coalesce(r.sales_count, 0)               as sales_count,
  case when g.amount > 0
       then (coalesce(r.revenue, 0) / g.amount) * 100
  end                                      as goal_pct
from realizado r
full outer join (select * from sales_goals where scope = 'agency') g
  on g.month = r.month;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table monde_sale_land_items enable row level security;
alter table sales_goals           enable row level security;
