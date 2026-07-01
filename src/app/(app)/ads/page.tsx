import { AdsEfficiencyChart } from "@/components/charts/ads-efficiency";
import { Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import {
  adsByCampaign,
  adsByRegion,
  adsMetrics,
  communityMetrics,
  resultMetrics,
  type AdsRow,
} from "@/lib/ads-data";

export const metadata = { title: "FlyTop OS · Métricas de Ads" };

/** Tabela de recorte (por campanha / por região) — mesmas colunas. */
function BreakdownTable({
  title,
  sub,
  firstCol,
  rows,
}: {
  title: string;
  sub: string;
  firstCol: string;
  rows: AdsRow[];
}) {
  return (
    <div className="section">
      <div className="glass card">
        <SectionHead title={title} sub={sub} flush />
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table>
            <thead>
              <tr>
                <th>{firstCol}</th>
                <th className="r">Investimento</th>
                <th className="r">Cliques Whats</th>
                <th className="r">Entradas</th>
                <th className="r">CPA final</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td className="r private">{row.investment}</td>
                  <td className="r">{row.clicks}</td>
                  <td className="r">{row.entries}</td>
                  <td className="r private">{row.cpa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdsPage() {
  return (
    <>
      <PageHead
        eyebrow="Marketing · captação"
        title="Métricas de Ads"
        sub="Investimento e captação de membros · maio 2026"
        right={<Pill tone="blue">Gestão Elev</Pill>}
      />

      <Metrics metrics={adsMetrics} />

      <div className="section">
        <SectionHead title="Resultado" sub="ação otimizada nos anúncios" />
        <Metrics metrics={resultMetrics} />
      </div>

      <div className="section">
        <SectionHead title="Comunidade" sub="o que acontece depois do clique" />
        <Metrics metrics={communityMetrics} />
      </div>

      <div className="section">
        <SectionHead title="Investimento e eficiência" sub="últimos 6 meses" />
        <div className="glass chart-card">
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-line ll-blue" />
              Investimento
            </span>
            <span className="legend-item">
              <span className="legend-line ll-orange" />
              CPA final (por membro)
            </span>
          </div>
          <AdsEfficiencyChart />
        </div>
      </div>

      <BreakdownTable
        title="Por região"
        sub="SP e RJ · maio 2026"
        firstCol="Região"
        rows={adsByRegion}
      />

      <BreakdownTable
        title="Por campanha"
        sub="maio 2026"
        firstCol="Campanha"
        rows={adsByCampaign}
      />

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
          <b>Integração Meta Ads:</b> investimento, alcance e cliques vêm da conta
          de anúncios. O <b>CPA final</b> cruza o gasto com as entradas reais na
          comunidade — a métrica que mostra o custo verdadeiro por membro.
        </div>
      </div>
    </>
  );
}
