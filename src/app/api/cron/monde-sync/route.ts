/**
 * Sincronização diária do Monde, disparada pelo cron da Vercel.
 *
 * Roda aqui, e não numa Edge Function do Supabase, por um motivo prático: a
 * plataforma já está publicada na Vercel com as credenciais do banco
 * configuradas, então o agendamento não depende de mais nenhum login. A lógica
 * de leitura e gravação é a mesma que a Edge Function usa — `runDaily()` é
 * compartilhada, para as duas não divergirem.
 *
 * A rota não é pública: o cron da Vercel manda `Authorization: Bearer
 * $CRON_SECRET`, e sem esse segredo bater a requisição é recusada. Sem isso
 * qualquer um poderia disparar uma varredura na API do ERP.
 */
import { createClient } from "@supabase/supabase-js";
import { runDaily } from "../../../../../supabase/functions/monde-sync/daily.ts";

/** Sempre no servidor, nunca em cache. */
export const dynamic = "force-dynamic";
/** A janela costuma render 2–4 páginas; 60s é folga larga. */
export const maxDuration = 60;

function autorizado(request: Request): boolean {
  const esperado = process.env.CRON_SECRET;
  // Sem segredo configurado, a rota fica fechada — falhar aberto aqui daria a
  // qualquer um o poder de martelar a API do Monde.
  if (!esperado) return false;
  return request.headers.get("authorization") === `Bearer ${esperado}`;
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  const token = process.env.MONDE_API_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !key) {
    return Response.json({ error: "credenciais ausentes" }, { status: 500 });
  }

  const db = createClient(url, key, { auth: { persistSession: false } });
  const inicio = Date.now();

  // Registra antes de começar: uma execução que morre no meio precisa deixar
  // rastro, senão o painel mostra número velho como se fosse novo.
  const { data: run } = await db
    .from("sync_runs")
    .insert({ source: "monde", mode: "daily", status: "running" })
    .select("id")
    .single();

  try {
    const c = await runDaily(db, token);

    await db
      .from("sync_runs")
      .update({
        status: "success",
        pages_fetched: c.pages,
        sales_seen: c.seen,
        sales_inserted: c.inserted,
        sales_updated: c.updated,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - inicio,
      })
      .eq("id", run?.id);

    return Response.json({ ok: true, ...c, duration_ms: Date.now() - inicio });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .from("sync_runs")
      .update({
        status: "error",
        error_message: message,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - inicio,
      })
      .eq("id", run?.id);

    console.error("[cron/monde-sync]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
