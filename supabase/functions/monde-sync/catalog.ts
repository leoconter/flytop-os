/**
 * Cadastros do Monde que existem fora da venda: pessoas, vendedores e o
 * financeiro. São listas paginadas simples — buscar e gravar, sem a árvore
 * que a venda tem.
 */
import { digits, fetchList, identityHash } from "./monde.ts";
import type { Db } from "./persist.ts";

/** Grava em blocos: o PostgREST engasga com payloads muito grandes. */
const CHUNK = 500;

async function upsertAll(
  db: Db,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<number> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db
      .from(table)
      .upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  return rows.length;
}

const date = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.slice(0, 10) : null;
const ts = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

/* --------------------------------- pessoas -------------------------------- */

interface MondePerson {
  id: string;
  code?: number | null;
  person_kind?: string | null;
  name?: string | null;
  legal_name?: string | null;
  email?: string | null;
  mobile_number?: string | null;
  phone_number?: string | null;
  business_phone?: string | null;
  birthdate?: string | null;
  cpf_cnpj?: string | null;
  address?: { city_name?: string | null; state_code?: string | null } | null;
  seller?: { name?: string | null } | null;
  first_sale_date?: string | null;
  last_sale_date?: string | null;
  last_departure_date?: string | null;
  last_return_date?: string | null;
  registered_at?: string | null;
}

export async function syncPeople(db: Db, token: string): Promise<number> {
  const people = await fetchList<MondePerson>(token, "people");
  const rows = [];

  for (const p of people) {
    const name = (p.name ?? p.legal_name ?? "").trim();
    if (!name) continue;
    rows.push({
      person_id: p.id,
      // Mesmo cálculo de monde_customers, para as duas tabelas se juntarem.
      identity_hash: await identityHash(name, p.cpf_cnpj, p.birthdate, p.mobile_number),
      code: p.code ?? null,
      person_kind: p.person_kind ?? null,
      name,
      email: p.email?.trim().toLowerCase() || null,
      mobile_number: digits(p.mobile_number),
      phone_number: digits(p.phone_number),
      business_phone: digits(p.business_phone),
      birthdate: date(p.birthdate),
      city_name: p.address?.city_name ?? null,
      state_code: p.address?.state_code ?? null,
      seller_name: p.seller?.name ?? null,
      first_sale_date: date(p.first_sale_date),
      last_sale_date: date(p.last_sale_date),
      last_departure_date: date(p.last_departure_date),
      last_return_date: date(p.last_return_date),
      registered_at: ts(p.registered_at),
      synced_at: new Date().toISOString(),
    });
  }
  return upsertAll(db, "monde_people", rows, "person_id");
}

/* ------------------------------- vendedores ------------------------------- */

interface MondeSeller {
  id: string;
  name?: string | null;
  active?: boolean | null;
  registered_at?: string | null;
}

export async function syncSellers(db: Db, token: string): Promise<number> {
  const sellers = await fetchList<MondeSeller>(token, "sellers");
  const rows = sellers
    .filter((s) => s.name)
    .map((s) => ({
      seller_id: s.id,
      name: s.name!.trim(),
      active: s.active ?? null,
      registered_at: ts(s.registered_at),
      synced_at: new Date().toISOString(),
    }));
  // `team` e `monthly_goal` são da FlyTop: o upsert não pode sobrescrevê-los.
  return upsertAll(db, "monde_sellers", rows, "seller_id");
}

/* -------------------------------- financeiro ------------------------------ */

interface MondeBill {
  id: string;
  number?: string | null;
  transaction_kind?: string | null;
  kind?: string | null;
  description?: string | null;
  document?: string | null;
  invoice_number?: string | null;
  amount?: number | null;
  final_amount?: number | null;
  issue_date?: string | null;
  due_date?: string | null;
  settlement_date?: string | null;
  canceled?: boolean | null;
  checked?: boolean | null;
  system_generated?: boolean | null;
  periodicity?: string | null;
  recurrence_kind?: string | null;
  registered_at?: string | null;
}

export async function syncBills(db: Db, token: string): Promise<number> {
  const bills = await fetchList<MondeBill>(token, "bills");
  const rows = bills.map((b) => ({
    bill_id: b.id,
    number: b.number ?? null,
    transaction_kind: b.transaction_kind ?? null,
    kind: b.kind ?? null,
    description: b.description ?? null,
    document: b.document ?? null,
    invoice_number: b.invoice_number ?? null,
    amount: b.amount ?? null,
    final_amount: b.final_amount ?? null,
    issue_date: date(b.issue_date),
    due_date: date(b.due_date),
    settlement_date: date(b.settlement_date),
    canceled: b.canceled ?? null,
    checked: b.checked ?? null,
    system_generated: b.system_generated ?? null,
    periodicity: b.periodicity ?? null,
    recurrence_kind: b.recurrence_kind ?? null,
    registered_at: ts(b.registered_at),
    synced_at: new Date().toISOString(),
  }));
  return upsertAll(db, "monde_bills", rows, "bill_id");
}
