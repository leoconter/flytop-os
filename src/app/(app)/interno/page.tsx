import { ConsolidatorDoughnut } from "@/components/charts/consolidator-doughnut";
import { RevenueByPeriodChart } from "@/components/charts/revenue-by-period";
import { DateFilter } from "@/components/dashboard/date-filter";
import {
  ListCard,
  Metrics,
  PageHead,
  Pill,
  SectionHead,
} from "@/components/dashboard/ui";
import { salesClasses, teams } from "@/lib/dashboard-data";
import {
  companiesList,
  consolidatorRows,
  internoMetrics,
  routesList,
} from "@/lib/interno-data";

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

      {/* Faturamento por período (Dia / Semana / Mês) */}
      <div className="section">
        <RevenueByPeriodChart />
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

      {/* Companhias / Destinos (listas completas) */}
      <div className="grid-2">
        <ListCard title="Companhias" subtitle="por receita" items={companiesList} />
        <ListCard title="Destinos" subtitle="por receita" items={routesList} />
      </div>

      {/* Classes / Venda por equipe */}
      <div className="grid-2">
        <div className="glass card">
          <SectionHead title="Classes" sub="por nº de vendas" flush />
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

      <div className="foot-note">
        <span>FlyTop OS · Prévia da Fase 1 · dados ilustrativos</span>
        <span>Elev · 2026</span>
      </div>
    </>
  );
}
