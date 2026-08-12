/**
 * Metas de venda — configuração da plataforma, não do ERP.
 *
 * O Monde não tem esse conceito, então a meta da agência e a de cada vendedor
 * vivem aqui. O Dashboard Geral lê daqui em vez da constante que existia no
 * código.
 */
import { db } from "@/lib/supabase";

/** Primeiro dia do mês de uma data ISO. */
export function monthKey(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/**
 * Meta da agência do mês.
 *
 * Quando não há meta da agência cadastrada, vale a soma das metas individuais
 * — é assim que a FlyTop trabalha (o plano de comissão do Monde define a meta
 * por vendedor, e a da agência é o total). Sem isso, preencher a planilha de
 * vendedores deixaria o Dashboard Geral sem meta, o que ninguém espera.
 */
export async function getAgencyGoal(month: string): Promise<number | null> {
  const sb = db();
  if (!sb) return null;

  const key = monthKey(month);
  const { data } = await sb
    .from("sales_goals")
    .select("scope, amount")
    .eq("month", key);

  if (!data?.length) return null;

  const agency = data.find((g) => g.scope === "agency");
  if (agency) return Number(agency.amount);

  const soma = data
    .filter((g) => g.scope === "seller")
    .reduce((s, g) => s + Number(g.amount ?? 0), 0);
  return soma > 0 ? soma : null;
}

/** Uma célula da planilha: a meta do vendedor naquele mês e o que ele fez. */
export interface GoalCell {
  amount: number | null;
  revenue: number;
  salesCount: number;
}

export interface SellerYear {
  sellerId: string;
  name: string;
  active: boolean | null;
  /** 12 posições, janeiro a dezembro. */
  cells: GoalCell[];
}

export interface GoalsYear {
  year: number;
  /** Chaves "AAAA-MM-01", janeiro a dezembro. */
  months: string[];
  sellers: SellerYear[];
  /** Meta da agência explicitamente cadastrada, por mês (null = usar a soma). */
  agency: (number | null)[];
  /** Índice do mês corrente, ou null se o ano não é o corrente. */
  currentMonth: number | null;
}

/**
 * A planilha do ano: vendedores nas linhas, meses nas colunas.
 *
 * A meta é cadastro da plataforma — o Monde não tem esse conceito. O realizado
 * de cada célula vem das vendas do ERP, cruzado pelo nome do vendedor, para a
 * meta ser digitada olhando o que já aconteceu.
 */
export async function getGoalsYear(year: number): Promise<GoalsYear | null> {
  const sb = db();
  if (!sb) return null;

  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  const months = Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}-01`,
  );

  const [goalsRes, sellersRes] = await Promise.all([
    sb
      .from("sales_goals")
      .select("scope, seller_id, month, amount")
      .gte("month", first)
      .lte("month", `${year}-12-01`),
    sb.from("monde_sellers").select("seller_id, name, active").order("name"),
  ]);

  if (sellersRes.error) {
    console.error("[monde/goals] vendedores:", sellersRes.error.message);
    return null;
  }

  // v_sales_by_seller é diária: um ano inteiro passa do teto de 1000 linhas do
  // PostgREST, então lê paginado.
  const sales: { name: string; date: string; revenue: number; count: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("v_sales_by_seller")
      .select("travel_agent_name, sale_date, sales_count, revenue")
      .gte("sale_date", first)
      .lte("sale_date", last)
      .range(from, from + 999);
    if (error || !data) break;
    sales.push(
      ...data.map((r) => ({
        name: (r.travel_agent_name as string) ?? "",
        date: r.sale_date as string,
        revenue: Number(r.revenue ?? 0),
        count: Number(r.sales_count ?? 0),
      })),
    );
    if (data.length < 1000) break;
  }

  // Realizado por vendedor e mês.
  const realized = new Map<string, { revenue: number; count: number }>();
  for (const s of sales) {
    const k = `${s.name}|${Number(s.date.slice(5, 7)) - 1}`;
    const cur = realized.get(k) ?? { revenue: 0, count: 0 };
    cur.revenue += s.revenue;
    cur.count += s.count;
    realized.set(k, cur);
  }

  const goals = goalsRes.data ?? [];
  const idx = (m: string) => Number(String(m).slice(5, 7)) - 1;
  const goalBySeller = new Map<string, number>();
  const agency: (number | null)[] = Array(12).fill(null);
  for (const g of goals) {
    if (g.scope === "agency") agency[idx(g.month as string)] = Number(g.amount);
    else goalBySeller.set(`${g.seller_id}|${idx(g.month as string)}`, Number(g.amount));
  }

  const sellers: SellerYear[] = (sellersRes.data ?? []).map((s) => ({
    sellerId: s.seller_id as string,
    name: s.name as string,
    active: s.active as boolean | null,
    cells: Array.from({ length: 12 }, (_, m) => {
      const r = realized.get(`${s.name}|${m}`) ?? { revenue: 0, count: 0 };
      return {
        amount: goalBySeller.get(`${s.seller_id}|${m}`) ?? null,
        revenue: r.revenue,
        salesCount: r.count,
      };
    }),
  }));

  const hoje = todayISO();
  return {
    year,
    months,
    sellers,
    agency,
    currentMonth: Number(hoje.slice(0, 4)) === year ? Number(hoje.slice(5, 7)) - 1 : null,
  };
}

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
