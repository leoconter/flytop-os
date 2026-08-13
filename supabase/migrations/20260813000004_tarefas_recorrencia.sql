-- ============================================================================
-- Recorrencia das tarefas.
--
-- O gatilho e a conclusao, como no ClickUp: ao entrar em Concluido, a
-- aplicacao calcula a proxima data e guarda em recur_next_at. Quando essa data
-- chega, a tarefa volta (ou uma copia e criada).
--
-- A conta da proxima data fica na aplicacao, e nao aqui: e onde da para testar
-- "toda quinta, a cada duas semanas" com calendario de verdade. O banco so
-- responde "ja chegou o dia?", que e trivial.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

alter table tasks
  add column if not exists recur_kind text
    check (recur_kind in ('diaria', 'semanal', 'mensal', 'personalizada')),
  add column if not exists recur_interval int not null default 1
    check (recur_interval between 1 and 365),
  add column if not exists recur_unit text
    check (recur_unit in ('dia', 'semana', 'mes')),
  -- 0 = domingo, como o getUTCDay() do JavaScript.
  add column if not exists recur_weekdays smallint[] not null default '{}',
  add column if not exists recur_monthday smallint
    check (recur_monthday between 1 and 31),
  -- Criar uma copia em vez de reabrir esta. Util quando o historico de cada
  -- ocorrencia importa ("conferir e-mails" de ontem nao e o de hoje).
  add column if not exists recur_new_task boolean not null default false,
  add column if not exists recur_reset_status text not null default 'a_fazer'
    check (recur_reset_status in ('a_fazer', 'em_andamento', 'aguardando')),
  -- Quando a tarefa deve voltar. Nulo = nao ha ocorrencia agendada.
  add column if not exists recur_next_at date,
  -- De qual tarefa esta copia nasceu.
  add column if not exists recur_origin uuid references tasks(id) on delete set null;

create index if not exists tasks_recur_idx on tasks (recur_next_at)
  where recur_next_at is not null;

comment on column tasks.recur_next_at is
  'Dia em que a tarefa recorrente volta. Calculado ao concluir; limpo ao voltar.';
comment on column tasks.recur_weekdays is
  'Dias da semana da recorrencia semanal. 0 = domingo.';

-- ----------------------------------------------------------------------------
-- A view precisa entregar os campos novos.
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
  (select count(*) from task_checklist_items x where x.task_id = t.id and x.done) as checklist_done,
  t.recur_kind,
  t.recur_interval,
  t.recur_unit,
  t.recur_weekdays,
  t.recur_monthday,
  t.recur_new_task,
  t.recur_reset_status,
  t.recur_next_at
from tasks t
left join v_app_users a on a.user_id = t.assignee_id
left join v_app_users c on c.user_id = t.created_by;

-- ----------------------------------------------------------------------------
-- Quem faz a tarefa voltar.
--
-- Roda uma vez por dia. Nao precisa de Edge Function: nao ha chamada externa,
-- so leitura e escrita no proprio banco.
-- ----------------------------------------------------------------------------
create or replace function reabrir_tarefas_recorrentes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  hoje  date := (now() at time zone 'America/Sao_Paulo')::date;
  t     record;
  nova  uuid;
  n     integer := 0;
begin
  for t in
    select * from tasks
    where recur_kind is not null
      and recur_next_at is not null
      and recur_next_at <= hoje
  loop
    if t.recur_new_task then
      -- Copia: a concluida fica no historico, a nova comeca limpa. O checklist
      -- vem junto, desmarcado — e o roteiro da tarefa, nao o resultado dela.
      insert into tasks (
        title, description, locator, modality, assignee_id, priority, status,
        position, created_by, recur_kind, recur_interval, recur_unit,
        recur_weekdays, recur_monthday, recur_new_task, recur_reset_status,
        recur_origin
      )
      values (
        t.title, t.description, t.locator, t.modality, t.assignee_id, t.priority,
        t.recur_reset_status,
        coalesce((select min(position) - 1 from tasks where status = t.recur_reset_status), 0),
        t.created_by, t.recur_kind, t.recur_interval, t.recur_unit,
        t.recur_weekdays, t.recur_monthday, t.recur_new_task, t.recur_reset_status,
        coalesce(t.recur_origin, t.id)
      )
      returning id into nova;

      insert into task_checklist_items (task_id, label, position)
      select nova, label, position from task_checklist_items where task_id = t.id;

      -- A copia leva a recorrencia adiante; a original para por aqui.
      update tasks set recur_next_at = null, recur_kind = null where id = t.id;

      insert into task_events (task_id, kind, to_value)
      values (nova, 'recorrencia', 'nova ocorrencia');
    else
      update tasks
      set status       = t.recur_reset_status,
          completed_at = null,
          recur_next_at = null,
          position     = coalesce((select min(position) - 1 from tasks where status = t.recur_reset_status), 0),
          updated_at   = now()
      where id = t.id;

      update task_checklist_items
      set done = false, done_at = null, done_by = null
      where task_id = t.id and done;

      insert into task_events (task_id, kind, to_value)
      values (t.id, 'recorrencia', 'reaberta pela recorrencia');
    end if;

    n := n + 1;
  end loop;

  return n;
end;
$$;

comment on function reabrir_tarefas_recorrentes is
  'Devolve as tarefas recorrentes cujo dia chegou. Roda pelo pg_cron, uma vez ao dia.';

-- ----------------------------------------------------------------------------
-- Agendamento: 03:10 GMT = 00:10 em Sao Paulo, logo depois da carga do Monde.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'tarefas-recorrentes') then
    perform cron.unschedule('tarefas-recorrentes');
  end if;
  perform cron.schedule('tarefas-recorrentes', '10 3 * * *',
    $cmd$ select reabrir_tarefas_recorrentes() $cmd$);
end;
$$;
