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
  routes,
  salesClasses,
  suppliers,
  teams,
} from "@/lib/dashboard-data";

export const metadata = {
  title: "FlyTop OS · Dashboard Geral",
};

export default function GeralPage() {
  return (
    <div className="tv-screen">
      {/* Cabeçalho compacto */}
      <div className="tv-head">
        <div>
          <h1 className="page-title">Dashboard Geral</h1>
          <p className="tv-sub">
            <b className="private">64 vendas</b> · faturamento até 11/05:{" "}
            <b className="private">R$ 1,32M</b> · maio 2026
          </p>
        </div>
        <div className="tv-head-actions">
          <Pill>Tracking acima da meta</Pill>
          <TvModeButton />
        </div>
      </div>

      {/* KPIs grandes */}
      <div className="tv-kpis">
        {geralKpis.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      {/* Área principal */}
      <div className="tv-main">
        {/* Esquerda: gráfico + faixa de stats */}
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
                Meta · R$ 3,5M
              </span>
            </div>
            <div className="tv-chart">
              <RevenueChart />
            </div>
          </div>

          <div className="tv-stats">
            <div className="glass tv-stat">
              <p className="tl">Venda por equipe</p>
              <div className="tv-rows">
                {teams.map((t) => (
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

        {/* Direita: destinos + companhias + classes */}
        <div className="tv-col right">
          <ListCard
            title="Top 3 destinos"
            subtitle="por receita"
            items={routes.slice(0, 3)}
          />
          <ListCard
            title="Top 3 companhias"
            subtitle="por receita"
            items={suppliers}
          />
          <div className="glass card">
            <SectionHead title="Classes mais vendidas" sub="por nº de vendas" flush />
            <div className="list">
              {salesClasses.map((c, i) => (
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
    </div>
  );
}
