-- ============================================================================
-- Agendamento diario da sincronizacao do Monde, dentro do proprio Supabase.
--
-- pg_cron dispara, pg_net faz a chamada HTTP para a Edge Function `monde-sync`.
-- O horario e 03:01 UTC = 00:01 em Brasilia (o Brasil nao tem mais horario de
-- verao, entao o deslocamento e fixo o ano todo).
--
-- ANTES de rodar este arquivo, crie o segredo com a service_role key:
--
--   select vault.create_secret(
--     'COLE_AQUI_A_SERVICE_ROLE_KEY',
--     'monde_sync_key',
--     'Chave usada pelo agendador para chamar a Edge Function monde-sync'
--   );
--
-- A chave fica no Vault de proposito: nao pode viver num arquivo versionado.
--
-- Comentarios sem acento: o SQL Editor ja corrompeu acentuacao antes.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotente: rodar de novo apenas reescreve o agendamento.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'monde-sync-diario') then
    perform cron.unschedule('monde-sync-diario');
  end if;
end $$;

do $$
declare
  chave text;
begin
  select decrypted_secret into chave
  from vault.decrypted_secrets
  where name = 'monde_sync_key';

  if chave is null then
    raise exception
      'Segredo "monde_sync_key" nao encontrado no Vault. Crie-o com vault.create_secret() antes de agendar.';
  end if;

  perform cron.schedule(
    'monde-sync-diario',
    '1 3 * * *',
    format(
      $cmd$
      select net.http_post(
        url     := 'https://xqonfprapxuomerlaldu.supabase.co/functions/v1/monde-sync',
        headers := jsonb_build_object(
                     'Content-Type', 'application/json',
                     'Authorization', 'Bearer ' || (
                       select decrypted_secret from vault.decrypted_secrets
                       where name = 'monde_sync_key'
                     )
                   ),
        body    := jsonb_build_object('mode', 'daily'),
        timeout_milliseconds := 120000
      );
      $cmd$
    )
  );
end $$;

-- Conferencia: o agendamento existe e esta ativo?
--   select jobname, schedule, active from cron.job where jobname = 'monde-sync-diario';
--
-- E o que aconteceu nas ultimas execucoes?
--   select status, return_message, start_time
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'monde-sync-diario')
--   order by start_time desc limit 5;
--
-- O resultado da sincronizacao em si fica em `sync_runs`, com contagem e duracao.
