/**
 * Tela do Vendedor, a partir das vendas reais do Monde.
 *
 * O vendedor é identificado pelo vínculo da conta (`app_users.seller_id`); um
 * administrador pode olhar por outro, escolhendo no seletor. As vendas do ERP
 * guardam o vendedor como texto, então o cruzamento é pelo nome — é o mesmo
 * caminho que a planilha de metas usa.
 */
import type { SocialRange } from "@/lib/meta/instagram";
import { db } from "@/lib/supabase";

export interface VendorKpis {
  revenue: number;
  salesCount: number;
  avgTicket: number;
  goal: number | null;
  goalPct: number | null;
}

export interface VendorSale {
  saleId: string;
  date: string;
  customer: string | null;
  route: string | null;
  destination: string | null;
  airline: string | null;
  cabin: string | null;
  value: number;
}

export interface TeamRank {
  name: string;
  revenue: number;
  salesCount: number;
  /** Equipe do vendedor em foco. */
  me: boolean;
}

export interface VendorView {
  sellerId: string;
  name: string;
  teamName: string | null;
  kpis: VendorKpis;
  /** Acumulado dia a dia dentro do período. */
  evolution: { labels: string[]; values: number[] };
  recent: VendorSale[];
  teams: TeamRank[];
}

export interface SellerChoice {
  sellerId: string;
  name: string;
  active: boolean | null;
}

/** Vendedores para o seletor do administrador. */
export async function listSellers(): Promise<SellerChoice[] | null> {
  const sb = db();
  if (!sb) return null;
  const { data, error } = await sb
    .from("monde_sellers")
    .select("seller_id, name, active")
    .order("name");
  if (error) return null;
  return (data ?? []).map((s) => ({
    sellerId: s.seller_id as string,
    name: s.name as string,
    active: s.active as boolean | null,
  }));
}

export async function getVendorView(
  sellerId: string,
  range: SocialRange,
): Promise<VendorView | null> {
  const sb = db();
  if (!sb) return null;

  const [sellerRes, salesRes, goalsRes, allSellersRes, teamsRes] = await Promise.all([
    sb.from("monde_sellers").select("seller_id, name, team_id").eq("seller_id", sellerId).maybeSingle(),
    sb
      .from("v_sales_by_seller")
      .select("travel_agent_name, sale_date, sales_count, revenue")
      .gte("sale_date", range.since)
      .lte("sale_date", range.until),
    sb
      .from("sales_goals")
      .select("seller_id, amount")
      .eq("scope", "seller")
      .eq("month", `${range.until.slice(0, 7)}-01`),
    sb.from("monde_sellers").select("seller_id, name, team_id"),
    sb.from("teams").select("id, name"),
  ]);

  if (sellerRes.error || !sellerRes.data) {
    console.error("[monde/vendor]", sellerRes.error?.message ?? "vendedor não encontrado");
    return null;
  }

  const seller = sellerRes.data;
  const nome = seller.name as string;
  const nomeDaEquipe = new Map((teamsRes.data ?? []).map((t) => [t.id as string, t.name as string]));
  const equipeDoVendedor = new Map(
    (allSellersRes.data ?? []).map((s) => [s.name as string, (s.team_id as string) ?? null]),
  );

  // Realizado por dia, só deste vendedor.
  const porDia = new Map<string, { revenue: number; count: number }>();
  const porEquipe = new Map<string, { revenue: number; count: number }>();
  for (const r of salesRes.data ?? []) {
    const quem = (r.travel_agent_name as string) ?? "";
    const receita = Number(r.revenue ?? 0);
    const qtd = Number(r.sales_count ?? 0);

    if (quem === nome) {
      const d = r.sale_date as string;
      const cur = porDia.get(d) ?? { revenue: 0, count: 0 };
      cur.revenue += receita;
      cur.count += qtd;
      porDia.set(d, cur);
    }

    const tid = equipeDoVendedor.get(quem) ?? null;
    const chave = tid ? (nomeDaEquipe.get(tid) ?? "Sem equipe") : "Sem equipe";
    const e = porEquipe.get(chave) ?? { revenue: 0, count: 0 };
    e.revenue += receita;
    e.count += qtd;
    porEquipe.set(chave, e);
  }

  const revenue = [...porDia.values()].reduce((s, v) => s + v.revenue, 0);
  const salesCount = [...porDia.values()].reduce((s, v) => s + v.count, 0);
  const goal = (goalsRes.data ?? []).find((g) => g.seller_id === sellerId)?.amount ?? null;
  const goalNum = goal === null ? null : Number(goal);

  // Acumulado dia a dia, incluindo os dias sem venda: a linha não pode dar
  // salto que sugira dia sem registro.
  const labels: string[] = [];
  const values: number[] = [];
  let acumulado = 0;
  for (let d = new Date(`${range.since}T12:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (iso > range.until) break;
    acumulado += porDia.get(iso)?.revenue ?? 0;
    labels.push(iso);
    values.push(acumulado);
  }

  const minhaEquipe = seller.team_id ? (nomeDaEquipe.get(seller.team_id as string) ?? null) : null;

  const { data: recentes } = await sb
    .from("v_sales_flat")
    .select("sale_id, sale_date, cliente, trecho, destino, companhia, classe, valor")
    .eq("vendedor", nome)
    .neq("status", "canceled")
    .gte("sale_date", range.since)
    .lte("sale_date", range.until)
    .order("sale_date", { ascending: false })
    .limit(8);

  return {
    sellerId,
    name: nome,
    teamName: minhaEquipe,
    kpis: {
      revenue,
      salesCount,
      avgTicket: salesCount > 0 ? revenue / salesCount : 0,
      goal: goalNum,
      goalPct: goalNum && goalNum > 0 ? (revenue / goalNum) * 100 : null,
    },
    evolution: { labels, values },
    recent: (recentes ?? []).map((r) => ({
      saleId: r.sale_id as string,
      date: r.sale_date as string,
      customer: (r.cliente as string) ?? null,
      route: (r.trecho as string) ?? null,
      destination: (r.destino as string) ?? null,
      airline: (r.companhia as string) ?? null,
      cabin: (r.classe as string) ?? null,
      value: Number(r.valor ?? 0),
    })),
    teams: [...porEquipe]
      .map(([name, v]) => ({ name, revenue: v.revenue, salesCount: v.count, me: name === minhaEquipe }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}
