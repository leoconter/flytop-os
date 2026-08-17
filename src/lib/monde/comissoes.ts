/**
 * Comissão dos vendedores.
 *
 * A regra tem duas pernas, e trocá-las erra o valor por uma ordem de grandeza:
 *
 *   a **faixa** vem do faturamento do mês   — vendeu 436k, está na faixa de 6%
 *   o **percentual** incide sobre a margem  — 6% de 40.821 = 2.449
 *
 * Comissionar o faturamento pagaria 26 mil pelo mesmo mês; comissionar a margem
 * mas escolher a faixa por ela deixaria todo mundo em 0%, porque a margem
 * raramente passa de 12% da venda.
 */
import { calcular, type Faixa, faixaDe } from "@/lib/comissao-regra";
import { db } from "@/lib/supabase";

export { calcular, type Faixa, faixaDe };

export interface LinhaComissao {
  sellerId: string | null;
  vendedor: string;
  faturamento: number;
  margem: number;
  /** A faixa em que o faturamento caiu — null se nenhuma cobre o valor. */
  faixa: Faixa | null;
  comissao: number;
}

export interface Comissoes {
  mes: string;
  faixas: Faixa[];
  linhas: LinhaComissao[];
  totalFaturamento: number;
  totalMargem: number;
  totalComissao: number;
  /** Faturamento que nenhuma faixa cobre — buraco na tabela, não zero legítimo. */
  semFaixa: number;
}

export async function listarFaixas(): Promise<Faixa[] | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("commission_bands")
    .select("id, min_revenue, max_revenue, rate")
    .order("min_revenue");

  if (error) {
    console.error("[comissoes] faixas:", error.message);
    return null;
  }

  return (data ?? []).map((f) => ({
    id: f.id as string,
    de: Number(f.min_revenue),
    ate: f.max_revenue === null ? null : Number(f.max_revenue),
    taxa: Number(f.rate),
  }));
}

/** Primeiro e último dia do mês "YYYY-MM". */
function limites(mes: string): { de: string; ate: string } {
  const [ano, m] = mes.split("-").map(Number);
  const fim = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return { de: `${mes}-01`, ate: `${mes}-${String(fim).padStart(2, "0")}` };
}

export async function getComissoes(mes: string): Promise<Comissoes | null> {
  const sb = db();
  if (!sb) return null;

  const faixas = await listarFaixas();
  if (!faixas) return null;

  const { de, ate } = limites(mes);

  const [vendas, vendedores] = await Promise.all([
    sb
      .from("v_sales_by_seller")
      .select("travel_agent_name, revenue, margin")
      .gte("sale_date", de)
      .lte("sale_date", ate),
    sb.from("monde_sellers").select("seller_id, name, active"),
  ]);

  if (vendas.error) {
    console.error("[comissoes] vendas:", vendas.error.message);
    return null;
  }

  const idPorNome = new Map(
    (vendedores.data ?? []).map((s) => [s.name as string, s.seller_id as string]),
  );

  const agg = new Map<string, { faturamento: number; margem: number }>();
  for (const r of vendas.data ?? []) {
    const nome = (r.travel_agent_name as string) ?? "";
    if (!nome) continue;
    const cur = agg.get(nome) ?? { faturamento: 0, margem: 0 };
    cur.faturamento += Number(r.revenue ?? 0);
    cur.margem += Number(r.margin ?? 0);
    agg.set(nome, cur);
  }

  const linhas: LinhaComissao[] = [...agg.entries()]
    .map(([vendedor, v]) => {
      const { faixa, comissao } = calcular(v.faturamento, v.margem, faixas);
      return {
        sellerId: idPorNome.get(vendedor) ?? null,
        vendedor,
        faturamento: v.faturamento,
        margem: v.margem,
        faixa,
        comissao,
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);

  return {
    mes,
    faixas,
    linhas,
    totalFaturamento: linhas.reduce((s, l) => s + l.faturamento, 0),
    totalMargem: linhas.reduce((s, l) => s + l.margem, 0),
    totalComissao: linhas.reduce((s, l) => s + l.comissao, 0),
    semFaixa: linhas.filter((l) => !l.faixa).reduce((s, l) => s + l.faturamento, 0),
  };
}

/**
 * A faixa de um vendedor no mês — para o cartão na tela dele.
 *
 * Devolve também o que falta para a próxima faixa, que é a informação
 * acionável: "faltam R$ 13.684 para 7%" diz o que fazer, "você está em 6%" não.
 */
export interface FaixaDoVendedor {
  faturamento: number;
  margem: number;
  faixa: Faixa | null;
  comissao: number;
  proxima: Faixa | null;
  faltaParaProxima: number | null;
}

export async function getFaixaDoVendedor(
  nome: string,
  mes: string,
): Promise<FaixaDoVendedor | null> {
  const sb = db();
  if (!sb) return null;

  const faixas = await listarFaixas();
  if (!faixas) return null;

  const { de, ate } = limites(mes);
  const { data, error } = await sb
    .from("v_sales_by_seller")
    .select("revenue, margin")
    .eq("travel_agent_name", nome)
    .gte("sale_date", de)
    .lte("sale_date", ate);

  if (error) {
    console.error("[comissoes] vendedor:", error.message);
    return null;
  }

  const faturamento = (data ?? []).reduce((s, r) => s + Number(r.revenue ?? 0), 0);
  const margem = (data ?? []).reduce((s, r) => s + Number(r.margin ?? 0), 0);
  const { faixa, comissao } = calcular(faturamento, margem, faixas);

  const proxima = faixas.find((f) => f.de > faturamento) ?? null;

  return {
    faturamento,
    margem,
    faixa,
    comissao,
    proxima,
    faltaParaProxima: proxima ? proxima.de - faturamento : null,
  };
}
