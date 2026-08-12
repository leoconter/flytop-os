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
 * Meta de faturamento da agência no mês, como foi cadastrada.
 *
 * Não é a soma das metas individuais: a da agência é um número próprio, e a
 * soma dos vendedores aparece na planilha só como conferência. Somar por conta
 * própria faria a plataforma inventar uma meta que ninguém definiu.
 */
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

export interface SellerYear {
  sellerId: string;
  name: string;
  active: boolean | null;
  /** Meta de cada mês, janeiro a dezembro. */
  goals: (number | null)[];
}

export interface GoalsYear {
  year: number;
  /** Chaves "AAAA-MM-01", janeiro a dezembro. */
  months: string[];
  sellers: SellerYear[];
  /** Meta da agência por mês. Independente das individuais. */
  agency: (number | null)[];
  /** Índice do mês corrente, ou null se o ano não é o corrente. */
  currentMonth: number | null;
}

/**
 * A planilha do ano: vendedores nas linhas, meses nas colunas.
 *
 * Só metas — o realizado tem tela própria. Aqui isso mantém a leitura barata:
 * dois selects, nenhuma varredura de vendas.
 */
export async function getGoalsYear(year: number): Promise<GoalsYear | null> {
  const sb = db();
  if (!sb) return null;

  const months = Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}-01`,
  );

  const [goalsRes, sellersRes] = await Promise.all([
    sb
      .from("sales_goals")
      .select("scope, seller_id, month, amount")
      .gte("month", `${year}-01-01`)
      .lte("month", `${year}-12-01`),
    sb.from("monde_sellers").select("seller_id, name, active").order("name"),
  ]);

  if (sellersRes.error) {
    console.error("[monde/goals] vendedores:", sellersRes.error.message);
    return null;
  }

  const idx = (m: string) => Number(String(m).slice(5, 7)) - 1;
  const goalBySeller = new Map<string, number>();
  const agency: (number | null)[] = Array(12).fill(null);
  for (const g of goalsRes.data ?? []) {
    if (g.scope === "agency") agency[idx(g.month as string)] = Number(g.amount);
    else goalBySeller.set(`${g.seller_id}|${idx(g.month as string)}`, Number(g.amount));
  }

  const sellers: SellerYear[] = (sellersRes.data ?? []).map((s) => ({
    sellerId: s.seller_id as string,
    name: s.name as string,
    active: s.active as boolean | null,
    goals: Array.from(
      { length: 12 },
      (_, m) => goalBySeller.get(`${s.seller_id}|${m}`) ?? null,
    ),
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
