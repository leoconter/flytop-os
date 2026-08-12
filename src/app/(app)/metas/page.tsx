import Link from "next/link";
import { Metrics, PageHead, Pill } from "@/components/dashboard/ui";
import type { Metric } from "@/lib/dashboard-data";
import { PARAM_FROM, PARAM_TO, resolveRange } from "@/lib/date-range";
import { fmtMoneyCompact } from "@/lib/meta/ads";
import { fmtInt } from "@/lib/meta/instagram";
import { getGoalsYear } from "@/lib/monde/goals";
import { GoalsGrid } from "./goals-grid";

export const metadata = { title: "FlyTop OS · Metas de Venda" };

/** Cadastro: nunca pode servir uma versão prerenderizada no build. */
export const dynamic = "force-dynamic";

const MES_LONGO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ [PARAM_FROM]?: string; [PARAM_TO]?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const range = resolveRange(params);
  // O ano vem da URL; sem ele, o do período escolhido no cabeçalho.
  const pedido = Number(params.ano);
  const year =
    Number.isInteger(pedido) && pedido >= 2000 && pedido <= 2100
      ? pedido
      : Number(range.until.slice(0, 4));

  const data = await getGoalsYear(year);

  if (!data) {
    return (
      <>
        <PageHead
          title="Metas de Venda"
          sub="Planilha anual de metas por vendedor"
          right={<Pill tone="blue">Aguardando conexão</Pill>}
        />
        <div className="note-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="nt">
            O banco ainda não respondeu. Confira as credenciais do Supabase.
          </div>
        </div>
      </>
    );
  }

  // Mês de referência dos indicadores: o corrente, ou o último com venda.
  const ultimoComVenda = data.months.reduce(
    (acc, _, i) => (data.sellers.some((s) => s.cells[i].revenue > 0) ? i : acc),
    0,
  );
  const ref = data.currentMonth ?? ultimoComVenda;

  const metaRef =
    data.agency[ref] ??
    data.sellers.reduce((s, v) => s + (v.cells[ref].amount ?? 0), 0);
  const realizadoRef = data.sellers.reduce((s, v) => s + v.cells[ref].revenue, 0);
  const vendasRef = data.sellers.reduce((s, v) => s + v.cells[ref].salesCount, 0);
  const pctRef = metaRef > 0 ? (realizadoRef / metaRef) * 100 : null;

  const metaAno = data.months.reduce(
    (s, _, i) =>
      s +
      (data.agency[i] ?? data.sellers.reduce((a, v) => a + (v.cells[i].amount ?? 0), 0)),
    0,
  );
  const comMeta = data.sellers.filter((v) => v.cells.some((c) => c.amount !== null)).length;
  const label = `${MES_LONGO[ref]} de ${year}`;

  const metrics: Metric[] = [
    {
      label: `Meta de ${MES_LONGO[ref]}`,
      value: metaRef > 0 ? fmtMoneyCompact(metaRef) : "não definida",
      small: metaRef === 0,
      hint: data.agency[ref] !== null ? "definida na linha da agência" : "soma dos vendedores",
      privateValue: true,
      info: "Meta do mês de referência. É ela que alimenta a linha de meta e a projeção do Dashboard Geral.",
    },
    {
      label: "Realizado",
      value: fmtMoneyCompact(realizadoRef),
      hint: `${fmtInt(vendasRef)} vendas em ${label}`,
      privateValue: true,
      info: "Faturamento das vendas do mês, sem as canceladas. Vem do Monde.",
    },
    {
      label: "% da meta",
      value: pctRef !== null ? `${pctRef.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—",
      tone: pctRef !== null && pctRef >= 100 ? "green" : "blue",
      bar: pctRef !== null ? { pct: Math.min(100, pctRef), green: pctRef >= 100 } : undefined,
      privateValue: true,
    },
    {
      label: `Meta do ano de ${year}`,
      value: metaAno > 0 ? fmtMoneyCompact(metaAno) : "não definida",
      small: metaAno === 0,
      hint: `${comMeta} de ${data.sellers.length} vendedores com meta`,
      privateValue: true,
      info: "Soma dos doze meses, usando a meta da agência quando definida e a soma dos vendedores quando não.",
    },
  ];

  return (
    <>
      <PageHead
        title="Metas de Venda"
        sub="Planilha anual — a meta é cadastro da plataforma, não vem do Monde"
        right={
          <span className="year-nav">
            <Link className="btn btn-ghost btn-sm" href={`/metas?ano=${year - 1}`} aria-label="Ano anterior">
              ‹
            </Link>
            <b>{year}</b>
            <Link className="btn btn-ghost btn-sm" href={`/metas?ano=${year + 1}`} aria-label="Próximo ano">
              ›
            </Link>
          </span>
        }
      />

      <Metrics metrics={metrics} />

      <div className="section">
        <GoalsGrid data={data} />
      </div>

      <div className="note-box blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div className="nt">
          <b>O Monde não tem meta como dado.</b> Ele guarda o valor apenas dentro
          da frase do plano de comissão (&ldquo;meta do mês: R$ 650.000,00&rdquo;), e só
          quando o mês fecha — em agosto, por exemplo, ainda não existe nenhuma.
          Por isso a meta vive aqui. O número abaixo de cada célula é o{" "}
          <b>realizado do vendedor naquele mês</b>, vindo das vendas do ERP, para
          a meta ser digitada olhando o que já aconteceu.
        </div>
      </div>
    </>
  );
}
