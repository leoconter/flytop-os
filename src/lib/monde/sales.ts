/**
 * Leitura das vendas do Monde já espelhadas no Supabase.
 *
 * As telas nunca chamam o ERP: leem daqui. O intervalo vem do seletor de
 * período do cabeçalho (`resolveRange()` de `src/lib/date-range.ts`).
 *
 * Todas as funções retornam null quando o banco não está configurado ou
 * quando não há venda no período — a tela cai nos dados ilustrativos.
 */
import type { SocialRange } from "@/lib/meta/instagram";
import { db } from "@/lib/supabase";

/** Feriados nacionais fixos, para o cálculo de dias úteis. */
const FIXED_HOLIDAYS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25"];

export interface SalesTotals {
  salesCount: number;
  revenue: number;
  margin: number;
  avgTicket: number;
  marginPct: number;
  /** Faturamento por dia do período, para o acumulado. */
  daily: { date: string; revenue: number; count: number }[];
  businessDays: number;
  perBusinessDay: number;
}

export interface RankedItem {
  name: string;
  salesCount: number;
  revenue: number;
  share: number;
}

/* -------------------------------- helpers --------------------------------- */

function businessDaysIn(since: string, until: string): number {
  let count = 0;
  const d = new Date(`${since}T12:00:00Z`);
  const end = new Date(`${until}T12:00:00Z`);
  while (d <= end) {
    const dow = d.getUTCDay();
    const md = d.toISOString().slice(5, 10);
    if (dow !== 0 && dow !== 6 && !FIXED_HOLIDAYS.includes(md)) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

function rank(
  rows: { name: string | null; revenue: number; count: number }[],
  limit: number,
): RankedItem[] {
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  return rows
    .filter((r) => r.name)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((r) => ({
      name: r.name!,
      salesCount: r.count,
      revenue: r.revenue,
      share: total > 0 ? (r.revenue / total) * 100 : 0,
    }));
}

/* ------------------------------- consultas -------------------------------- */

/** Totais do período: faturamento, margem, ticket e a série diária. */
export async function getSalesTotals(range: SocialRange): Promise<SalesTotals | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("v_sales_daily")
    .select("sale_date, sales_count, revenue, margin")
    .gte("sale_date", range.since)
    .lte("sale_date", range.until)
    .order("sale_date");

  if (error) {
    console.error("[monde/sales] totais:", error.message);
    return null;
  }
  if (!data?.length) return null;

  const salesCount = data.reduce((s, r) => s + Number(r.sales_count), 0);
  const revenue = data.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
  const margin = data.reduce((s, r) => s + Number(r.margin ?? 0), 0);
  const businessDays = businessDaysIn(range.since, range.until);

  return {
    salesCount,
    revenue,
    margin,
    avgTicket: salesCount > 0 ? revenue / salesCount : 0,
    marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
    daily: data.map((r) => ({
      date: r.sale_date as string,
      revenue: Number(r.revenue ?? 0),
      count: Number(r.sales_count),
    })),
    businessDays,
    perBusinessDay: businessDays > 0 ? salesCount / businessDays : 0,
  };
}

/** Consolidadoras do período, ordenadas por receita. */
export async function getConsolidators(
  range: SocialRange,
  limit = 8,
): Promise<RankedItem[] | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("monde_sale_tickets")
    .select("consolidator_name, total_customer_amount, monde_sales!inner(sale_date, status)")
    .gte("monde_sales.sale_date", range.since)
    .lte("monde_sales.sale_date", range.until)
    .neq("monde_sales.status", "canceled");

  if (error || !data?.length) {
    if (error) console.error("[monde/sales] consolidadoras:", error.message);
    return null;
  }

  const agg = new Map<string, { revenue: number; count: number }>();
  for (const r of data as unknown as { consolidator_name: string | null; total_customer_amount: number | null }[]) {
    const key = r.consolidator_name ?? "";
    const cur = agg.get(key) ?? { revenue: 0, count: 0 };
    cur.revenue += Number(r.total_customer_amount ?? 0);
    cur.count += 1;
    agg.set(key, cur);
  }

  return rank(
    [...agg.entries()].map(([name, v]) => ({ name, ...v })),
    limit,
  );
}

