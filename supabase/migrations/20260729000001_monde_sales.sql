-- ============================================================================
-- Espelho do histórico de vendas do Monde (ERP) no Supabase.
--
-- A plataforma lê deste banco, não da API do ERP: a carga é diária, feita pela
-- Edge Function `monde-sync`. Todas as tabelas ficam com RLS ligado e SEM
-- policy — o acesso é exclusivamente via service_role, do servidor.
--
-- Origem dos campos: GET https://web.monde.com.br/api/v3/sales (v3, beta).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Clientes: pagantes e passageiros, consolidados por pessoa.
-- ----------------------------------------------------------------------------
create table if not exists monde_customers (
  id             uuid primary key default gen_random_uuid(),
  -- Identidade estável sem guardar o documento: sha256 do CPF/CNPJ quando
  -- existir; sem documento, hash de nome + nascimento + telefone.
  identity_hash  text not null unique,
  name           text not null,
  person_kind    text,                  -- individual | company
  email          text,
  mobile_number  text,                  -- só dígitos, para casar com o WhatsApp
  phone_number   text,
  birthdate      date,
  city_name      text,
  state_code     text,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now()
);

comment on table monde_customers is
  'Clientes vindos do Monde (pagantes e passageiros). Sem CPF, RG, passaporte e endereço detalhado — só o essencial.';
comment on column monde_customers.mobile_number is
  'Somente dígitos. É a chave que liga a venda ao membro da comunidade de WhatsApp.';

create index if not exists monde_customers_mobile_idx on monde_customers (mobile_number);
create index if not exists monde_customers_email_idx  on monde_customers (lower(email));

-- ----------------------------------------------------------------------------
-- Venda (cabeçalho)
-- ----------------------------------------------------------------------------
create table if not exists monde_sales (
  sale_id            uuid primary key,          -- id da própria API
  sale_number        integer not null,
  sale_date          date not null,
  registered_at      timestamptz,
  period_start       date,                      -- início da viagem
  period_end         date,                      -- fim da viagem
  status             text not null,             -- opened | closed | canceled
  company_identifier text,                      -- CNPJ da empresa/filial
  travel_agent_name  text,                      -- vendedor
  registered_by_name text,
  customer_id        uuid references monde_customers(id) on delete set null,
  total_final_value  numeric(14,2),             -- faturamento
  total_products     numeric(14,2),
  total_fees         numeric(14,2),
  total_discount     numeric(14,2),
  total_revenue      numeric(14,2),             -- margem da agência
  total_payments     numeric(14,2),
  total_balance      numeric(14,2),
  synced_at          timestamptz not null default now()
);

comment on column monde_sales.total_revenue is
  'Receita/margem da agência — não confundir com total_final_value, que é o faturamento.';
comment on column monde_sales.status is
  'canceled só chega quando a sincronização pede status=canceled explicitamente.';

create index if not exists monde_sales_date_idx   on monde_sales (sale_date desc);
create index if not exists monde_sales_status_idx on monde_sales (status);
create index if not exists monde_sales_agent_idx  on monde_sales (travel_agent_name);

-- ----------------------------------------------------------------------------
-- Bilhete aéreo
-- ----------------------------------------------------------------------------
create table if not exists monde_sale_tickets (
  id                    uuid primary key default gen_random_uuid(),
  sale_id               uuid not null references monde_sales(sale_id) on delete cascade,
  ticket_index          int  not null,          -- posição no array da API
  locator               text,                   -- PNR
  issue_date            date,
  status                text,
  canceled_at           timestamptz,
  destination_scope     text,                   -- international | domestic
  -- Cuidado com os nomes da API: `supplier` é a COMPANHIA AÉREA (TAP, LATAM,
  -- ITA) e `representative` é a CONSOLIDADORA (Tp Air, SkyTeam, BRT).
  airline_name          text,                   -- API: supplier.name
  airline_cnpj          text,                   -- API: supplier.cnpj
  airline_code          text,                   -- API: supplier.airline_code
  consolidator_name     text,                   -- API: representative.name
  consolidator_cnpj     text,                   -- API: representative.cnpj
  currency              text,
  exchange_rate         numeric(12,6),
  commission_amount     numeric(14,2),
  commission_percentage numeric(9,4),
  over_amount           numeric(14,2),
  total_amount          numeric(14,2),
  total_customer_amount numeric(14,2),
  total_fees            numeric(14,2),
  rav_fee               numeric(14,2),
  du_fee                numeric(14,2),
  unique (sale_id, ticket_index)
);

