/**
 * Série do mês para o Dashboard Geral, montada a partir das vendas reais.
 *
 * Mesma lógica de pace/necessidade do preview validado (`buildSeries()` em
 * `src/lib/dashboard-data.ts`), só que alimentada pelo banco em vez da
 * planilha: acumulado realizado, projeção pela média por dia útil, e a
 * necessidade diária para bater a meta.
 */
import { db } from "@/lib/supabase";

/** Feriados nacionais fixos (MM-DD). */
const FIXED_HOLIDAYS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25"];

export interface MonthSeries {
  /** Mês exibido, "AAAA-MM". */
  month: string;
  daysInMonth: number;
  /** Último dia com venda registrada. */
  lastDay: number;
  labels: number[];
  cumulative: (number | null)[];
  pace: (number | null)[];
  necessity: number[];
  metaLine: number[];
  businessFlags: Record<number, boolean>;
  /** Faturamento acumulado até hoje. */
  revenue: number;
  salesCount: number;
  avgTicket: number;
  /** Projeção de fechamento mantendo a média por dia útil. */
  projection: number;
  goal: number;
  goalPct: number;
}

function isBusinessDay(year: number, monthIndex: number, day: number): boolean {
  const d = new Date(Date.UTC(year, monthIndex, day));
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !FIXED_HOLIDAYS.includes(d.toISOString().slice(5, 10));
}

/**
 * Monta a série do mês que contém `reference` (padrão: o mês da data final do
 * período selecionado). `goal` é a meta da agência — hoje uma constante,
 * futuramente configurável por mês.
 */
export async function getMonthSeries(
  reference: string,
  goal: number,
): Promise<MonthSeries | null> {
  const sb = db();
  if (!sb) return null;

  const year = Number(reference.slice(0, 4));
  const monthIndex = Number(reference.slice(5, 7)) - 1;
  const month = reference.slice(0, 7);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const { data, error } = await sb
    .from("v_sales_daily")
    .select("sale_date, sales_count, revenue")
    .gte("sale_date", `${month}-01`)
    .lte("sale_date", `${month}-${String(daysInMonth).padStart(2, "0")}`)
    .order("sale_date");

  if (error || !data?.length) return null;

  const byDay = new Map<number, { revenue: number; count: number }>();
  for (const r of data) {
    const day = Number((r.sale_date as string).slice(8, 10));
    byDay.set(day, {
      revenue: Number(r.revenue ?? 0),
      count: Number(r.sales_count ?? 0),
    });
  }

  const lastDay = Math.max(...byDay.keys());
  const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const businessFlags: Record<number, boolean> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    businessFlags[d] = isBusinessDay(year, monthIndex, d);
  }

  // Acumulado realizado, até o último dia com venda.
  const cumulative: (number | null)[] = [];
  let running = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (d <= lastDay) {
      running += byDay.get(d)?.revenue ?? 0;
      cumulative.push(running);
    } else {
      cumulative.push(null);
    }
  }

  // Média por dia útil já decorrido.
  let bizSum = 0;
  let bizCount = 0;
  for (let d = 1; d <= lastDay; d++) {
    if (businessFlags[d]) {
      bizSum += byDay.get(d)?.revenue ?? 0;
      bizCount++;
    }
  }
  const avgPerBusinessDay = bizCount > 0 ? bizSum / bizCount : 0;

  // Necessidade: meta distribuída pelos dias úteis do mês.
  const totalBizDays = labels.filter((d) => businessFlags[d]).length;
  const requiredPerBizDay = totalBizDays > 0 ? goal / totalBizDays : 0;
  const necessity: number[] = [];
  let needCum = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (businessFlags[d]) needCum += requiredPerBizDay;
    necessity.push(needCum);
  }

  // Projeção: escada que só sobe em dia útil, ancorada no último realizado.
  const pace: (number | null)[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (d < lastDay) pace.push(null);
    else if (d === lastDay) pace.push(cumulative[lastDay - 1]);
    else {
      const prev = pace[pace.length - 1] as number;
      pace.push(businessFlags[d] ? prev + avgPerBusinessDay : prev);
    }
  }

  const revenue = running;
  const salesCount = [...byDay.values()].reduce((s, v) => s + v.count, 0);
  const projection = (pace[daysInMonth - 1] as number) ?? revenue;

  return {
    month,
    daysInMonth,
    lastDay,
    labels,
    cumulative,
    pace,
    necessity,
    metaLine: Array(daysInMonth).fill(goal),
    businessFlags,
    revenue,
    salesCount,
    avgTicket: salesCount > 0 ? revenue / salesCount : 0,
    projection,
    goal,
    goalPct: goal > 0 ? (revenue / goal) * 100 : 0,
  };
}
