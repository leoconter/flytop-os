-- ============================================================================
-- Faixas de comissao dos vendedores.
--
-- A regra tem duas pernas, e confundi-las troca o valor por uma ordem de
-- grandeza:
--
--   a FAIXA vem do faturamento do mes  (vendeu 436k -> faixa de 6%)
--   o PERCENTUAL incide sobre a margem (6% de 40.821 = 2.449)
--
-- Por isso as colunas de faixa falam de faturamento e o calculo, na aplicacao,
-- multiplica pela margem.
--
-- A ultima faixa nao tem teto (max_revenue nulo). Sem isso, 22 vendedores-mes
-- dos ultimos seis meses ficariam sem comissao nenhuma -- o maior faturou
-- R$ 1.132.434, e teria recebido zero.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

create table if not exists commission_bands (
  id          uuid primary key default gen_random_uuid(),
  -- Faturamento no mes, a partir de (inclusive).
  min_revenue numeric(14,2) not null,
  -- Ate onde a faixa vale (exclusive). Nulo = ultima faixa, sem teto.
  max_revenue numeric(14,2),
  -- Fracao, nao porcentagem: 0.07 e sete por cento.
  rate        numeric(6,4)  not null check (rate >= 0 and rate <= 1),
  updated_at  timestamptz   not null default now(),
  constraint faixa_coerente check (max_revenue is null or max_revenue > min_revenue)
);

create unique index if not exists commission_bands_inicio_idx
  on commission_bands (min_revenue);

comment on table commission_bands is
  'Faixas de comissao. A faixa e escolhida pelo faturamento do mes; o percentual incide sobre a margem.';
comment on column commission_bands.min_revenue is
  'Faturamento mensal a partir do qual a faixa vale (inclusive).';
comment on column commission_bands.max_revenue is
  'Ate onde vale (exclusive). Nulo na ultima faixa: sem teto.';
comment on column commission_bands.rate is
  'Fracao aplicada sobre a MARGEM do vendedor no mes. 0.07 = 7%.';

-- ----------------------------------------------------------------------------
-- As faixas combinadas
-- ----------------------------------------------------------------------------
insert into commission_bands (min_revenue, max_revenue, rate)
values (0,      250000, 0.00),
       (250000, 350000, 0.05),
       (350000, 450000, 0.06),
       (450000, null,   0.07)
on conflict (min_revenue) do nothing;

alter table commission_bands enable row level security;
