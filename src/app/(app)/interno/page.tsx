import { ConsolidatorDoughnut } from "@/components/charts/consolidator-doughnut";
import { DateFilter } from "@/components/dashboard/date-filter";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import {
  ListCard,
  MetricCard,
  Metrics,
  PageHead,
  Pill,
  SectionHead,
} from "@/components/dashboard/ui";
import {
  alertsByRegion,
  communityMembers,
  routes,
  salesClasses,
  suppliers,
  teams,
} from "@/lib/dashboard-data";
import { consolidatorRows, internoMetrics } from "@/lib/interno-data";

export const metadata = {
  title: "FlyTop OS · Dashboard Interno",
};

export default function InternoPage() {
  return (
    <>
      <PageHead
        eyebrow="Visão dos sócios"
        title="Dashboard Interno"
        sub="Indicadores analíticos · filtre por período"
        right={<Pill tone="blue">Acesso restrito</Pill>}
      />

      {/* Filtro por data */}
      <div className="section">
        <DateFilter />
      </div>

      {/* KPIs — Faturamento, Ticket médio, Número de vendas */}
      <Metrics metrics={internoMetrics} />

      {/* Gráfico acumulado (reaproveitado do Geral) */}
      <div className="section">
        <SectionHead
          title="Faturamento acumulado"
          sub="pace baseado em dias úteis"
        />
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
          <RevenueChart />
        </div>
      </div>

      {/* Vendas por consolidadora — gráfico + tabela */}
      <div className="grid-2 fixed">
        <div className="glass chart-card">
          <SectionHead
            title="Vendas por consolidadora"
            sub="participação na receita"
          />
          <ConsolidatorDoughnut />
        </div>
        <div className="glass card">
          <SectionHead title="Receita por consolidadora" sub="no período" flush />
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
                {consolidatorRows.map((row) => (
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
      </div>

      {/* Top companhias / destinos */}
      <div className="grid-2">
        <ListCard
          title="Top 3 companhias"
          subtitle="por receita"
          items={suppliers}
        />
        <ListCard title="Top 5 destinos" subtitle="por receita" items={routes} />
      </div>

      {/* Classes mais vendidas / Venda por equipe */}
      <div className="grid-2">
        <div className="glass card">
          <SectionHead title="Classes mais vendidas" sub="por nº de vendas" flush />
          <div className="list" style={{ marginTop: 14 }}>
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

        <div className="glass card">
          <SectionHead title="Venda por equipe" sub="por receita" flush />
          <div className="list" style={{ marginTop: 14 }}>
            {teams.map((t) => (
              <div className="list-row" key={t.name}>
                <div className="list-main">
                  <div className="list-name">{t.name}</div>
                  <div className="list-meta">{t.meta}</div>
                </div>
                <div className="list-value private">{t.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas por região / Membros */}
      <div className="grid-2">
        <div className="glass card">
          <SectionHead title="Alertas enviados" sub="por região · no mês" flush />
          <div className="list" style={{ marginTop: 14 }}>
            <div className="list-row">
              <div className="list-main">
                <div className="list-name">São Paulo</div>
                <div className="list-meta">41 grupos</div>
              </div>
              <div className="list-value">{alertsByRegion.sp}</div>
            </div>
            <div className="list-row">
              <div className="list-main">
                <div className="list-name">Rio de Janeiro</div>
                <div className="list-meta">4 grupos</div>
              </div>
              <div className="list-value">{alertsByRegion.rj}</div>
            </div>
          </div>
          <p className="metric-hint" style={{ marginTop: 12 }}>
            <b>{alertsByRegion.total}</b> alertas no total
          </p>
        </div>

        <MetricCard
          metric={{
            label: "Membros nas comunidades",
            value: communityMembers.total,
            tone: "blue",
            hint: communityMembers.hint,
          }}
        />
      </div>

      <div className="foot-note">
        <span>FlyTop OS · Prévia da Fase 1 · dados ilustrativos</span>
        <span>Elev · 2026</span>
      </div>
    </>
  );
}
