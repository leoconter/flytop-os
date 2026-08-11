/**
 * Produtos terrestres da venda: hotel, carro, seguro, pacote e "outros".
 *
 * Todos compartilham o mesmo núcleo na API (fornecedor, totais, comissão,
 * status) e mudam só nos detalhes — daí uma tabela só, com o que é
 * específico de cada tipo indo para `details`.
 */
import type { Db } from "./persist.ts";

/** Chave da API → nome do tipo no nosso banco. */
export const LAND_TYPES: Record<string, string> = {
  hotels: "hotel",
  car_rentals: "car_rental",
  insurances: "insurance",
  travel_packages: "package",
  ground_transportations: "transfer",
  cruises: "cruise",
  excursions: "excursion",
  train_tickets: "train",
  cvc_packages: "package",
  others: "other",
};

const date = (v: unknown) => (typeof v === "string" && v.trim() ? v.slice(0, 10) : null);
const ts = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown) => (typeof v === "number" ? v : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

/** Primeiro valor não vazio entre várias chaves possíveis. */
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  return null;
}

/** Campos que já viram coluna — o resto vai para `details`. */
const MAPPED = new Set([
  "status", "canceled_at", "issue_date", "currency", "totals", "supplier",
  "representative", "commission_amount", "passengers",
  "check_in", "check_out", "nights", "booking_number",
  "pickup_date", "dropoff_date", "rental_days", "pickup_location",
  "begin_date", "end_date", "voucher_code",
  "package_name", "product_name", "quantity", "document",
  "destination", "vehicle_category", "room_category",
]);

export interface LandRow {
  sale_id: string;
  product_type: string;
  item_index: number;
  [k: string]: unknown;
}

/** Converte os arrays de produto de uma venda em linhas da tabela. */
export function toLandRows(saleId: string, payload: Record<string, unknown>): LandRow[] {
  const rows: LandRow[] = [];

  for (const [apiKey, type] of Object.entries(LAND_TYPES)) {
    const items = payload[apiKey];
    if (!Array.isArray(items) || !items.length) continue;

    items.forEach((raw, index) => {
      const it = raw as Record<string, unknown>;
      const totals = (it.totals ?? {}) as Record<string, number | null>;
      const supplier = (it.supplier ?? {}) as Record<string, unknown>;
      const rep = (it.representative ?? {}) as Record<string, unknown>;

      const details: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(it)) {
        if (!MAPPED.has(k) && v !== null && v !== "" && v !== 0) details[k] = v;
      }

      rows.push({
        sale_id: saleId,
        product_type: type,
        item_index: index,
        title:
          str(pick(it, ["package_name", "product_name", "room_category", "vehicle_category"])) ??
          str(supplier.name),
        supplier_name: str(supplier.name) ?? str(supplier.legal_name),
        supplier_cnpj: str(supplier.cnpj),
        consolidator_name: str(rep.name) ?? str(rep.legal_name),
        booking_ref: str(pick(it, ["booking_number", "voucher_code", "document"])),
        location: str(pick(it, ["pickup_location", "destination"])),
        start_date: date(pick(it, ["check_in", "pickup_date", "begin_date", "departure_date"])),
        end_date: date(pick(it, ["check_out", "dropoff_date", "end_date", "arrival_date"])),
        units: (num(pick(it, ["nights", "rental_days", "quantity"])) ?? null) as number | null,
        status: str(it.status),
        canceled_at: ts(it.canceled_at),
        issue_date: date(it.issue_date),
        currency: str(it.currency),
        amount: num(totals.amount),
        customer_amount: num(totals.customer_amount),
        fees: num(totals.fees),
        discount: num(totals.discount),
        commission_amount: num(it.commission_amount),
        details: Object.keys(details).length ? details : null,
      });
    });
  }

  return rows;
}

/** Regrava os terrestres de um conjunto de vendas. */
export async function persistLandItems(
  db: Db,
  sales: { sale_id: string; payload: Record<string, unknown> }[],
): Promise<number> {
  if (!sales.length) return 0;

  const saleIds = sales.map((s) => s.sale_id);
  const { error: delErr } = await db
    .from("monde_sale_land_items")
    .delete()
    .in("sale_id", saleIds);
  if (delErr) throw new Error(`limpeza de terrestres: ${delErr.message}`);

  const rows = sales.flatMap((s) => toLandRows(s.sale_id, s.payload));
  if (!rows.length) return 0;

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("monde_sale_land_items").insert(rows.slice(i, i + 500));
    if (error) throw new Error(`terrestres: ${error.message}`);
  }
  return rows.length;
}
