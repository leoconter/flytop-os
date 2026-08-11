/**
 * Metas de venda — configuração da plataforma, não do ERP.
 *
 * O Monde não tem esse conceito, então a meta da agência e a de cada vendedor
 * vivem aqui. O Dashboard Geral lê daqui em vez da constante que existia no
 * código.
 */
import { db } from "@/lib/supabase";

export interface AgencyGoal {
  month: string; // "AAAA-MM-01"
  amount: number;
}

export interface SellerGoal {
  sellerId: string;
  name: string;
  active: boolean | null;
  amount: number | null;
  /** Realizado do vendedor no mês. */
  revenue: number;
  salesCount: number;
}

export interface GoalsMonth {
  month: string;
  agencyGoal: number | null;
  revenue: number;
  salesCount: number;
  pct: number | null;
  sellers: SellerGoal[];
  /** Soma das metas individuais — útil para conferir contra a meta da agência. */
  sellersGoalTotal: number;
}

/** Primeiro dia do mês de uma data ISO. */
export function monthKey(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Meta da agência do mês (null se não cadastrada). */
export async function getAgencyGoal(month: string): Promise<number | null> {
  const sb = db();
  if (!sb) return null;

  const { data } = await sb
    .from("sales_goals")
    .select("amount")
    .eq("scope", "agency")
    .eq("month", monthKey(month))
    .maybeSingle();

  return data ? Number(data.amount) : null;
}

/** Panorama do mês: meta da agência, realizado e a linha de cada vendedor. */
export async function getGoalsMonth(month: string): Promise<GoalsMonth | null> {
  const sb = db();
  if (!sb) return null;

  const key = monthKey(month);
  const lastDay = new Date(
    Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);

  const [goalsRes, sellersRes, salesRes] = await Promise.all([
    sb.from("sales_goals").select("scope, seller_id, amount").eq("month", key),
    sb.from("monde_sellers").select("seller_id, name, active").order("name"),
    sb
      .from("v_sales_by_seller")
      .select("travel_agent_name, sales_count, revenue")
      .gte("sale_date", key)
      .lte("sale_date", lastDay),
  ]);

  if (sellersRes.error) {
    console.error("[monde/goals]", sellersRes.error.message);
    return null;
  }

  const goals = goalsRes.data ?? [];
  const agencyGoal = goals.find((g) => g.scope === "agency");
  const goalBySeller = new Map(
    goals.filter((g) => g.scope === "seller").map((g) => [g.seller_id as string, Number(g.amount)]),
  );

  // O ERP grava o vendedor como texto na venda; casamos pelo nome.
  const realized = new Map<string, { revenue: number; count: number }>();
  for (const r of salesRes.data ?? []) {
    const name = (r.travel_agent_name as string) ?? "";
    const cur = realized.get(name) ?? { revenue: 0, count: 0 };
    cur.revenue += Number(r.revenue ?? 0);
    cur.count += Number(r.sales_count ?? 0);
    realized.set(name, cur);
  }

  const sellers: SellerGoal[] = (sellersRes.data ?? []).map((s) => {
    const r = realized.get(s.name as string) ?? { revenue: 0, count: 0 };
    return {
      sellerId: s.seller_id as string,
      name: s.name as string,
      active: s.active as boolean | null,
      amount: goalBySeller.get(s.seller_id as string) ?? null,
      revenue: r.revenue,
      salesCount: r.count,
    };
  });

  const revenue = [...realized.values()].reduce((s, v) => s + v.revenue, 0);
  const salesCount = [...realized.values()].reduce((s, v) => s + v.count, 0);
  const goalAmount = agencyGoal ? Number(agencyGoal.amount) : null;

  return {
    month: key,
    agencyGoal: goalAmount,
    revenue,
    salesCount,
    pct: goalAmount && goalAmount > 0 ? (revenue / goalAmount) * 100 : null,
    sellers,
    sellersGoalTotal: sellers.reduce((s, v) => s + (v.amount ?? 0), 0),
  };
}
