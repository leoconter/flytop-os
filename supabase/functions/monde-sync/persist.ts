/**
 * Gravação de uma página de vendas no Supabase.
 *
 * Fica separado da Edge Function porque a carga histórica roda da máquina
 * (Node) e o diário roda no Deno: a lógica de escrita é a mesma, e duplicá-la
 * seria pedir para as duas divergirem.
 *
 * O cliente é tipado estruturalmente para servir aos dois — no Deno ele vem de
 * `jsr:@supabase/supabase-js`, no Node de `node_modules`.
 */
import {
  type MondeSale,
  toCustomer,
  toPassengerRow,
  toPaymentRows,
  toSaleRow,
  toSegmentRows,
  toTicketRow,
} from "./monde.ts";
import { persistLandItems } from "./land.ts";

// deno-lint-ignore no-explicit-any
export type Db = { from: (table: string) => any };

export interface Counters {
  pages: number;
  seen: number;
  inserted: number;
  updated: number;
}

export function emptyCounters(): Counters {
  return { pages: 0, seen: 0, inserted: 0, updated: 0 };
}

/** Grava a página inteira de uma vez: ~8 consultas, em vez de uma por venda. */
export async function persistPage(
  db: Db,
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
  const existing = new Set((known ?? []).map((r: { sale_id: string }) => r.sale_id));

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

  // 6. Terrestres (hotel, carro, seguro, pacote, outros).
  await persistLandItems(
    db,
    sales.map((s) => ({ sale_id: s.sale_id, payload: s as unknown as Record<string, unknown> })),
  );

  // 7. Espelho bruto.
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