create index if not exists monde_tickets_airline_idx      on monde_sale_tickets (airline_name);
create index if not exists monde_tickets_consolidator_idx on monde_sale_tickets (consolidator_name);
create index if not exists monde_tickets_locator_idx      on monde_sale_tickets (locator);

-- ----------------------------------------------------------------------------
-- Trechos do voo (a rota real, com conexões)
-- ----------------------------------------------------------------------------
create table if not exists monde_ticket_segments (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references monde_sale_tickets(id) on delete cascade,
  seq           int  not null,
  origin        text,            -- IATA
  destination   text,
  airline_code  text,
  flight_number text,
  fare_class    text,            -- letra do RBD ("R"), não a cabine comercial
  cabin         text,            -- Executiva/Econômica — derivado, ver docs/monde.md
  departure_at  timestamptz,
  arrival_at    timestamptz,
  unique (ticket_id, seq)
);

comment on column monde_ticket_segments.fare_class is
  'Classe tarifária (RBD) como vem da API. A cabine comercial exige conversão à parte.';

create index if not exists monde_segments_departure_idx on monde_ticket_segments (departure_at);
create index if not exists monde_segments_route_idx     on monde_ticket_segments (origin, destination);

-- ----------------------------------------------------------------------------
-- Passageiros do bilhete
-- ----------------------------------------------------------------------------
create table if not exists monde_ticket_passengers (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references monde_sale_tickets(id) on delete cascade,
  seq           int  not null,
  customer_id   uuid references monde_customers(id) on delete set null,
  emission_name text,            -- nome como emitido no bilhete
  ticket_number text,
  amount        numeric(14,2),
  boarding_fee  numeric(14,2),
  rav_fee       numeric(14,2),
  total_amount  numeric(14,2),
  unique (ticket_id, seq)
);

-- ----------------------------------------------------------------------------
-- Pagamentos
-- ----------------------------------------------------------------------------
create table if not exists monde_sale_payments (
  id                 uuid primary key default gen_random_uuid(),
  sale_id            uuid not null references monde_sales(sale_id) on delete cascade,
  side               text,       -- vendor (fornecedor) | agency (agência)
  method             text,       -- credit_card | bank_deposit | ...
  installments       int,
  card_last_digits   text,
  authorization_code text,
  due_date           date,
  settlement_date    date,
  amount             numeric(14,2)
);

create index if not exists monde_payments_sale_idx on monde_sale_payments (sale_id);

-- ----------------------------------------------------------------------------
-- Espelho fiel do payload da API.
--
-- ATENÇÃO: contém CPF, passaporte e endereço completo. Fica em tabela separada
-- justamente para poder ter acesso mais restrito que as tabelas analíticas.
-- Vale definir uma retenção (ex.: apagar o raw de vendas com mais de 12 meses).
-- ----------------------------------------------------------------------------
create table if not exists monde_sales_raw (
  sale_id    uuid primary key,
  payload    jsonb not null,
  fetched_at timestamptz not null default now()
);

comment on table monde_sales_raw is
  'Payload bruto da API, incluindo dados sensíveis. Acesso restrito; considerar retenção.';

-- ----------------------------------------------------------------------------
-- Auditoria da sincronização
-- ----------------------------------------------------------------------------
create table if not exists sync_runs (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,          -- 'monde'
  mode           text not null,          -- backfill | daily | canceled | full
  status         text not null,          -- running | success | error
  pages_fetched  int  not null default 0,
  sales_seen     int  not null default 0,
  sales_inserted int  not null default 0,
  sales_updated  int  not null default 0,
  error_message  text,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  duration_ms    int
);

comment on table sync_runs is
  'Sem isso não há como saber que a carga de ontem falhou — a tela mostraria número velho como se fosse novo.';

create index if not exists sync_runs_started_idx on sync_runs (started_at desc);

-- ============================================================================
-- Views de leitura das telas. security_invoker garante que a RLS de quem
-- consulta seja respeitada, em vez da do dono da view.
-- ============================================================================