/** Companhias e rotas do período, a partir dos trechos. */
export async function getAirlinesAndRoutes(
  range: SocialRange,
  limit = 7,
): Promise<{ airlines: RankedItem[]; routes: RankedItem[]; cabins: RankedItem[] } | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("monde_sale_tickets")
    .select(
      "airline_name, total_customer_amount, monde_sales!inner(sale_date, status), monde_ticket_segments(seq, origin, destination, fare_class, airline_code)",
    )
    .gte("monde_sales.sale_date", range.since)
    .lte("monde_sales.sale_date", range.until)
    .neq("monde_sales.status", "canceled");

  if (error || !data?.length) {
    if (error) console.error("[monde/sales] companhias/rotas:", error.message);
    return null;
  }

  // A mesma letra muda de cabine conforme a companhia: a regra especifica
  // vence a padrao. Ver a tela de Configuracoes.
  const { data: cabinMap } = await sb
    .from("fare_class_map")
    .select("airline_code, fare_class, cabin");
  const cabinOf = new Map<string, string>();
  for (const c of cabinMap ?? []) {
    const key = `${(c.airline_code as string) ?? "*"}|${c.fare_class as string}`;
    cabinOf.set(key, c.cabin as string);
  }
  const resolveCabin = (airline: string | null, fare: string | null) =>
    (fare ? cabinOf.get(`${airline ?? "*"}|${fare}`) ?? cabinOf.get(`*|${fare}`) : null) ?? null;

  const airlines = new Map<string, { revenue: number; count: number }>();
  const routes = new Map<string, { revenue: number; count: number }>();
  const cabins = new Map<string, { revenue: number; count: number }>();

  type Row = {
    airline_name: string | null;
    total_customer_amount: number | null;
    monde_ticket_segments: { seq: number; origin: string | null; destination: string | null; fare_class: string | null; airline_code: string | null }[];
  };

  for (const r of data as unknown as Row[]) {
    const value = Number(r.total_customer_amount ?? 0);

    const a = airlines.get(r.airline_name ?? "") ?? { revenue: 0, count: 0 };
    a.revenue += value;
    a.count += 1;
    airlines.set(r.airline_name ?? "", a);

    const segs = (r.monde_ticket_segments ?? []).slice().sort((x, y) => x.seq - y.seq);
    if (segs.length) {
      // Rota exibida como o itinerário completo: GRU-FCO-GRU.
      const path = [segs[0].origin, ...segs.map((s) => s.destination)]
        .filter(Boolean)
        .join("-");
      const rt = routes.get(path) ?? { revenue: 0, count: 0 };
      rt.revenue += value;
      rt.count += 1;
      routes.set(path, rt);

      const cabin = resolveCabin(segs[0].airline_code, segs[0].fare_class) ?? "Não mapeada";
      const cb = cabins.get(cabin) ?? { revenue: 0, count: 0 };
      cb.revenue += value;
      cb.count += 1;
      cabins.set(cabin, cb);
    }
  }

  const toList = (m: Map<string, { revenue: number; count: number }>, n: number) =>
    rank([...m.entries()].map(([name, v]) => ({ name, ...v })), n);

  return {
    airlines: toList(airlines, limit),
    routes: toList(routes, limit),
    cabins: toList(cabins, 6),
  };
}

/** Desempenho por vendedor no período. */
export async function getSellers(range: SocialRange): Promise<RankedItem[] | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("v_sales_by_seller")
    .select("travel_agent_name, sales_count, revenue")
    .gte("sale_date", range.since)
    .lte("sale_date", range.until);

  if (error || !data?.length) return null;

  const agg = new Map<string, { revenue: number; count: number }>();
  for (const r of data) {
    const key = (r.travel_agent_name as string) ?? "";
    const cur = agg.get(key) ?? { revenue: 0, count: 0 };
    cur.revenue += Number(r.revenue ?? 0);
    cur.count += Number(r.sales_count ?? 0);
    agg.set(key, cur);
  }
  return rank([...agg.entries()].map(([name, v]) => ({ name, ...v })), 20);
}

/** Embarques e retornos nas próximas horas. */
export async function getUpcomingFlights(hours = 48) {
  const sb = db();
  if (!sb) return null;

  const limit = new Date(Date.now() + hours * 3_600_000).toISOString();
  const { data, error } = await sb
    .from("v_upcoming_flights")
    .select("departure_at, origin, destination, airline_code, flight_number, locator, customer_name, customer_mobile")
    .lte("departure_at", limit)
    .order("departure_at")
    .limit(50);

  if (error || !data?.length) return null;
  return data;
}
