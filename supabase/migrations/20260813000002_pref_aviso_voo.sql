-- Preferência de conta: ver ou não o aviãozinho de alerta enviado.
--
-- Fica no banco, e não no navegador, porque é preferência da pessoa e não do
-- aparelho: quem desligou no computador não quer ligar de novo ao abrir em
-- outra máquina. O silenciar do som continua sendo por navegador — aquilo é
-- decisão do ambiente ("estou numa reunião"), não da conta.

alter table app_users
  add column if not exists alert_flyby boolean not null default true;

comment on column app_users.alert_flyby is
  'Mostrar o aviso animado quando um alerta e marcado como enviado.';

-- A view é o que a plataforma lê; sem recriá-la a coluna nova não chega à tela.
-- `create or replace` só aceita coluna nova no fim da lista — mexer na ordem do
-- meio daria "cannot change name of view column". Por isso `alert_flyby` entra
-- por último, e não junto de `active`, onde ficaria melhor de ler.
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
  u.created_at,
  u.alert_flyby
from app_users u
left join monde_sellers s on s.seller_id = u.seller_id
left join teams t         on t.id = s.team_id;

comment on view v_app_users is
  'Usuarios da plataforma com o vendedor vinculado e a equipe dele.';
