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
  fetchPeople,
  referencias,
  saleId,
  type CustomerRow,
  type MondeSale,
  toCustomer,
  toPassengerRow,
  toPaymentRows,
  toSaleHeaderRow,
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
  /** Vendas que a API devolveu sem identificador — não dá para gravar. */
  skipped: number;
  /** Vendas que tiveram o detalhe buscado (bilhetes, trechos, passageiros). */
  detailed: number;
}

export function emptyCounters(): Counters {
  return { pages: 0, seen: 0, inserted: 0, updated: 0, skipped: 0, detailed: 0 };
}

/**
 * Dados das pessoas citadas por id nas vendas do lote.
 *
 * Vem de `monde_people`, que guarda o mesmo `identity_hash` de
 * `monde_customers` — é o que permite ligar a venda ao cliente sem que a API
 * mande os dados junto. Quem não estiver no catálogo é buscado uma vez em
 * `/people/{id}` e gravado: cliente novo aparece na primeira venda dele, e
 * ressincronizar o catálogo inteiro (33s) a cada carga sairia caro.
 */
async function pessoasPorId(
  db: Db,
  token: string,
  sales: MondeSale[],
): Promise<Map<string, CustomerRow>> {
  const ids = new Set<string>();
  for (const s of sales) {
    const pid = (s.payer as { id?: string } | null)?.id;
    if (pid) ids.add(pid);
    for (const t of s.airline_tickets ?? []) {
      for (const p of t.passengers ?? []) {
        const id = (p.person as { id?: string } | null)?.id;
        if (id) ids.add(id);
      }
    }
  }

  const mapa = new Map<string, CustomerRow>();
  if (!ids.size) return mapa;

  const COLUNAS =
    "person_id, identity_hash, name, person_kind, email, mobile_number, phone_number, birthdate, city_name, state_code";
  const lista = [...ids];
  const achados = new Set<string>();

  for (let i = 0; i < lista.length; i += 200) {
    const { data } = await db
      .from("monde_people")
      .select(COLUNAS)
      .in("person_id", lista.slice(i, i + 200));
    for (const r of data ?? []) {
      achados.add(r.person_id);
      mapa.set(r.person_id, {
        identity_hash: r.identity_hash,
        name: r.name,
        person_kind: r.person_kind,
        email: r.email,
        mobile_number: r.mobile_number,
        phone_number: r.phone_number,
        birthdate: r.birthdate,
        city_name: r.city_name,
        state_code: r.state_code,
      });
    }
  }

  const faltando = lista.filter((id) => !achados.has(id));
  if (faltando.length) {
    console.warn(`[monde] ${faltando.length} pessoa(s) fora do catálogo; buscando individualmente.`);
    const vindas = await fetchPeople(token, faltando);
    const novas: Record<string, unknown>[] = [];
    for (const [id, pessoa] of vindas) {
      const linha = await toCustomer(pessoa);
      if (!linha) continue;
      mapa.set(id, linha);
      novas.push({ person_id: id, ...linha, synced_at: new Date().toISOString() });
    }
    if (novas.length) {
      const { error } = await db
        .from("monde_people")
        .upsert(novas, { onConflict: "person_id" });
      if (error) console.error("[monde] catálogo de pessoas:", error.message);
    }
  }

  return mapa;
}

/**
 * Nome de cada id citado pelas vendas do lote.
 *
 * Duas consultas para o lote inteiro. Quem não estiver no catálogo fica de
 * fora do mapa, e o campo correspondente grava nulo — melhor um vazio honesto
 * que um id cru aparecendo como se fosse nome na tela.
 */
async function resolverNomes(db: Db, ids: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  const unicos = [...new Set(ids.filter(Boolean))];
  if (!unicos.length) return mapa;

  // Lotes: uma lista gigante no `in.()` estoura o tamanho da URL.
  for (let i = 0; i < unicos.length; i += 200) {
    const fatia = unicos.slice(i, i + 200);
    const [vend, pess] = await Promise.all([
      db.from("monde_sellers").select("seller_id, name").in("seller_id", fatia),
      db.from("monde_people").select("person_id, name").in("person_id", fatia),
    ]);
    for (const r of vend.data ?? []) if (r.name) mapa.set(r.seller_id, r.name);
    for (const r of pess.data ?? []) if (r.name && !mapa.has(r.person_id)) mapa.set(r.person_id, r.name);
  }
  return mapa;
}

/**
 * Grava só o cabeçalho e os valores, a partir do resumo da listagem.
 *
 * Não toca nos filhos de propósito: bilhetes, trechos e passageiros vêm do
 * detalhe, e apagá-los aqui deixaria a venda oca até a próxima carga completa.
 */
export async function persistSummaries(
  db: Db,
  resumos: MondeSale[],
  counters: Counters,
): Promise<void> {
  if (!resumos.length) return;

  const ids = resumos.map((s) => saleId(s)!);
  const conhecidas = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db
      .from("monde_sales")
      .select("sale_id")
      .in("sale_id", ids.slice(i, i + 200));
    for (const r of data ?? []) conhecidas.add(r.sale_id);
  }

  const { error } = await db
    .from("monde_sales")
    .upsert(resumos.map(toSaleHeaderRow), { onConflict: "sale_id" });
  if (error) throw new Error(`cabecalhos: ${error.message}`);

  counters.pages += 1;
  counters.seen += resumos.length;
  counters.inserted += ids.filter((id) => !conhecidas.has(id)).length;
  counters.updated += ids.filter((id) => conhecidas.has(id)).length;
}

