import Link from "next/link";
import { ConsolidatorDoughnut } from "@/components/charts/consolidator-doughnut";
import { RevenueByMonthChart } from "@/components/charts/revenue-by-month";
import { RevenuePeriodChart } from "@/components/charts/revenue-period";
import {
  ListCard,
  Metrics,
  PageHead,
  Pill,
  SectionHead,
} from "@/components/dashboard/ui";
import type { ListItem, Metric } from "@/lib/dashboard-data";
import { formatRange, PARAM_FROM, PARAM_TO, resolveRange } from "@/lib/date-range";
import { fmtMoney, fmtMoneyCompact } from "@/lib/meta/ads";
import { fmtInt } from "@/lib/meta/instagram";
import {
  getAirlinesAndRoutes,
  getConsolidators,
  getSalesTotals,
  type RankedItem,
} from "@/lib/monde/sales";
import {
  consolidatorRows,
  internoMetrics,
  salesByClass,
  salesByCompany,
  salesByRoute,
} from "@/lib/interno-data";

export const metadata = { title: "FlyTop OS · Controle Interno" };

/** Cache das leituras do banco: 1h, alinhado à carga diária do Monde. */
export const revalidate = 3600;

/** Cores do gráfico de rosca, na ordem do ranking. */
const SLICE_COLORS = ["#1E56B8", "#50549F", "#1E7A46", "#B0761E", "#4A7FB5", "#B3362C"];

function toListItems(items: RankedItem[], unit: string, mono = false): ListItem[] {
  return items.map((r) => ({
    name: r.name,
    meta: `${r.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da receita`,
    value: `${fmtInt(r.salesCount)} ${unit}`,
    mono,
  }));
}

export default async function InternoPage({
  searchParams,
}: {
  searchParams: Promise<{ [PARAM_FROM]?: string; [PARAM_TO]?: string }>;
}) {
  const range = resolveRange(await searchParams);
  const periodLabel = formatRange(range);

  const [totals, consolidators, breakdown] = await Promise.all([
    getSalesTotals(range),
    getConsolidators(range),
    getAirlinesAndRoutes(range),
  ]);

  const live = Boolean(totals);

  const metrics: Metric[] = totals
    ? [
        {
          label: "Receita no período",
          value: fmtMoneyCompact(totals.revenue),
          hint: `${fmtInt(totals.salesCount)} vendas emitidas`,
          privateValue: true,
          privateHint: true,
          info: "Soma do valor final das vendas do período, sem as canceladas. Vem do Monde.",
        },
        {
          label: "Margem",
          value: fmtMoneyCompact(totals.margin),
          tone: "green",
          hint: `${totals.marginPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do faturamento`,
          privateValue: true,
          info: "O que sobra para a agência depois do custo do fornecedor — é o lucro bruto, não o faturamento.",
        },
        {
          label: "Ticket médio",
          value: fmtMoney(totals.avgTicket),
          hint: "por venda",
          privateValue: true,
          info: "Receita dividida pelo número de vendas do período.",
        },
        {
          label: "Vendas / dia útil",
          value: totals.perBusinessDay.toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          }),
          hint: `${totals.businessDays} dias úteis no período`,
          info: "Vendas divididas pelos dias úteis (sem fins de semana e feriados nacionais).",
        },
      ]
    : internoMetrics;

  return (
    <>
      <PageHead
        title="Controle Interno"
        sub={
          live
            ? `Indicadores analíticos · ${periodLabel}`
            : "Indicadores analíticos · dados ilustrativos"
        }
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* A Jornada de Compra saiu do menu e passou a viver aqui dentro:
                é a mesma leitura analítica, do outro lado do funil. */}
            <Link href="/interno/jornada" className="chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" />
              </svg>
              Jornada de Compra
            </Link>
            <Pill tone="blue">
              {live ? "Acesso restrito" : "Aguardando conexão Monde"}
            </Pill>
          </div>
        }
      />

      <Metrics metrics={metrics} />

      {/* Largura inteira: é a leitura principal da tela, e com recorte diário
          são muitas barras — espremida em meia tela vira um borrão. */}
      <div className="section">
        <div className="glass chart-card">
          {totals ? (
            <RevenuePeriodChart
              daily={totals.daily}
              since={range.since}
              until={range.until}
            />
          ) : (
            <>
              <SectionHead title="Receita por mês" sub="dados ilustrativos" />
              <RevenueByMonthChart />
            </>
          )}
        </div>
      </div>

      {/* A rosca ao lado da tabela: a mesma informação em duas leituras — a
          proporção de relance, o número exato na linha. */}
      <div className="section">
        <div className="consolidadoras">
          <div className="glass card">
            <SectionHead
              title="Receita por consolidadora"
              sub={live ? periodLabel : "maio 2026"}
              flush
            />
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Consolidadora</th>
                    <th className="r">Vendas</th>
                    <th className="r">Receita</th>
                    <th className="r">Participação</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidators
                    ? consolidators.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td className="r">{fmtInt(row.salesCount)}</td>
                          <td className="r private">{fmtMoney(row.revenue)}</td>
                          <td className="r">
                            {row.share.toLocaleString("pt-BR", {
                              maximumFractionDigits: 1,
                            })}
                            %
                          </td>
                        </tr>
                      ))
                    : consolidatorRows.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td className="r">{row.sales}</td>
                          <td className="r private">{row.revenue}</td>
                          <td className="r">{row.share}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass chart-card">
            <SectionHead
              title="Vendas por consolidadora"
              sub="participação na receita"
            />
            <ConsolidatorDoughnut
              slices={consolidators?.slice(0, 6).map((c, i) => ({
                label: c.name,
                value: Number(c.share.toFixed(1)),
                color: SLICE_COLORS[i % SLICE_COLORS.length],
              }))}
            />
          </div>
        </div>
      </div>

      <div className="grid-2">
        <ListCard
          title="Vendas por companhia"
          subtitle="por receita"
          items={
            breakdown ? toListItems(breakdown.airlines, "vendas") : salesByCompany
          }
          privateValue={false}
        />
        <ListCard
          title="Vendas por destino"
          subtitle="por receita"
          items={
            breakdown ? toListItems(breakdown.routes, "vendas", true) : salesByRoute
          }
          privateValue={false}
        />
        <ListCard
          title="Vendas por classe"
          subtitle="por receita"
          items={breakdown ? toListItems(breakdown.cabins, "vendas") : salesByClass}
          privateValue={false}
        />
      </div>

      {live && (
        <div className="note-box blue">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="nt">
            <b>Fonte:</b> vendas do Monde, sincronizadas para o banco da
            plataforma. Vendas canceladas ficam de fora de todos os números.
            Em <b>Vendas por classe</b>, a cabine vem da conversão da classe
            tarifária — as letras ambíguas ainda precisam ser confirmadas com a
            operação.
          </div>
        </div>
      )}
    </>
  );
}
