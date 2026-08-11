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
  totalPages: number;
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
    name?: string | null;
    cnpj?: string | null;
    airline_code?: string | null;
  } | null;
  /** A CONSOLIDADORA (Tp Air, SkyTeam, BRT...). */
  representative?: {
    name?: string | null;
    legal_name?: string | null;
    cnpj?: string | null;
  } | null;
  totals?: Record<string, number | null> | null;
  passengers?: MondePassenger[] | null;
  segments?: MondeSegment[] | null;
}

export interface MondeSale {
  sale_id: string;
  sale_number: number;
  sale_date: string;
  registered_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  status: SaleStatus;
  company_identifier?: string | null;
  travel_agent?: { name?: string | null } | null;
  registered_by?: { name?: string | null } | null;
  payer?: MondePerson | null;
  totals?: Record<string, number | null> | null;
  airline_tickets?: MondeTicket[] | null;
  payments?: Record<string, Record<string, unknown>>[] | null;
}

/* -------------------------------- cliente --------------------------------- */

/**
 * Busca uma página de vendas. O `Content-Type: application/json` é
 * obrigatório — sem ele a API responde 415, mesmo em GET.
 */
export async function fetchSalesPage(
  token: string,
  page: number,
  status?: SaleStatus,
): Promise<SalesPage> {
  const url = new URL(`${BASE}/sales`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(PAGE_SIZE));
  if (status) url.searchParams.set("status", status);

  const res = await fetch(url, {
    headers: {
      Authorization: token.startsWith("Basic ") ? token : `Basic ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Monde /sales página ${page}: HTTP ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  return {
    sales: body.data ?? [],
    page: body.pagination?.page ?? page,
    totalPages: body.pagination?.total_pages ?? 1,
    total: body.pagination?.total ?? 0,
  };
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
 * Converte uma pessoa da API no nosso cliente. Documentos não são gravados:
 * o CPF/CNPJ só serve para gerar a identidade estável (hash). Sem documento,
 * a identidade cai para nome + nascimento + telefone.
 */
export async function toCustomer(p: MondePerson | null | undefined): Promise<CustomerRow | null> {
  if (!p) return null;
  const name = (p.name ?? p.legal_name ?? "").trim();
  if (!name) return null;

  const doc = digits(p.cpf_cnpj ?? p.cpf);
  const mobile = digits(p.mobile_number);
  const identity_hash = doc
    ? await sha256(`doc:${doc}`)
    : await sha256(`pes:${name.toLowerCase()}|${p.birthdate ?? ""}|${mobile ?? ""}`);

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

export function toSaleRow(sale: MondeSale, customerId: string | null) {
  const t = sale.totals ?? {};
  return {
    sale_id: sale.sale_id,
    sale_number: sale.sale_number,
    sale_date: date(sale.sale_date)!,
    registered_at: timestamp(sale.registered_at),
    period_start: date(sale.period_start),
    period_end: date(sale.period_end),
    status: sale.status,
    company_identifier: nullish(sale.company_identifier),
    travel_agent_name: nullish(sale.travel_agent?.name),
    registered_by_name: nullish(sale.registered_by?.name),
    customer_id: customerId,
    total_final_value: nullish(t.final_value),
    total_products: nullish(t.products),
    total_fees: nullish(t.fees),
    total_discount: nullish(t.discount),
    total_revenue: nullish(t.revenue),
    total_payments: nullish(t.payments),
    total_balance: nullish(t.balance),
    synced_at: new Date().toISOString(),
  };
}

export function toTicketRow(sale_id: string, ticket: MondeTicket, index: number) {
  const t = ticket.totals ?? {};
  return {
    sale_id,
    ticket_index: index,
    locator: nullish(ticket.locator),
    issue_date: date(ticket.issue_date),
    status: nullish(ticket.status),
    canceled_at: timestamp(ticket.canceled_at),
    destination_scope: nullish(ticket.destination),
    // `supplier` é a companhia; `representative` é a consolidadora.
    airline_name: nullish(ticket.supplier?.name),
    airline_cnpj: nullish(ticket.supplier?.cnpj),
    airline_code: nullish(ticket.supplier?.airline_code),
    consolidator_name: ticket.representative?.name ?? ticket.representative?.legal_name ?? null,
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

  for (const entry of sale.payments ?? []) {
    for (const side of ["vendor", "agency"]) {
      const block = entry?.[side] as Record<string, Record<string, unknown>> | undefined;
      if (!block) continue;

      for (const [method, detail] of Object.entries(block)) {
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
  return rows;
}
