import { VendorEvolutionChart } from "@/components/charts/vendor-evolution";
import { Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import {
  recentSales,
  teamRanking,
  vendorMetrics,
  vendorName,
  vendorTeam,
} from "@/lib/vendedor-data";

export const metadata = {
  title: "FlyTop OS · Tela do Vendedor",
};

export default function VendedorPage() {
  return (
    <>
      <PageHead
        eyebrow="Sua performance"
        title={`Olá, ${vendorName}`}
        sub={
          <>
            Veja como você está em <b>maio 2026</b>
          </>
        }
        right={<Pill>Sua equipe: {vendorTeam}</Pill>}
      />

      <Metrics metrics={vendorMetrics} />

      <div className="grid-2 split">
        {/* Evolução acumulada */}
        <div className="glass chart-card">
          <SectionHead title="Sua evolução" sub="acumulado em maio" />
          <VendorEvolutionChart />
        </div>

        {/* Ranking das equipes */}
        <div className="glass card">
          <SectionHead title="Ranking das equipes" sub="por receita" flush />
          <div className="list" style={{ marginTop: 14 }}>
            {teamRanking.map((t, i) => (
              <div className={`list-row${t.me ? " me" : ""}`} key={t.name}>
                <span className={`rank${i === 0 ? " gold" : ""}`}>{i + 1}</span>
                <div className="list-main">
                  <div className="list-name">{t.name}</div>
                  <div className="list-meta">{t.sales}</div>
                </div>
                <div className="list-value private">{t.revenue}</div>
              </div>
            ))}
          </div>
          <p className="metric-hint" style={{ marginTop: 16 }}>
            Sua equipe lidera com <b>53%</b> da receita do mês.
          </p>
        </div>
      </div>

      {/* Vendas recentes */}
      <div className="section">
        <div className="glass card">
          <SectionHead title="Suas vendas recentes" sub="maio 2026" flush />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Trecho</th>
                  <th>Cliente</th>
                  <th>Cabine</th>
                  <th className="r">Valor</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr key={`${s.date}-${s.route}`}>
                    <td className="muted">{s.date}</td>
                    <td className="mono-cell">{s.route}</td>
                    <td>{s.client}</td>
                    <td>{s.cabin}</td>
                    <td className="r private">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