/** Grava a página inteira de uma vez: ~8 consultas, em vez de uma por venda. */
export async function persistPage(
  db: Db,
  sales: MondeSale[],
  counters: Counters,
  token = "",
): Promise<void> {
  if (!sales.length) return;

  /* Venda sem identificador nunca chega ao banco.
     Era daqui que saía o `invalid input syntax for type uuid: "undefined"`:
     o id virava a string "undefined" dentro do filtro, e o erro do Postgres
     não dizia nada sobre a causa. Descartar e contar é mais honesto — e o
     aviso no log diz qual venda ficou de fora. */
  const comId = sales.filter((s) => {
    if (saleId(s)) return true;
    console.warn("[monde] venda sem identificador, descartada:", s.sale_number ?? "(sem numero)");
    counters.skipped += 1;
    return false;
  });
  if (!comId.length) return;
  sales = comId;

  // 1. Clientes (pagante + passageiros), deduplicados dentro do lote — o
  //    Postgres recusa um upsert que afete a mesma linha duas vezes.
  const customerByHash = new Map<string, CustomerRow>();
  const payerHash = new Map<string, string>();
  const passengerHash = new Map<string, string>();

  /* Desde 14/08/2026 o pagante e os passageiros vêm só como `{id}` — os dados
     da pessoa não estão mais na venda. Quem os tem é `monde_people`, que já
     sincronizamos; a ponte é o `identity_hash`, gravado nas duas tabelas. */
  const pessoas = await pessoasPorId(db, token, sales);

  /** Do que vier na venda (formato antigo) ou do catálogo (formato novo). */
  const resolver = async (ref: unknown): Promise<CustomerRow | null> => {
    const embutido = await toCustomer(ref as Parameters<typeof toCustomer>[0]);
    if (embutido) return embutido;
    const id = (ref as { id?: string } | null)?.id;
    return id ? (pessoas.get(id) ?? null) : null;
  };

  for (const sale of sales) {
    const payer = await resolver(sale.payer);
    if (payer) {
      customerByHash.set(payer.identity_hash, payer);
      payerHash.set(saleId(sale)!, payer.identity_hash);
    }
    for (const [ti, ticket] of (sale.airline_tickets ?? []).entries()) {
      for (const [pi, p] of (ticket.passengers ?? []).entries()) {
        const person = await resolver(p.person);
        if (person) {
          customerByHash.set(person.identity_hash, person);
          passengerHash.set(`${saleId(sale)}|${ti}|${pi}`, person.identity_hash);
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
  const saleIds = sales.map((s) => saleId(s)!);
  const { data: known, error: knownErr } = await db
    .from("monde_sales")
    .select("sale_id")
    .in("sale_id", saleIds);
  if (knownErr) throw new Error(`vendas existentes: ${knownErr.message}`);
  const existing = new Set((known ?? []).map((r: { sale_id: string }) => r.sale_id));

  /* Vendedor, companhia e consolidadora deixaram de vir embutidos na venda em
     14/08/2026 — agora vêm como `{id}`. Resolvemos os nomes de uma vez contra
     o catálogo que já sincronizamos, em vez de uma requisição por referência. */
  const nomes = await resolverNomes(db, sales.flatMap(referencias));

  const saleRows = sales.map((s) =>
    toSaleRow(s, idByHash.get(payerHash.get(saleId(s)!) ?? "") ?? null, nomes),
  );
  const { error: saleErr } = await db
    .from("monde_sales")
    .upsert(saleRows, { onConflict: "sale_id" });
  if (saleErr) throw new Error(`vendas: ${saleErr.message}`);

  /* `persistSummaries` já contou estas vendas: contar de novo dobraria os
     números do painel. Aqui só interessa quantas ganharam detalhe. */
  counters.detailed += sales.length;

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
    (s.airline_tickets ?? []).map((t, i) => toTicketRow(saleId(s)!, t, i, nomes)),
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
        const id = ticketId.get(`${saleId(sale)}|${ti}`);
        if (!id) continue;
        segments.push(...toSegmentRows(id, ticket));
        for (const [pi, p] of (ticket.passengers ?? []).entries()) {
          const hash = passengerHash.get(`${saleId(sale)}|${ti}|${pi}`);
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
  const paymentRows = sales.flatMap((s) => toPaymentRows(saleId(s)!, s));
  if (paymentRows.length) {
    const { error } = await db.from("monde_sale_payments").insert(paymentRows);
    if (error) throw new Error(`pagamentos: ${error.message}`);
  }

  // 6. Terrestres (hotel, carro, seguro, pacote, outros).
  await persistLandItems(
    db,
    sales.map((s) => ({ sale_id: saleId(s)!, payload: s as unknown as Record<string, unknown> })),
  );

  // 7. Espelho bruto.
  const rawRows = sales.map((s) => ({
    sale_id: saleId(s)!,
    payload: s,
    fetched_at: new Date().toISOString(),
  }));
  const { error: rawErr } = await db
    .from("monde_sales_raw")
    .upsert(rawRows, { onConflict: "sale_id" });
  if (rawErr) throw new Error(`payload bruto: ${rawErr.message}`);

  counters.pages += 1;
}