-- Faturamento e margem por dia (canceladas ficam de fora).
create or replace view v_sales_daily
with (security_invoker = on) as
select
  s.sale_date,
  count(*)                                as sales_count,
  sum(s.total_final_value)                as revenue,
  sum(s.total_revenue)                    as margin,
  avg(s.total_final_value)                as avg_ticket
from monde_sales s
where s.status <> 'canceled'
group by s.sale_date;

-- Receita por consolidadora (Tp Air, SkyTeam, BRT...).
create or replace view v_sales_by_consolidator
with (security_invoker = on) as
select
  t.consolidator_name,
  count(distinct s.sale_id)               as sales_count,
  sum(t.total_customer_amount)            as revenue,
  sum(t.commission_amount)                as commission,
  min(s.sale_date)                        as first_sale,
  max(s.sale_date)                        as last_sale
from monde_sale_tickets t
join monde_sales s on s.sale_id = t.sale_id
where s.status <> 'canceled' and t.status is distinct from 'canceled'
group by t.consolidator_name;

-- Receita por companhia emissora do bilhete (TAP, LATAM, ITA...).
-- Difere de v_sales_by_airline, que olha a companhia de cada trecho voado.
create or replace view v_sales_by_ticket_airline
with (security_invoker = on) as
select
  t.airline_name,
  count(distinct s.sale_id)               as sales_count,
  sum(t.total_customer_amount)            as revenue,
  sum(t.commission_amount)                as commission
from monde_sale_tickets t
join monde_sales s on s.sale_id = t.sale_id
where s.status <> 'canceled' and t.status is distinct from 'canceled'
group by t.airline_name;

-- Receita por companhia aérea (a companhia é do trecho, não do bilhete).
create or replace view v_sales_by_airline
with (security_invoker = on) as
select
  g.airline_code,
  count(distinct s.sale_id)               as sales_count,
  sum(s.total_final_value)                as revenue
from monde_ticket_segments g
join monde_sale_tickets t on t.id = g.ticket_id
join monde_sales s        on s.sale_id = t.sale_id
where s.status <> 'canceled'
group by g.airline_code;

-- Rotas mais vendidas (par origem-destino do primeiro trecho).
create or replace view v_sales_by_route
with (security_invoker = on) as
select
  g.origin,
  g.destination,
  count(*)                                as legs,
  count(distinct s.sale_id)               as sales_count,
  sum(s.total_final_value)                as revenue
from monde_ticket_segments g
join monde_sale_tickets t on t.id = g.ticket_id
join monde_sales s        on s.sale_id = t.sale_id
where s.status <> 'canceled' and g.seq = 1
group by g.origin, g.destination;

-- Desempenho por vendedor.
create or replace view v_sales_by_seller
with (security_invoker = on) as
select
  s.travel_agent_name,
  s.sale_date,
  count(*)                                as sales_count,
  sum(s.total_final_value)                as revenue,
  sum(s.total_revenue)                    as margin
from monde_sales s
where s.status <> 'canceled'
group by s.travel_agent_name, s.sale_date;

-- Embarques e retornos: todo trecho futuro, com cliente e localizador.
create or replace view v_upcoming_flights
with (security_invoker = on) as
select
  g.departure_at,
  g.origin,
  g.destination,
  g.airline_code,
  g.flight_number,
  t.locator,
  s.sale_id,
  c.name          as customer_name,
  c.mobile_number as customer_mobile
from monde_ticket_segments g
join monde_sale_tickets t on t.id = g.ticket_id
join monde_sales s        on s.sale_id = t.sale_id
left join monde_customers c on c.id = s.customer_id
where s.status <> 'canceled'
  and t.status is distinct from 'canceled'
  and g.departure_at >= now();

-- ============================================================================
-- RLS: ligada em tudo, sem policy. Só a service_role (servidor) enxerga.
-- ============================================================================
alter table monde_customers          enable row level security;
alter table monde_sales              enable row level security;
alter table monde_sale_tickets       enable row level security;
alter table monde_ticket_segments    enable row level security;
alter table monde_ticket_passengers  enable row level security;
alter table monde_sale_payments      enable row level security;
alter table monde_sales_raw          enable row level security;
alter table sync_runs                enable row level security;
