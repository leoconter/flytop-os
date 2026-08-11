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
import { fetchSalesPage } from "./monde.ts";
import { type Counters, emptyCounters, persistPage } from "./persist.ts";

/** Dias para trás cobertos pela carga diária — folga para venda cadastrada com atraso. */
const DEFAULT_WINDOW_DAYS = 15;
/** Páginas por chamada no backfill, para não estourar o tempo da função. */
const BACKFILL_PAGES_PER_CALL = 5;

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
    if (mode === "canceled") {
      let page = 1;
      let totalPages = 1;
      do {
        const res = await fetchSalesPage(token, page, "canceled");
        totalPages = res.totalPages;
        await persistPage(db, res.sales, counters);
        page++;
      } while (page <= totalPages);
    } else if (mode === "backfill" || mode === "full") {
      const first: number = body.page ?? 1;
      const limit: number = mode === "full" ? Infinity : (body.pages ?? BACKFILL_PAGES_PER_CALL);
      let page = first;
      let totalPages = 1;

      while (page - first < limit) {
        const res = await fetchSalesPage(token, page);
        totalPages = res.totalPages;
        await persistPage(db, res.sales, counters);
        page++;
        if (page > totalPages) break;
      }
      nextPage = page <= totalPages ? page : null;
    } else {
      // Diário: anda enquanto as vendas estiverem dentro da janela. Como a API
      // ordena da mais recente para a mais antiga, isso para nas primeiras
      // páginas em vez de varrer as 47.
      const cutoff = new Date(Date.now() - windowDays * 86_400_000)
        .toISOString()
        .slice(0, 10);
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const res = await fetchSalesPage(token, page);
        totalPages = res.totalPages;
        const inWindow = res.sales.filter((s) => s.sale_date >= cutoff);
        await persistPage(db, inWindow, counters);
        if (inWindow.length < res.sales.length) break; // passou da janela
        page++;
      }

      // Canceladas somem da listagem padrão: sem este passo, uma venda
      // cancelada no ERP ficaria valendo aqui para sempre.
      let cPage = 1;
      let cTotal = 1;
      do {
        const res = await fetchSalesPage(token, cPage, "canceled");
        cTotal = res.totalPages;
        await persistPage(db, res.sales, counters);
        cPage++;
      } while (cPage <= cTotal);
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
