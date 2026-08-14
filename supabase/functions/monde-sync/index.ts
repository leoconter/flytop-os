/**
 * Sincroniza as vendas do Monde para o Supabase.
 *
 * Modos (no corpo da requisição, JSON):
 *   { "mode": "daily" }                       janela recente + canceladas (padrão)
 *   { "mode": "backfill", "page": 1 }         carga histórica, em blocos de páginas
 *   { "mode": "canceled" }                    só a listagem de canceladas
 *   { "mode": "full" }                        todas as páginas (use com cuidado)
 *
 * A API devolve as vendas da mais recente para a mais antiga — é isso que
 * permite a carga diária parar cedo, assim que passa da janela.
 *
 * Segredo esperado: MONDE_API_TOKEN (o Basic token da API v3 do Monde).
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { DEFAULT_WINDOW_DAYS, runDaily, runFull } from "./daily.ts";
import { type Counters, emptyCounters } from "./persist.ts";

/** Páginas por chamada no backfill, para não estourar o tempo da função. */

Deno.serve(async (req) => {
  const started = Date.now();
  const body = await req.json().catch(() => ({}));
  const mode: string = body.mode ?? "daily";
  const windowDays: number = body.windowDays ?? DEFAULT_WINDOW_DAYS;

  const token = Deno.env.get("MONDE_API_TOKEN");
  if (!token) {
    return Response.json({ error: "MONDE_API_TOKEN não configurado" }, { status: 500 });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: run } = await db
    .from("sync_runs")
    .insert({ source: "monde", mode, status: "running" })
    .select("id")
    .single();

  const counters: Counters = emptyCounters();
  let nextPage: number | null = null;

  try {
    /* Desde 14/08/2026 a listagem só devolve resumo, e o detalhe é uma
       requisição por venda. `runDaily` e `runFull` cuidam dos dois passos —
       daí os modos aqui terem virado chamadas a elas em vez de laços próprios
       sobre páginas, que era o que existia quando a listagem trazia tudo. */
    if (mode === "canceled") {
      const c = await runDaily(db, token, 0);
      Object.assign(counters, c);
    } else if (mode === "backfill" || mode === "full") {
      const c = await runFull(db, token);
      Object.assign(counters, c);
      nextPage = null;
    } else {
      // Mesma implementação que a rota agendada da Vercel usa.
      const c = await runDaily(db, token, windowDays);
      Object.assign(counters, c);
    }

    await db
      .from("sync_runs")
      .update({
        status: "success",
        pages_fetched: counters.pages,
        sales_seen: counters.seen,
        sales_inserted: counters.inserted,
        sales_updated: counters.updated,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
      })
      .eq("id", run?.id);

    return Response.json({ mode, ...counters, nextPage });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .from("sync_runs")
      .update({
        status: "error",
        error_message: message,
        pages_fetched: counters.pages,
        sales_seen: counters.seen,
        sales_inserted: counters.inserted,
        sales_updated: counters.updated,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
      })
      .eq("id", run?.id);

    console.error("[monde-sync]", message);
    return Response.json({ error: message, ...counters }, { status: 500 });
  }
});
