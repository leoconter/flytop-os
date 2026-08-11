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
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  fetchSalesPage,
  type MondeSale,
  type SaleStatus,
  toCustomer,
  toPassengerRow,
  toPaymentRows,
  toSaleRow,
  toSegmentRows,
  toTicketRow,
} from "./monde.ts";

/** Dias para trás cobertos pela carga diária — folga para venda cadastrada com atraso. */
const DEFAULT_WINDOW_DAYS = 15;
/** Páginas por chamada no backfill, para não estourar o tempo da função. */
const BACKFILL_PAGES_PER_CALL = 5;

interface Counters {
  pages: number;
  seen: number;
  inserted: number;
  updated: number;
}

/** Grava uma página inteira de uma vez: ~8 consultas, em vez de uma por venda. */
async function persistPage(
  db: SupabaseClient,
  sales: MondeSale[],
  counters: Counters,
): Promise<void> {
  if (!sales.length) return;

  // 1. Clientes (pagante + passageiros), deduplicados dentro do lote — o
  //    Postgres recusa um upsert que afete a mesma linha duas vezes.
  const customerByHash = new Map<string, Record<string, unknown>>();
  const payerHash = new Map<string, string>();
  const passengerHash = new Map<string, string>();

  for (const sale of sales) {
    const payer = await toCustomer(sale.payer);
    if (payer) {
      customerByHash.set(payer.identity_hash, payer);
      payerHash.set(sale.sale_id, payer.identity_hash);
    }
    for (const [ti, ticket] of (sale.airline_tickets ?? []).entries()) {
      for (const [pi, p] of (ticket.passengers ?? []).entries()) {
        const person = await toCustomer(p.person);
        if (person) {
          customerByHash.set(person.identity_hash, person);
          passengerHash.set(`${sale.sale_id}|${ti}|${pi}`, person.identity_hash);
        }
      }
    }
  }

  const idByHash = new Map<string, string>();
  if (customerByHash.size) {
    const rows = [...customerByHash.values()].map((c) => ({
      ...c,
      last_seen_at: new Date().toISOString(),
    }));
    const { data, error } = await db
      .from("monde_customers")
      .upsert(rows, { onConflict: "identity_hash" })
      .select("id, identity_hash");
    if (error) throw new Error(`clientes: ${error.message}`);
    for (const row of data ?? []) idByHash.set(row.identity_hash, row.id);
  }

  // 2. Vendas. Consulta antes o que já existe, só para separar novo de atualizado.
  const saleIds = sales.map((s) => s.sale_id);
  const { data: known, error: knownErr } = await db
    .from("monde_sales")
    .select("sale_id")
    .in("sale_id", saleIds);
  if (knownErr) throw new Error(`vendas existentes: ${knownErr.message}`);
  const existing = new Set((known ?? []).map((r) => r.sale_id));

  const saleRows = sales.map((s) =>
    toSaleRow(s, idByHash.get(payerHash.get(s.sale_id) ?? "") ?? null),
  );
  const { error: saleErr } = await db
    .from("monde_sales")
    .upsert(saleRows, { onConflict: "sale_id" });
  if (saleErr) throw new Error(`vendas: ${saleErr.message}`);

  counters.seen += sales.length;
  counters.inserted += sales.filter((s) => !existing.has(s.sale_id)).length;
  counters.updated += sales.filter((s) => existing.has(s.sale_id)).length;

  // 3. Filhos: apaga e regrava. É o jeito simples de deixar a venda editada no
  //    ERP idêntica aqui — trechos e passageiros pertencem inteiramente à venda.
  //    Apagar o bilhete leva junto trechos e passageiros (ON DELETE CASCADE).
  const { error: delTickets } = await db
    .from("monde_sale_tickets")
    .delete()
    .in("sale_id", saleIds);
  if (delTickets) throw new Error(`limpeza de bilhetes: ${delTickets.message}`);

  const { error: delPayments } = await db
    .from("monde_sale_payments")
    .delete()
    .in("sale_id", saleIds);
  if (delPayments) throw new Error(`limpeza de pagamentos: ${delPayments.message}`);

  // 4. Bilhetes — precisamos dos ids gerados para pendurar trechos e passageiros.
  const ticketRows = sales.flatMap((s) =>
    (s.airline_tickets ?? []).map((t, i) => toTicketRow(s.sale_id, t, i)),
  );
  if (ticketRows.length) {
    const { data: inserted, error } = await db
      .from("monde_sale_tickets")
      .insert(ticketRows)
      .select("id, sale_id, ticket_index");
    if (error) throw new Error(`bilhetes: ${error.message}`);

    const ticketId = new Map<string, string>();
    for (const row of inserted ?? []) {
      ticketId.set(`${row.sale_id}|${row.ticket_index}`, row.id);
    }

    const segments: Record<string, unknown>[] = [];
    const passengers: Record<string, unknown>[] = [];

    for (const sale of sales) {
      for (const [ti, ticket] of (sale.airline_tickets ?? []).entries()) {
        const id = ticketId.get(`${sale.sale_id}|${ti}`);
        if (!id) continue;
        segments.push(...toSegmentRows(id, ticket));
        for (const [pi, p] of (ticket.passengers ?? []).entries()) {
          const hash = passengerHash.get(`${sale.sale_id}|${ti}|${pi}`);
          passengers.push(toPassengerRow(id, p, pi, hash ? idByHash.get(hash) ?? null : null));
        }
      }
    }

    if (segments.length) {
      const { error: segErr } = await db.from("monde_ticket_segments").insert(segments);
      if (segErr) throw new Error(`trechos: ${segErr.message}`);
    }
    if (passengers.length) {
      const { error: paxErr } = await db.from("monde_ticket_passengers").insert(passengers);
      if (paxErr) throw new Error(`passageiros: ${paxErr.message}`);
    }
  }

  // 5. Pagamentos.
  const paymentRows = sales.flatMap((s) => toPaymentRows(s.sale_id, s));
  if (paymentRows.length) {
    const { error } = await db.from("monde_sale_payments").insert(paymentRows);
    if (error) throw new Error(`pagamentos: ${error.message}`);
  }

  // 6. Espelho bruto.
  const rawRows = sales.map((s) => ({
    sale_id: s.sale_id,
    payload: s,
    fetched_at: new Date().toISOString(),
  }));
  const { error: rawErr } = await db
    .from("monde_sales_raw")
    .upsert(rawRows, { onConflict: "sale_id" });
  if (rawErr) throw new Error(`payload bruto: ${rawErr.message}`);

  counters.pages += 1;
}

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

  const counters: Counters = { pages: 0, seen: 0, inserted: 0, updated: 0 };
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
