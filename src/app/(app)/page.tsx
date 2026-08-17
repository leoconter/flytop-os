import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TvModeButton } from "@/components/dashboard/tv-mode-button";
import {
  ListCard,
  MetricCard,
  Pill,
  SectionHead,
} from "@/components/dashboard/ui";
import {
  alertsByRegion,
  communityMembers,
  geralKpis,
  type ListItem,
  META,
  type Metric,
  routes,
  salesClasses,
  suppliers,
  teams,
} from "@/lib/dashboard-data";
import { PARAM_FROM, PARAM_TO, resolveRange } from "@/lib/date-range";
import { fmtMoney } from "@/lib/meta/ads";
import { fmtInt } from "@/lib/meta/instagram";
import { getAgencyGoal } from "@/lib/monde/goals";
import { getMonthSeries } from "@/lib/monde/month";
import { getAirlinesAndRoutes, getTeamSales } from "@/lib/monde/sales";

export const metadata = { title: "FlyTop OS · Dashboard Geral" };

/** Cache das leituras do banco: 1h, alinhado à carga diária do Monde. */
export const revalidate = 3600;

const MES_LONGO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function toListItems(
  items: { name: string; salesCount: number; revenue: number }[],
  mono = false,
): ListItem[] {
  return items.map((r) => ({
    name: r.name,
    meta: `${fmtInt(r.salesCount)} vendas`,
    value: fmtMoney(r.revenue),
    mono,
  }));
}

