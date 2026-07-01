import { ConsolidatorDoughnut } from "@/components/charts/consolidator-doughnut";
import { RevenueByMonthChart } from "@/components/charts/revenue-by-month";
import {
  ListCard,
  Metrics,
  PageHead,
  Pill,
  SectionHead,
} from "@/components/dashboard/ui";
import {
  consolidatorRows,
  internoMetrics,
  salesByClass,
  salesByCompany,
  salesByRoute,
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
        sub="Indicadores analíticos · maio 2026"
        right={<Pill tone="blue">Acesso restrito</Pill>}
      />

      <Metrics metrics={internoMetrics} />

      <div className="grid-2 split">
        <div className="glass chart-card">
          <SectionHead title="Receita por mês" sub="últimos 6 meses" />
          <RevenueByMonthChart />
        </div>
        <div className="glass chart-card">
          <SectionHead
            title="Vendas por consolidadora"
            sub="participação na receita"
          />
          <ConsolidatorDoughnut />
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead title="Receita por consolidadora" sub="maio 2026" flush />
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

      {/* Vendas por companhias / destinos / classes */}
      <div className="grid-2">
        <ListCard
          title="Vendas por companhia"
          subtitle="nº de vendas"
          items={salesByCompany}
          privateValue={false}
        />
        <ListCard
          title="Vendas por destino"
          subtitle="nº de vendas"
          items={salesByRoute}
          privateValue={false}
        />
        <ListCard
          title="Vendas por classe"
          subtitle="nº de vendas"
          items={salesByClass}
          privateValue={false}
        />
      </div>
    </>
  );
}
