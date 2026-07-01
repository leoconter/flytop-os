import { CommunityFlowChart } from "@/components/charts/community-flow";
import { Badge, Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import {
  communityCount,
  communityMetrics,
  communityRows,
  communityTotalLabel,
} from "@/lib/comunidade-data";

export const metadata = { title: "FlyTop OS · Comunidade" };

export default function ComunidadePage() {
  return (
    <>
      <PageHead
        eyebrow="Crescimento"
        title="Controle da Comunidade"
        sub={
          <>
            Entradas, saídas e total de membros · <b>{communityCount} comunidades</b>
          </>
        }
        right={<Pill>+265 hoje</Pill>}
      />

      <Metrics metrics={communityMetrics} />

      <div className="section">
        <div className="glass chart-card">
          <SectionHead title="Entradas e saídas" sub="últimos 10 dias" />
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-line ll-green" />
              Entradas
            </span>
            <span className="legend-item">
              <span className="legend-line ll-red" />
              Saídas
            </span>
          </div>
          <CommunityFlowChart />
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Por comunidade"
            sub={`${communityCount} grupos · ${communityTotalLabel} membros`}
            flush
          />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Comunidade</th>
                  <th>Região</th>
                  <th className="r">Membros</th>
                  <th>Participação</th>
                </tr>
              </thead>
              <tbody>
                {communityRows.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>
                      <Badge tone={c.region === "RJ" ? "orange" : "blue"}>
                        {c.region}
                      </Badge>
                    </td>
                    <td className="r">{c.membersLabel}</td>
                    <td>
                      <div className="share">
                        <div className="sb">
                          <div style={{ width: `${c.bar.toFixed(0)}%` }} />
                        </div>
                        <span className="sp">{c.occupancyLabel}</span>
                      </div>
                    </td>
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
