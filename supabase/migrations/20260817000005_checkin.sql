-- ============================================================================
-- Controle de check-in dos embarques e retornos.
--
-- Duas tabelas:
--
--   checkin_reasons  as justificativas para o check-in NAO ter sido feito.
--                    E cadastro, e nao lista fixa no codigo, porque a operacao
--                    descobre motivos novos com o uso -- o "+" na tela grava
--                    aqui.
--   flight_checkins  o estado de cada voo: feito, ou pendente com um motivo.
--
-- A chave e o `segment_id` (o trecho), nao a venda: uma venda de ida e volta
-- tem dois check-ins, em datas diferentes, e um pode estar feito e o outro nao.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

create table if not exists checkin_reasons (
  id         uuid primary key default gen_random_uuid(),
  label      text not null unique,
  -- Desativada some da lista de escolha, mas continua legivel nos check-ins
  -- que ja a usaram: apagar reescreveria o passado.
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table checkin_reasons is
  'Motivos para o check-in nao ter sido feito. Cadastraveis pela propria tela.';

-- Os rotulos vao com acento: a regra de escrever sem acentuacao vale para os
-- comentarios do SQL, nao para o dado que aparece na tela.
insert into checkin_reasons (label) values
  ('Passaporte pendente'),
  ('Compra por conta própria'),
  ('Aguardando documentação'),
  ('Cliente fará o check-in')
on conflict (label) do nothing;

-- ----------------------------------------------------------------------------
-- O estado de cada voo
-- ----------------------------------------------------------------------------
create table if not exists flight_checkins (
  -- Um registro por trecho. A chave primaria e o proprio segmento: marcar duas
  -- vezes atualiza, nao duplica.
  segment_id uuid primary key references monde_ticket_segments(id) on delete cascade,
  status     text not null check (status in ('feito', 'pendente')),
  -- Obrigatorio quando pendente: pendencia sem motivo nao ajuda ninguem.
  reason_id  uuid references checkin_reasons(id) on delete restrict,
  nota       text,
  -- Quem marcou e quando -- para saber a quem perguntar.
  marked_by  uuid references app_users(user_id) on delete set null,
  marked_at  timestamptz not null default now(),
  constraint pendente_tem_motivo check (status = 'feito' or reason_id is not null)
);

create index if not exists flight_checkins_status_idx on flight_checkins (status);

comment on table flight_checkins is
  'Check-in por trecho: feito, ou pendente com justificativa.';
comment on column flight_checkins.segment_id is
  'O trecho, e nao a venda: ida e volta sao dois check-ins em datas diferentes.';

alter table checkin_reasons  enable row level security;
alter table flight_checkins  enable row level security;
