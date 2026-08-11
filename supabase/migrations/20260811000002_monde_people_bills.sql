-- ============================================================================
-- Segunda leva do Monde: base completa de pessoas, vendedores e financeiro.
--
-- A primeira migração cobriu as vendas. Aqui entram os cadastros que existem
-- independentemente delas — inclusive clientes que ainda não compraram.
--
-- Endpoints vazios na base da FlyTop (não viraram tabela): /quotes, /tasks,
-- /travels, /cost_centers. /logs não é permitido para este token.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Pessoas (GET /people) — a base de cadastro do ERP.
--
-- Diferente de monde_customers, que sai das vendas: aqui está todo mundo,
-- inclusive quem nunca comprou. O `identity_hash` é calculado igual ao de
-- monde_customers, o que permite juntar as duas.
-- ----------------------------------------------------------------------------
create table if not exists monde_people (
  person_id           uuid primary key,        -- id da própria API
  identity_hash       text,                    -- casa com monde_customers
  code                integer,
  person_kind         text,                    -- individual | company
  name                text not null,
  email               text,
  mobile_number       text,                    -- só dígitos
  phone_number        text,
  business_phone      text,
  birthdate           date,
  city_name           text,
  state_code          text,
  seller_name         text,
  -- Datas que o próprio Monde mantém: recompra e viagem sem precisar calcular.
  first_sale_date     date,
  last_sale_date      date,
  last_departure_date date,
  last_return_date    date,
  registered_at       timestamptz,
  synced_at           timestamptz not null default now()
);

comment on table monde_people is
  'Cadastro completo de pessoas do Monde, incluindo quem ainda não comprou.';
comment on column monde_people.first_sale_date is
  'Mantido pelo próprio ERP — dá recompra e tempo de vida do cliente de graça.';

create index if not exists monde_people_identity_idx on monde_people (identity_hash);
create index if not exists monde_people_mobile_idx   on monde_people (mobile_number);
create index if not exists monde_people_lastsale_idx on monde_people (last_sale_date desc);

-- ----------------------------------------------------------------------------
-- Vendedores (GET /sellers)
-- ----------------------------------------------------------------------------
create table if not exists monde_sellers (
  seller_id     uuid primary key,
  name          text not null,
  active        boolean,
  team          text,                 -- preenchido pela FlyTop; não vem do ERP
  monthly_goal  numeric(14,2),        -- idem
  registered_at timestamptz,
  synced_at     timestamptz not null default now()
);

comment on column monde_sellers.team is
  'Equipe do vendedor. O Monde não tem esse conceito — é configuração da FlyTop.';

-- ----------------------------------------------------------------------------
-- Contas a pagar e receber (GET /bills)
-- ----------------------------------------------------------------------------
create table if not exists monde_bills (
  bill_id            uuid primary key,
  number             text,
  transaction_kind   text,            -- debit (pagar) | credit (receber)
  kind               text,
  description        text,
  document           text,
  invoice_number     text,
  amount             numeric(14,2),
  final_amount       numeric(14,2),
  issue_date         date,
  due_date           date,
  settlement_date    date,            -- null = em aberto
  canceled           boolean,
  checked            boolean,
  system_generated   boolean,
  periodicity        text,
  recurrence_kind    text,
  registered_at      timestamptz,
  synced_at          timestamptz not null default now()
);

create index if not exists monde_bills_due_idx        on monde_bills (due_date);
create index if not exists monde_bills_settlement_idx on monde_bills (settlement_date);
create index if not exists monde_bills_kind_idx       on monde_bills (transaction_kind);

-- ----------------------------------------------------------------------------
-- Classe tarifária → cabine comercial.
--
-- A API entrega a letra do RBD ("J", "T") e não a cabine que as telas mostram.
-- Não existe endpoint com essa conversão: /cabins é de CRUZEIRO (Externa,
-- Suíte Luxo), não de avião. A tabela abaixo é semente e PRECISA ser revisada
-- pela FlyTop — a mesma letra muda de cabine conforme a companhia.
-- ----------------------------------------------------------------------------
create table if not exists fare_class_map (
  fare_class   text primary key,
  cabin        text not null,          -- Econômica | Premium Economy | Executiva | First
  confirmed    boolean not null default false,
  observations text
);

