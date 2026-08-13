-- ============================================================================
-- Tarefas da operacao.
--
-- Cinco tabelas em vez de uma: a tarefa em si, e ao redor dela o que cresce
-- sozinho — checklist, comentarios, anexos e historico. Guardar isso em
-- colunas jsonb da tarefa pareceria mais simples, mas impede contar, ordenar e
-- filtrar, que e exatamente o que a tela de lista precisa fazer.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A tarefa
-- ----------------------------------------------------------------------------
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  -- Numero curto para as pessoas citarem ("a #14"). O uuid nao serve para isso.
  seq          bigint generated always as identity,
  title        text not null check (length(trim(title)) > 0),
  description  text,
  -- Localizador da reserva (PNR). Texto livre: nem toda tarefa tem uma.
  locator      text,
  modality     text not null default 'outro'
    check (modality in ('alteracao_cancelamento', 'servicos_reservas', 'outro')),
  assignee_id  uuid references app_users(user_id) on delete set null,
  priority     text not null default 'media'
    check (priority in ('baixa', 'media', 'alta', 'urgente')),
  status       text not null default 'a_fazer'
    check (status in ('a_fazer', 'em_andamento', 'aguardando', 'concluido')),
  -- Ordem dentro da coluna do kanban. Fracionario de proposito: arrastar um
  -- cartao entre outros dois vira a media dos vizinhos, sem renumerar a coluna.
  position     double precision not null default 0,
  created_by   uuid references app_users(user_id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Preenchido ao entrar em 'concluido', limpo ao sair. Serve para saber
  -- quando terminou sem varrer o historico.
  completed_at timestamptz
);

create index if not exists tasks_status_idx   on tasks (status, position);
create index if not exists tasks_assignee_idx on tasks (assignee_id);
create index if not exists tasks_created_idx  on tasks (created_at desc);
create index if not exists tasks_locator_idx  on tasks (upper(locator));

comment on table tasks is
  'Tarefas da operacao, com fluxo A Fazer -> Em Andamento -> Aguardando -> Concluido.';
comment on column tasks.position is
  'Ordem dentro da coluna do kanban. Fracionario para permitir inserir no meio.';
comment on column tasks.seq is
  'Numero curto de exibicao. Nunca reaproveitado, mesmo apos exclusao.';

-- ----------------------------------------------------------------------------
-- Checklist
-- ----------------------------------------------------------------------------
create table if not exists task_checklist_items (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  label      text not null check (length(trim(label)) > 0),
  done       boolean not null default false,
  position   double precision not null default 0,
  done_at    timestamptz,
  done_by    uuid references app_users(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists task_checklist_task_idx on task_checklist_items (task_id, position);

-- ----------------------------------------------------------------------------
-- Comentarios
-- ----------------------------------------------------------------------------
create table if not exists task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  author_id  uuid references app_users(user_id) on delete set null,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);

create index if not exists task_comments_task_idx on task_comments (task_id, created_at);

-- ----------------------------------------------------------------------------
-- Anexos
--
-- O arquivo vive no Storage; aqui fica so o ponteiro e o que a tela precisa
-- mostrar sem ir buscar o objeto (nome original, tamanho, tipo).
-- ----------------------------------------------------------------------------
create table if not exists task_attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  -- Anexo pode ser da tarefa ou de um comentario especifico.
  comment_id   uuid references task_comments(id) on delete cascade,
  storage_path text not null unique,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid references app_users(user_id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists task_attachments_task_idx on task_attachments (task_id, created_at);

-- ----------------------------------------------------------------------------
-- Historico
--
-- Escrito pela aplicacao, e nao por gatilho: o gatilho nao sabe quem fez a
-- alteracao — o banco so ve a service_role. Como toda escrita passa pelas
-- Server Actions, e la que o autor e conhecido.
-- ----------------------------------------------------------------------------
create table if not exists task_events (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  actor_id   uuid references app_users(user_id) on delete set null,
  kind       text not null,   -- criou | alterou | comentou | anexou | removeu_anexo | checklist
  field      text,            -- status | priority | assignee | title | ...
  from_value text,
  to_value   text,
  created_at timestamptz not null default now()
);

create index if not exists task_events_task_idx on task_events (task_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Leitura da lista
--
-- As contagens vao na view para a tela nao fazer uma consulta por tarefa so
-- para saber que ha "3 comentarios".
-- ----------------------------------------------------------------------------
create or replace view v_tasks
with (security_invoker = on) as
select
  t.id,
  t.seq,
  t.title,
  t.description,
  t.locator,
  t.modality,
  t.priority,
  t.status,
  t.position,
  t.assignee_id,
  a.full_name  as assignee_name,
  t.created_by,
  c.full_name  as created_by_name,
  t.created_at,
  t.updated_at,
  t.completed_at,
  (select count(*) from task_comments    x where x.task_id = t.id) as comments_count,
  (select count(*) from task_attachments x where x.task_id = t.id) as attachments_count,
  (select count(*) from task_checklist_items x where x.task_id = t.id) as checklist_total,
  (select count(*) from task_checklist_items x where x.task_id = t.id and x.done) as checklist_done
from tasks t
left join v_app_users a on a.user_id = t.assignee_id
left join v_app_users c on c.user_id = t.created_by;

comment on view v_tasks is
  'Tarefas com o nome do responsavel e as contagens de comentario, anexo e checklist.';

-- ----------------------------------------------------------------------------
-- Seguranca: RLS ligada, sem policy — igual ao resto. Todo acesso e do
-- servidor, com service_role, depois de a aplicacao validar a sessao.
-- ----------------------------------------------------------------------------
alter table tasks                enable row level security;
alter table task_checklist_items enable row level security;
alter table task_comments        enable row level security;
alter table task_attachments     enable row level security;
alter table task_events          enable row level security;
