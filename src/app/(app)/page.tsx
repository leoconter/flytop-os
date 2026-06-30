import { RevenueChart } from "@/components/dashboard/revenue-chart";
import {
  ListCard,
  Metrics,
  PageHead,
  Pill,
  SectionHead,
} from "@/components/dashboard/ui";
import { metrics, routes, suppliers } from "@/lib/dashboard-data";

export const metadata = {
  title: "FlyTop OS · Dashboard Geral",
};

export default function GeralPage() {
  return (
    <>
      <PageHead
        eyebrow="Tela do escritório · TV"
        title="Dashboard Geral"
        sub={
          <>
            <b className="private">64 vendas</b> · faturamento até 11/05:{" "}
            <b className="private">R$ 1,32M</b>
          </>
        }
        right={<Pill>Tracking acima da meta</Pill>}
      />

      <Metrics metrics={metrics} />

      <div className="section">
        <SectionHead
          title="Faturamento acumulado"
          sub="maio 2026 · pace baseado em dias úteis"
        />
        <div className="glass chart-card">
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-line ll-blue" />
              Realizado
            </span>
            <span className="legend-item">
              <span className="legend-line ll-dash-blue" />
              Projeção (pace)
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

      <div className="grid-2">
        <ListCard
          title="Top 3 fornecedores"
          subtitle="por receita"
          items={suppliers}
        />
        <ListCard title="Top 5 trechos" subtitle="por receita" items={routes} />
      </div>

      <div className="foot-note">
        <span>FlyTop OS · Prévia da Fase 1 · dados ilustrativos</span>
        <span>Elev · 2026</span>
      </div>
    </>
  );
}