comment on table fare_class_map is
  'Semente baseada na convenção IATA. As letras ambíguas (P, R, N, O, S, E) precisam ser confirmadas com a operação antes de virarem número em tela.';

insert into fare_class_map (fare_class, cabin, confirmed, observations) values
  ('F', 'First',            true,  null),
  ('A', 'First',            true,  null),
  ('J', 'Executiva',        true,  null),
  ('C', 'Executiva',        true,  null),
  ('D', 'Executiva',        true,  null),
  ('I', 'Executiva',        true,  null),
  ('Z', 'Executiva',        true,  null),
  ('W', 'Premium Economy',  true,  null),
  ('P', 'Executiva',        false, 'Ambígua: First em algumas companhias, Premium Economy em outras. 80 trechos.'),
  ('R', 'Executiva',        false, 'Ambígua: First/Executiva conforme a companhia. 42 trechos.'),
  ('N', 'Econômica',        false, 'Pode ser Premium Economy em algumas companhias. 74 trechos.'),
  ('O', 'Econômica',        false, 'Pode ser Premium Economy em algumas companhias.'),
  ('S', 'Econômica',        false, 'Pode ser Premium Economy em algumas companhias.'),
  ('E', 'Econômica',        false, 'Pode ser Premium Economy em algumas companhias.'),
  ('Y', 'Econômica',        true,  null),
  ('B', 'Econômica',        true,  null),
  ('H', 'Econômica',        true,  null),
  ('K', 'Econômica',        true,  null),
  ('L', 'Econômica',        true,  null),
  ('M', 'Econômica',        true,  null),
  ('Q', 'Econômica',        true,  null),
  ('T', 'Econômica',        true,  null),
  ('V', 'Econômica',        true,  null),
  ('X', 'Econômica',        true,  null),
  ('U', 'Econômica',        true,  null),
  ('G', 'Econômica',        true,  null)
on conflict (fare_class) do nothing;

-- ----------------------------------------------------------------------------
-- Views novas
-- ----------------------------------------------------------------------------

-- Classes mais vendidas, já traduzidas para cabine comercial.
create or replace view v_sales_by_cabin
with (security_invoker = on) as
select
  coalesce(f.cabin, 'Não mapeada')        as cabin,
  count(distinct s.sale_id)               as sales_count,
  count(*)                                as legs,
  sum(s.total_final_value)                as revenue
from monde_ticket_segments g
join monde_sale_tickets t on t.id = g.ticket_id
join monde_sales s        on s.sale_id = t.sale_id
left join fare_class_map f on f.fare_class = g.fare_class
where s.status <> 'canceled' and g.seq = 1
group by coalesce(f.cabin, 'Não mapeada');

-- Fluxo de caixa: entradas e saídas por mês de vencimento.
create or replace view v_cash_flow_monthly
with (security_invoker = on) as
select
  date_trunc('month', due_date)::date      as month,
  transaction_kind,
  count(*)                                 as items,
  sum(final_amount)                        as total,
  sum(final_amount) filter (where settlement_date is null) as open_total
from monde_bills
where canceled is not true and due_date is not null
group by date_trunc('month', due_date), transaction_kind;

-- Recompra: clientes por número de compras, usando as datas do próprio ERP.
create or replace view v_customer_lifecycle
with (security_invoker = on) as
select
  p.person_id,
  p.name,
  p.mobile_number,
  p.city_name,
  p.state_code,
  p.first_sale_date,
  p.last_sale_date,
  p.last_return_date,
  case
    when p.first_sale_date is null then 'nunca comprou'
    when p.first_sale_date = p.last_sale_date then 'comprou uma vez'
    else 'recorrente'
  end                                      as lifecycle,
  (p.last_sale_date - p.first_sale_date)   as days_between_first_and_last
from monde_people p;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table monde_people   enable row level security;
alter table monde_sellers  enable row level security;
alter table monde_bills    enable row level security;
alter table fare_class_map enable row level security;
