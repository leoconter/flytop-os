/**
 * Cliente e mapeamento da API v3 do Monde.
 *
 * Todo o parsing do ERP mora aqui: o endpoint de vendas está marcado como
 * Beta na documentação, então concentrar a leitura num módulo só evita que
 * uma mudança da API se espalhe pelo resto do código.
 *
 * Referência: GET https://web.monde.com.br/api/v3/sales
 */

const BASE = "https://web.monde.com.br/api/v3";
/** Teto da API; menos páginas = menos requisições. */
export const PAGE_SIZE = 50;

export type SaleStatus = "opened" | "closed" | "canceled";

export interface SalesPage {
  sales: MondeSale[];
  page: number;
  hasNext: boolean;
  total: number;
}

/* ------------------------------ tipos da API ------------------------------ */

interface MondeAddress {
  city_name?: string | null;
  state_code?: string | null;
}

interface MondePerson {
  name?: string | null;
  legal_name?: string | null;
  person_kind?: string | null;
  email?: string | null;
  mobile_number?: string | null;
  phone_number?: string | null;
  birthdate?: string | null;
  cpf_cnpj?: string | null;
  cpf?: string | null;
  address?: MondeAddress | null;
}

interface MondeSegment {
  origin?: string | null;
  destination?: string | null;
  airline_code?: string | null;
  flight_number?: string | null;
  class?: string | null;
  departure_date?: string | null;
  arrival_date?: string | null;
}

interface MondePassenger {
  emission_name?: string | null;
  ticket_number?: string | null;
  amount?: number | null;
  boarding_fee?: number | null;
  rav_fee?: number | null;
  total_amount?: number | null;
  person?: MondePerson | null;
}

interface MondeTicket {
  locator?: string | null;
  issue_date?: string | null;
  status?: string | null;
  canceled_at?: string | null;
  destination?: string | null;
  currency?: string | null;
  exchange_rate?: number | null;
  commission_amount?: number | null;
  commission_percentage?: number | null;
  over_amount?: number | null;
  /** Apesar do nome, é a COMPANHIA AÉREA emissora (TAP, LATAM, ITA...). */
  supplier?: {
    id?: string | null;
    name?: string | null;
    cnpj?: string | null;
    airline_code?: string | null;
  } | null;
  /** A CONSOLIDADORA (Tp Air, SkyTeam, BRT...). */
  representative?: {
    id?: string | null;
    name?: string | null;
    legal_name?: string | null;
    cnpj?: string | null;
  } | null;
  totals?: Record<string, number | null> | null;
  passengers?: MondePassenger[] | null;
  segments?: MondeSegment[] | null;
}

export interface MondeSale {
  /** Formato novo da API (a partir de 14/08/2026). */
  id?: string;
  /** Formato anterior. Mantido para ler o que já está em monde_sales_raw. */
  sale_id?: string;
  sale_number: number;
  sale_date: string;
  registered_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  status: SaleStatus;
  /** Antes `company_identifier`. */
  company?: { identifier?: string | null; name?: string | null } | string | null;
  company_identifier?: string | null;
  /** Antes `travel_agent`. É o vendedor. */
  seller?: { id?: string | null; name?: string | null } | null;
  travel_agent?: { id?: string | null; name?: string | null } | null;
  registered_by?: { id?: string | null; name?: string | null } | null;
  payer?: MondePerson | null;
  totals?: Record<string, number | null> | null;
  airline_tickets?: MondeTicket[] | null;
  /** Lista no formato antigo; objeto único no novo. */
  payments?:
    | Record<string, Record<string, unknown>>[]
    | Record<string, Record<string, unknown>>
    | null;
}

/* --------------------------- nomes que mudaram ----------------------------- */

/*
 * Em 14/08/2026 o Monde renomeou campos da venda sem aviso: `sale_id` virou
 * `id`, `travel_agent` virou `seller`, `company_identifier` virou `company` e
 * `totals.final_value` virou `totals.final_amount`. As funções abaixo aceitam
 * as duas formas — não por indecisão, mas porque `monde_sales_raw` guarda
 * anos de payload no formato antigo, e reprocessá-lo precisa continuar
 * funcionando. Se eles voltarem atrás, também continua.
 */

