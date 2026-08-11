/**
 * Produtos terrestres (hotel, carro, seguro, pacote, outros) lidos do banco.
 *
 * Eram o ponto cego da plataforma: vendas só de terrestre apareciam sem
 * origem, destino nem companhia, porque só o aéreo estava modelado.
 */
import type { SocialRange } from "@/lib/meta/instagram";
import { db } from "@/lib/supabase";

export const TYPE_LABEL: Record<string, string> = {
  hotel: "Hospedagem",
  car_rental: "Aluguel de carro",
  insurance: "Seguro viagem",
  package: "Pacote",
  transfer: "Transporte terrestre",
  cruise: "Cruzeiro",
  excursion: "Excursão",
  train: "Trem",
  other: "Outros serviços",
};

export interface LandTotals {
  items: number;
  salesCount: number;
  revenue: number;
  commission: number;
}

export interface LandTypeRow extends LandTotals {
  productType: string;
  label: string;
  units: number | null;
}

export interface LandItemRow {
  id: string;
  saleDate: string;
  saleNumber: number;
  productType: string;
  label: string;
  title: string | null;
  supplierName: string | null;
  bookingRef: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  units: number | null;
  value: number;
  commission: number;
  customer: string | null;
  seller: string | null;
}

/** Agregado por tipo de produto no período. */
export async function getLandByType(
  range: SocialRange,
): Promise<{ types: LandTypeRow[]; totals: LandTotals } | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("v_land_flat")
    .select("product_type, sale_id, valor, comissao, units, sale_status, item_status")
    .gte("sale_date", range.since)
    .lte("sale_date", range.until)
    .neq("sale_status", "canceled");

  if (error || !data?.length) {
    if (error) console.error("[monde/land] por tipo:", error.message);
    return null;
  }

  const agg = new Map<string, { items: number; revenue: number; commission: number; units: number; sales: Set<string> }>();
  for (const r of data) {
    if (r.item_status === "canceled") continue;
    const key = r.product_type as string;
    const cur = agg.get(key) ?? { items: 0, revenue: 0, commission: 0, units: 0, sales: new Set<string>() };
    cur.items += 1;
    cur.revenue += Number(r.valor ?? 0);
    cur.commission += Number(r.comissao ?? 0);
    cur.units += Number(r.units ?? 0);
    cur.sales.add(r.sale_id as string);
    agg.set(key, cur);
  }

  const types: LandTypeRow[] = [...agg.entries()]
    .map(([productType, v]) => ({
      productType,
      label: TYPE_LABEL[productType] ?? productType,
      items: v.items,
      salesCount: v.sales.size,
      revenue: v.revenue,
      commission: v.commission,
      units: v.units || null,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const allSales = new Set(data.map((r) => r.sale_id as string));
  return {
    types,
    totals: {
      items: types.reduce((s, t) => s + t.items, 0),
      salesCount: allSales.size,
      revenue: types.reduce((s, t) => s + t.revenue, 0),
      commission: types.reduce((s, t) => s + t.commission, 0),
    },
  };
}

/** Fornecedores terrestres do período, por receita. */
export async function getLandSuppliers(range: SocialRange, limit = 8) {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("v_land_flat")
    .select("supplier_name, product_type, valor, sale_status, item_status")
    .gte("sale_date", range.since)
    .lte("sale_date", range.until)
    .neq("sale_status", "canceled");

  if (error || !data?.length) return null;

  const agg = new Map<string, { revenue: number; items: number; types: Set<string> }>();
  for (const r of data) {
    if (r.item_status === "canceled" || !r.supplier_name) continue;
    const key = r.supplier_name as string;
    const cur = agg.get(key) ?? { revenue: 0, items: 0, types: new Set<string>() };
    cur.revenue += Number(r.valor ?? 0);
    cur.items += 1;
    cur.types.add(r.product_type as string);
    agg.set(key, cur);
  }

  const total = [...agg.values()].reduce((s, v) => s + v.revenue, 0);
  return [...agg.entries()]
    .map(([name, v]) => ({
      name,
      revenue: v.revenue,
      items: v.items,
      types: [...v.types].map((t) => TYPE_LABEL[t] ?? t),
      share: total > 0 ? (v.revenue / total) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/** Itens terrestres do período, do mais recente para o mais antigo. */
export async function getLandItems(
  range: SocialRange,
  limit = 40,
): Promise<LandItemRow[] | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("v_land_flat")
    .select(
      "id, sale_date, sale_number, product_type, title, supplier_name, booking_ref, location, start_date, end_date, units, valor, comissao, cliente, vendedor, sale_status, item_status",
    )
    .gte("sale_date", range.since)
    .lte("sale_date", range.until)
    .neq("sale_status", "canceled")
    .order("sale_date", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return null;

  return data
    .filter((r) => r.item_status !== "canceled")
    .map((r) => ({
      id: r.id as string,
      saleDate: r.sale_date as string,
      saleNumber: Number(r.sale_number),
      productType: r.product_type as string,
      label: TYPE_LABEL[r.product_type as string] ?? (r.product_type as string),
      title: r.title as string | null,
      supplierName: r.supplier_name as string | null,
      bookingRef: r.booking_ref as string | null,
      location: r.location as string | null,
      startDate: r.start_date as string | null,
      endDate: r.end_date as string | null,
      units: r.units as number | null,
      value: Number(r.valor ?? 0),
      commission: Number(r.comissao ?? 0),
      customer: r.cliente as string | null,
      seller: r.vendedor as string | null,
    }));
}