export default async function GeralPage({
  searchParams,
}: {
  searchParams: Promise<{ [PARAM_FROM]?: string; [PARAM_TO]?: string }>;
}) {
  // O Geral é uma leitura de mês: sem período na URL, abre no mês corrente.
  const range = resolveRange(await searchParams, "mes");

  // A meta vem do cadastro (tela de Metas); META só entra se ninguém definiu.
  const goal = (await getAgencyGoal(range.until)) ?? META;

  // O Geral é uma visão de mês: usa o mês do fim do período selecionado.
  const [month, breakdown, equipes] = await Promise.all([
    getMonthSeries(range.until, goal),
    getAirlinesAndRoutes(range, 3),
    getTeamSales(range),
  ]);

  const live = Boolean(month);
  const monthLabel = month
    ? `${MES_LONGO[Number(month.month.slice(5, 7)) - 1]} ${month.month.slice(0, 4)}`
    : "maio 2026";

  const kpis: Metric[] = month
    ? [
        {
          label: "Faturamento atual",
          value: fmtMoney(month.revenue),
          hint: `${fmtInt(month.salesCount)} vendas em ${month.lastDay} dias`,
          privateValue: true,
          privateHint: true,
        },
        {
          label: "% da meta",
          value:
            month.goalPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%",
          tone: "blue",
          bar: { pct: Math.min(100, month.goalPct) },
          privateValue: true,
        },
        {
          label: "Ticket médio",
          value: fmtMoney(month.avgTicket),
          hint: "por venda",
          privateValue: true,
        },
        {
          label: `Projeção fim de ${MES_LONGO[Number(month.month.slice(5, 7)) - 1]}`,
          value: fmtMoney(month.projection),
          tone: month.projection >= month.goal ? "green" : "red",
          hint:
            (month.projection >= month.goal ? "+" : "") +
            (((month.projection - month.goal) / month.goal) * 100).toLocaleString(
              "pt-BR",
              { maximumFractionDigits: 1 },
            ) +
            `% vs meta de ${fmtMoney(month.goal)}`,
          hintTone: month.projection >= month.goal ? "positive" : "negative",
          privateValue: true,
          privateHint: true,
        },
      ]
    : geralKpis;

  const tracking = month
    ? month.projection >= month.goal
      ? "Tracking acima da meta"
      : "Tracking abaixo da meta"
    : "Tracking acima da meta";

  return (
    <div className="tv-screen">
      <div className="tv-head">
        <div>
          <h1 className="page-title">Dashboard Geral</h1>
          <p className="tv-sub">
            {month ? (
              <>
                <b className="private">{fmtInt(month.salesCount)} vendas</b> ·
                faturamento até {String(month.lastDay).padStart(2, "0")}/
                {month.month.slice(5, 7)}:{" "}
                <b className="private">{fmtMoney(month.revenue)}</b> ·{" "}
                {monthLabel}
              </>
            ) : (
              <>
                <b className="private">64 vendas</b> · faturamento até 11/05:{" "}
                <b className="private">R$ 1,32M</b> · maio 2026
              </>
            )}
          </p>
        </div>
        <div className="tv-head-actions">
          <Pill tone={month && month.projection < month.goal ? "blue" : "green"}>
            {tracking}
          </Pill>
          <TvModeButton />
        </div>
      </div>

      <div className="tv-kpis">
        {kpis.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      <div className="tv-main">
        <div className="tv-col center">
          <div className="glass chart-card">
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-line ll-blue" />
                Realizado
              </span>
              <span className="legend-item">
                <span className="legend-line ll-dash-blue" />
                Projeção
              </span>
              <span className="legend-item">
                <span className="legend-line ll-dash-amber" />
                Necessidade
              </span>
              <span className="legend-item">
                <span className="legend-line ll-dash-green" />
                Meta · {fmtMoney(month?.goal ?? META)}
              </span>
            </div>
            <div className="tv-chart">
              <RevenueChart series={month ?? undefined} />
            </div>
          </div>

          <div className="tv-stats">
            <div className="glass tv-stat">
              <p className="tl">Vendas por equipe</p>
              <div className="tv-rows">
                {equipes
                  ? equipes.slice(0, 4).map((e) => (
                      <div className="tv-line" key={e.name}>
                        <span className="k">{e.name.replace("Equipe ", "")}</span>
                        <span className="v private">{fmtMoney(e.revenue)}</span>
                      </div>
                    ))
                  : teams.map((t) => (
                      <div className="tv-line" key={t.name}>
                        <span className="k">{t.name.replace("Equipe ", "")}</span>
                        <span className="v private">{t.value}</span>
                      </div>
                    ))}
              </div>
            </div>

            <div className="glass tv-stat">
              <p className="tl">Alertas no mês</p>
              <div className="tv-rows">
                <div className="tv-line">
                  <span className="k">SP</span>
                  <span className="v">{alertsByRegion.sp}</span>
                </div>
                <div className="tv-line">
                  <span className="k">RJ</span>
                  <span className="v">{alertsByRegion.rj}</span>
                </div>
              </div>
              <p className="sub">{alertsByRegion.total} no total</p>
            </div>

            <div className="glass tv-stat">
              <p className="tl">Membros nas comunidades</p>
              <p className="big blue">{communityMembers.total}</p>
              <p className="sub">{communityMembers.hint}</p>
            </div>
          </div>
        </div>

        <div className="tv-col right">
          <ListCard
            title="Top 3 destinos"
            subtitle="por receita"
            items={breakdown ? toListItems(breakdown.routes, true) : routes.slice(0, 3)}
          />
          <ListCard
            title="Top 3 companhias"
            subtitle="por receita"
            items={breakdown ? toListItems(breakdown.airlines) : suppliers}
            comLogo
          />
          <div className="glass card">
            <SectionHead title="Classes mais vendidas" sub="por receita" flush />
            <div className="list">
              {(breakdown
                ? breakdown.cabins.slice(0, 3).map((c) => ({
                    name: c.name,
                    meta: `${c.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da receita`,
                    value: `${fmtInt(c.salesCount)} vendas`,
                  }))
                : salesClasses
              ).map((c, i) => (
                <div className="list-row" key={c.name}>
                  <span className="rank">{i + 1}</span>
                  <div className="list-main">
                    <div className="list-name">{c.name}</div>
                    <div className="list-meta">{c.meta}</div>
                  </div>
                  <div className="list-value">{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {!live && <span hidden>dados ilustrativos</span>}
    </div>
  );
}