/** O identificador da venda, no formato que vier. */
export function saleId(sale: MondeSale): string | null {
  const v = sale.id ?? sale.sale_id;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Nome do vendedor.
 *
 * No formato antigo vinha embutido. No novo vem só `{id}`, e o nome é
 * resolvido contra `monde_sellers` — por isso o `nomes` opcional.
 */
export function sellerName(sale: MondeSale, nomes?: Map<string, string>): string | null {
  const embutido = nullish(sale.seller?.name) ?? nullish(sale.travel_agent?.name);
  if (embutido) return embutido;
  const id = sale.seller?.id ?? sale.travel_agent?.id;
  return id ? (nomes?.get(id) ?? null) : null;
}

/** Ids de pessoas/empresas citados pela venda, para resolver de uma vez só. */
export function referencias(sale: MondeSale): string[] {
  const ids: string[] = [];
  const add = (v?: { id?: string | null } | null) => {
    if (v?.id) ids.push(v.id);
  };
  add(sale.seller);
  add(sale.travel_agent as { id?: string | null } | null);
  add(sale.payer as unknown as { id?: string | null } | null);
  add(sale.registered_by as { id?: string | null } | null);
  for (const t of sale.airline_tickets ?? []) {
    add(t.supplier as { id?: string | null } | null);
    add(t.representative as { id?: string | null } | null);
    for (const p of t.passengers ?? []) add(p.person as unknown as { id?: string | null } | null);
  }
  return ids;
}

/** Identificador da empresa (a filial que emitiu). */
export function companyId(sale: MondeSale): string | null {
  if (typeof sale.company === "string") return nullish(sale.company);
  return nullish(sale.company?.identifier) ?? nullish(sale.company_identifier);
}

/** Valor final da venda — é o faturamento. */
export function finalValue(t: Record<string, number | null>): number | null {
  return nullish(t.final_amount) ?? nullish(t.final_value);
}

/* -------------------------------- cliente --------------------------------- */

/**
 * O `Content-Type: application/json` é obrigatório — sem ele a API responde
 * 415, mesmo em GET.
 */
function headers(token: string): HeadersInit {
  return {
    Authorization: token.startsWith("Basic ") ? token : `Basic ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Busca uma página de vendas. */
export async function fetchSalesPage(
  token: string,
  page: number,
  status?: SaleStatus,
): Promise<SalesPage> {
  const url = new URL(`${BASE}/sales`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(PAGE_SIZE));
  if (status) url.searchParams.set("status", status);

  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) {
    throw new Error(`Monde /sales página ${page}: HTTP ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  const p = body.pagination ?? {};
  /* A paginação também mudou: antes vinha `total_pages`/`total`, agora vem
     `has_next_page`. Sem o `??` no fim, o laço pararia na primeira página e a
     carga ficaria silenciosamente incompleta — que é pior que falhar. */
  const temMais =
    typeof p.has_next_page === "boolean"
      ? p.has_next_page
      : typeof p.total_pages === "number"
        ? (p.page ?? page) < p.total_pages
        : (body.data ?? []).length >= PAGE_SIZE;

  return {
    sales: body.data ?? [],
    page: p.page ?? page,
    hasNext: temMais,
    total: p.total ?? 0,
  };
}

/**
 * O detalhe de uma venda.
 *
 * Virou obrigatório em 14/08/2026: a listagem passou a devolver só um resumo
 * de dez campos (sem bilhetes, passageiros nem pagamentos), enquanto antes
 * trazia a venda inteira.
 */
export async function fetchSaleDetail(token: string, id: string): Promise<MondeSale | null> {
  /* A API castiga rajada: responde 429 e, por um tempo, atende devagar. Recuar
     e tentar de novo sai mais barato que derrubar a carga inteira — medido,
     uma venda leva ~0,25s em ritmo normal. */
  for (let tentativa = 0; ; tentativa++) {
    const res = await fetch(`${BASE}/sales/${id}`, { headers: headers(token) });
    if (res.status === 404) return null;

    if (res.status === 429 && tentativa < 4) {
      const espera = Number(res.headers.get("retry-after")) * 1000 || 2000 * 2 ** tentativa;
      await new Promise((r) => setTimeout(r, espera));
      continue;
    }

    if (!res.ok) {
      throw new Error(`Monde /sales/${id}: HTTP ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    return (body.data ?? body) as MondeSale;
  }
}

/**
 * Busca os detalhes em paralelo, em lotes.
 *
 * Uma venda por requisição. Lotes de 4 — medido: acima disso a API começa a
 * responder 429 e a atender devagar por um tempo, o que sai mais caro que
 * esperar. Com 4, cada venda leva ~0,25s.
 */
export async function fetchSaleDetails(
  token: string,
  ids: string[],
  lote = 4,
): Promise<MondeSale[]> {
  const out: MondeSale[] = [];
  for (let i = 0; i < ids.length; i += lote) {
    const fatia = ids.slice(i, i + lote);
    const vindos = await Promise.all(fatia.map((id) => fetchSaleDetail(token, id)));
    for (const v of vindos) if (v) out.push(v);
  }
  return out;
}

/**
 * Busca pessoas por id, uma a uma.
 *
 * Só para os poucos que ainda não estão no catálogo — cliente novo aparecendo
 * na primeira venda dele. Mesmo lote de 4 e mesmo recuo em 429 das vendas.
 */
export async function fetchPeople(
  token: string,
  ids: string[],
  lote = 4,
): Promise<Map<string, Record<string, unknown>>> {
  const out = new Map<string, Record<string, unknown>>();

  for (let i = 0; i < ids.length; i += lote) {
    const fatia = ids.slice(i, i + lote);
    const vindos = await Promise.all(
      fatia.map(async (id) => {
        for (let tentativa = 0; ; tentativa++) {
          const res = await fetch(`${BASE}/people/${id}`, { headers: headers(token) });
          if (res.status === 404) return null;
          if (res.status === 429 && tentativa < 4) {
            await new Promise((r) => setTimeout(r, 2000 * 2 ** tentativa));
            continue;
          }
          if (!res.ok) return null;
          const body = await res.json();
          return { id, pessoa: (body.data ?? body) as Record<string, unknown> };
        }
      }),
    );
    for (const v of vindos) if (v) out.set(v.id, v.pessoa);
  }

  return out;
}

/**
 * Percorre todas as páginas de um recurso simples (pessoas, vendedores,
 * contas) e devolve a lista inteira. Só para recursos de volume conhecido —
 * as vendas usam `fetchSalesPage`, que precisa parar no meio.
 */
export async function fetchList<T>(
  token: string,
  resource: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  let temMais = true;
  // Trava contra laço infinito: se a API passar a mentir no `has_next_page`,
  // é melhor parar em 500 páginas do que rodar para sempre.
  const MAX_PAGINAS = 500;

  while (temMais && page <= MAX_PAGINAS) {
    const url = new URL(`${BASE}/${resource}`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(PAGE_SIZE));
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url, { headers: headers(token) });
    if (!res.ok) {
      throw new Error(`Monde /${resource} página ${page}: HTTP ${res.status}`);
    }
    const body = await res.json();
    const lote = body.data ?? [];
    out.push(...lote);

    const p = body.pagination ?? {};
    temMais =
      typeof p.has_next_page === "boolean"
        ? p.has_next_page
        : typeof p.total_pages === "number"
          ? page < p.total_pages
          : lote.length >= PAGE_SIZE;
    page++;
  }

  return out;
}

/* ------------------------------- utilidades ------------------------------- */

/** Só dígitos — é assim que o telefone casa com o WhatsApp. */
export function digits(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const d = v.replace(/\D/g, "");
  return d.length ? d : null;
}

function nullish<T>(v: T | null | undefined): T | null {
  return v === undefined ? null : v;
}

/** Data ISO simples; a API às vezes manda string vazia no lugar de null. */
function date(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.slice(0, 10) : null;
}

function timestamp(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ------------------------------ mapeamentos ------------------------------- */

export interface CustomerRow {
  identity_hash: string;
  name: string;
  person_kind: string | null;
  email: string | null;
  mobile_number: string | null;
  phone_number: string | null;
  birthdate: string | null;
  city_name: string | null;
  state_code: string | null;
}

/**
 * Identidade estável de uma pessoa **sem guardar o documento**: hash do
 * CPF/CNPJ quando existir; sem ele, de nome + nascimento + telefone.
 *
 * A mesma conta vale para quem vem da venda e para quem vem de /people — é o
 * que permite juntar `monde_customers` com `monde_people`.
 */
export async function identityHash(
  name: string,
  document?: string | null,
  birthdate?: string | null,
  mobile?: string | null,
): Promise<string> {
  const doc = digits(document);
  if (doc) return sha256(`doc:${doc}`);
  return sha256(`pes:${name.toLowerCase()}|${birthdate ?? ""}|${digits(mobile) ?? ""}`);
}

/**
 * Converte uma pessoa da API no nosso cliente. Documentos não são gravados:
 * o CPF/CNPJ só serve para gerar a identidade estável.
 */
export async function toCustomer(p: MondePerson | null | undefined): Promise<CustomerRow | null> {
  if (!p) return null;
  const name = (p.name ?? p.legal_name ?? "").trim();
  if (!name) return null;

  const mobile = digits(p.mobile_number);
  const identity_hash = await identityHash(
    name,
    p.cpf_cnpj ?? p.cpf,
    p.birthdate,
    p.mobile_number,
  );

  return {
    identity_hash,
    name,
    person_kind: nullish(p.person_kind),
    email: p.email?.trim().toLowerCase() || null,
    mobile_number: mobile,
    phone_number: digits(p.phone_number),
    birthdate: date(p.birthdate),
    city_name: nullish(p.address?.city_name),
    state_code: nullish(p.address?.state_code),
  };
}

export function toSaleRow(
  sale: MondeSale,
  customerId: string | null,
  nomes?: Map<string, string>,
) {
  const t = sale.totals ?? {};
  return {
    sale_id: saleId(sale)!,
    sale_number: sale.sale_number,
    sale_date: date(sale.sale_date)!,
    registered_at: timestamp(sale.registered_at),
    period_start: date(sale.period_start),
    period_end: date(sale.period_end),
    status: sale.status,
    company_identifier: companyId(sale),
    travel_agent_name: sellerName(sale, nomes),
    registered_by_name: nullish(sale.registered_by?.name),
    customer_id: customerId,
    total_final_value: finalValue(t),
    total_products: nullish(t.products),
    total_fees: nullish(t.fees),
    total_discount: nullish(t.discount),
    total_revenue: nullish(t.revenue),
    total_payments: nullish(t.payments),
    total_balance: nullish(t.balance),
    synced_at: new Date().toISOString(),
  };
}

/**
 * Cabeçalho da venda a partir do RESUMO da listagem.
 *
 * O resumo traz `totals` — faturamento e margem —, que é o que alimenta quase
 * toda tela. Por isso o valor entra sem custo de uma requisição por venda; o
 * detalhe fica reservado para os filhos (bilhetes, trechos, passageiros).
 */
export function toSaleHeaderRow(sale: MondeSale) {
  const t = sale.totals ?? {};
  return {
    sale_id: saleId(sale)!,
    sale_number: sale.sale_number,
    sale_date: date(sale.sale_date)!,
    registered_at: timestamp(sale.registered_at),
    period_start: date(sale.period_start),
    period_end: date(sale.period_end),
    status: sale.status,
    total_final_value: finalValue(t),
    total_products: nullish(t.products),
    total_fees: nullish(t.fees),
    total_discount: nullish(t.discount),
    total_revenue: nullish(t.revenue),
    total_balance: nullish(t.balance),
    synced_at: new Date().toISOString(),
  };
}

export function toTicketRow(
  sale_id: string,
  ticket: MondeTicket,
  index: number,
  nomes?: Map<string, string>,
) {
  const t = ticket.totals ?? {};
  // Companhia e consolidadora também deixaram de vir embutidas.
  const nome = (r?: { id?: string | null; name?: string | null; legal_name?: string | null } | null) =>
    nullish(r?.name) ?? nullish(r?.legal_name) ?? (r?.id ? (nomes?.get(r.id) ?? null) : null);
  return {
    sale_id,
    ticket_index: index,
    locator: nullish(ticket.locator),
    issue_date: date(ticket.issue_date),
    status: nullish(ticket.status),
    canceled_at: timestamp(ticket.canceled_at),
    destination_scope: nullish(ticket.destination),
    // `supplier` é a companhia; `representative` é a consolidadora.
    airline_name: nome(ticket.supplier),
    airline_cnpj: nullish(ticket.supplier?.cnpj),
    airline_code: nullish(ticket.supplier?.airline_code),
    consolidator_name: nome(ticket.representative),
    consolidator_cnpj: nullish(ticket.representative?.cnpj),
    currency: nullish(ticket.currency),
    exchange_rate: nullish(ticket.exchange_rate),
    commission_amount: nullish(ticket.commission_amount),
    commission_percentage: nullish(ticket.commission_percentage),
    over_amount: nullish(ticket.over_amount),
    total_amount: nullish(t.amount),
    total_customer_amount: nullish(t.customer_amount),
    total_fees: nullish(t.fees),
    rav_fee: nullish(t.rav_fee),
    du_fee: nullish(t.du_fee),
  };
}

export function toSegmentRows(ticket_id: string, ticket: MondeTicket) {
  return (ticket.segments ?? []).map((g, i) => ({
    ticket_id,
    seq: i + 1,
    origin: nullish(g.origin),
    destination: nullish(g.destination),
    airline_code: nullish(g.airline_code),
    flight_number: nullish(g.flight_number),
    // A API manda a letra do RBD com espaço à direita ("R ").
    fare_class: g.class?.trim() || null,
    cabin: null as string | null,
    departure_at: timestamp(g.departure_date),
    arrival_at: timestamp(g.arrival_date),
  }));
}

export function toPassengerRow(
  ticket_id: string,
  p: MondePassenger,
  index: number,
  customerId: string | null,
) {
  return {
    ticket_id,
    seq: index + 1,
    customer_id: customerId,
    emission_name: nullish(p.emission_name),
    ticket_number: nullish(p.ticket_number),
    amount: nullish(p.amount),
    boarding_fee: nullish(p.boarding_fee),
    rav_fee: nullish(p.rav_fee),
    total_amount: nullish(p.total_amount),
  };
}

/**
 * Achata `payments[]`. Cada item pode trazer `vendor` e/ou `agency`, e dentro
 * de cada lado uma chave por forma de pagamento (`credit_card`,
 * `bank_deposit`, ...). O formato varia por forma, então o valor é procurado
 * em `amount` ou somado a partir de `products[].payment_amount`.
 */
export function toPaymentRows(sale_id: string, sale: MondeSale) {
  const rows: Record<string, unknown>[] = [];

  /* Em 14/08/2026 `payments` deixou de ser uma lista de blocos e passou a ser
     um objeto único com `vendor`/`agency` no topo — e, dentro de cada forma de
     pagamento, o que era um objeto virou uma lista. As duas normalizações
     abaixo aceitam os dois formatos: `monde_sales_raw` guarda anos do antigo,
     e reprocessá-lo precisa continuar funcionando. */
  const blocos = Array.isArray(sale.payments)
    ? sale.payments
    : sale.payments
      ? [sale.payments as Record<string, Record<string, unknown>>]
      : [];

  for (const entry of blocos) {
    for (const side of ["vendor", "agency"]) {
      const block = entry?.[side] as Record<string, unknown> | undefined;
      if (!block) continue;

      for (const [method, bruto] of Object.entries(block)) {
        const itens = Array.isArray(bruto) ? bruto : [bruto];

        for (const detail of itens) {
        if (!detail || typeof detail !== "object") continue;
        const d = detail as Record<string, unknown>;

        const products = Array.isArray(d.products) ? d.products : [];
        const fromProducts = products.reduce(
          (sum: number, p: Record<string, unknown>) => sum + (Number(p?.payment_amount) || 0),
          0,
        );

        rows.push({
          sale_id,
          side,
          method,
          installments: typeof d.installments === "number" ? d.installments : null,
          card_last_digits: typeof d.card_last_digits === "string" ? d.card_last_digits : null,
          authorization_code: typeof d.authorization === "string" ? d.authorization : null,
          due_date: date(d.due_date),
          settlement_date: date(d.settlement_date),
          amount: typeof d.amount === "number" ? d.amount : fromProducts || null,
        });
        }
      }
    }
  }
  return rows;
}
