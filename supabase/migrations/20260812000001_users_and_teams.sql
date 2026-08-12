-- ============================================================================
-- Usuarios da plataforma e equipes.
--
-- A senha NAO mora aqui: quem guarda credencial e o Supabase Auth (auth.users),
-- com hash e politica proprias. Esta tabela e so o perfil de aplicacao — nome,
-- papel e o vinculo com o vendedor correspondente no Monde, que e o que permite
-- dizer "estas vendas sao suas".
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Equipes
-- ----------------------------------------------------------------------------
create table if not exists teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists teams_name_uk on teams (lower(name));

comment on table teams is
  'Equipes de venda. O Monde nao tem esse conceito — e organizacao da FlyTop.';

-- Um vendedor pertence a uma equipe. Fica em monde_sellers de proposito: o
-- upsert da sincronizacao so escreve as colunas que vem da API, entao esta
-- sobrevive as cargas diarias (mesmo motivo de `team` e `monthly_goal`).
alter table monde_sellers add column if not exists team_id uuid references teams(id) on delete set null;
create index if not exists monde_sellers_team_idx on monde_sellers (team_id);

comment on column monde_sellers.team_id is
  'Equipe do vendedor. Preenchido na plataforma; a sincronizacao nao toca.';

-- ----------------------------------------------------------------------------
-- Perfil de aplicacao dos usuarios
-- ----------------------------------------------------------------------------
create table if not exists app_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name  text not null,
  email      text not null,
  role       text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  -- Quem e essa pessoa nos dados do Monde. Nulo = ainda nao vinculado, e a
  -- Tela do Vendedor nao tem o que mostrar para ela.
  seller_id  uuid references monde_sellers(seller_id) on delete set null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Um vendedor do Monde nao pode estar vinculado a duas contas: senao "as
-- vendas do Joao" apareceriam para duas pessoas diferentes.
create unique index if not exists app_users_seller_uk
  on app_users (seller_id) where seller_id is not null;

create index if not exists app_users_email_idx on app_users (lower(email));

comment on table app_users is
  'Perfil de aplicacao. A credencial vive no Supabase Auth; aqui ficam nome, papel e o vinculo com o vendedor do Monde.';
comment on column app_users.seller_id is
  'Vendedor correspondente em monde_sellers. E o que liga a conta as vendas do ERP.';

-- ----------------------------------------------------------------------------
-- Seguranca: RLS ligada, sem policy. Todo acesso e do servidor, com
-- service_role, depois de a aplicacao ter validado a sessao.
-- ----------------------------------------------------------------------------
alter table teams     enable row level security;
alter table app_users enable row level security;

-- ----------------------------------------------------------------------------
-- Leitura conveniente: usuarios com o nome do vendedor e da equipe.
-- ----------------------------------------------------------------------------
create or replace view v_app_users
with (security_invoker = on) as
select
  u.user_id,
  u.first_name,
  u.last_name,
  u.first_name || ' ' || u.last_name as full_name,
  u.email,
  u.role,
  u.active,
  u.seller_id,
  s.name        as seller_name,
  s.active      as seller_active,
  t.id          as team_id,
  t.name        as team_name,
  u.created_at
from app_users u
left join monde_sellers s on s.seller_id = u.seller_id
left join teams t         on t.id = s.team_id;

comment on view v_app_users is
  'Usuarios da plataforma com o vendedor vinculado e a equipe dele.';
