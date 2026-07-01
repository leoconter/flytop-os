import { Badge, Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import {
  FAST_JOURNEY_DAYS,
  funnelStages,
  jornadaMetrics,
  recentConversions,
  timeBuckets,
} from "@/lib/jornada-data";

export const metadata = { title: "FlyTop OS · Jornada de Compra" };

const nf = new Intl.NumberFormat("pt-BR");

export default function JornadaPage() {
  return (
    <>
      <PageHead
        eyebrow="Inteligência · comunidade → venda"
        title="Jornada de Compra"
        sub={
          <>
            Tempo entre <b>entrar na comunidade</b> e <b>realizar a compra</b>
          </>
        }
        right={<Pill tone="blue">maio 2026</Pill>}
      />

      <Metrics metrics={jornadaMetrics} />

      <div className="grid-2 split">
        {/* Funil comunidade → venda */}
        <div className="glass card">
          <SectionHead title="Funil da jornada" sub="do ingresso à compra" flush />
          <div className="list" style={{ marginTop: 16, gap: 18 }}>
            {funnelStages.map((stage) => (
              <div key={stage.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="list-name">{stage.label}</span>
                  <span className="list-value">{nf.format(stage.count)}</span>
                </div>
                <div className="progress-line">
                  <div className="pb">
                    <div style={{ width: `${stage.pct}%` }} />
                  </div>
                  <span className="pv">{stage.pct}%</span>
                </div>
                {stage.step && <div className="list-meta">{stage.step}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição do tempo até a compra */}
        <div className="glass card">
          <SectionHead
            title="Tempo até a compra"
            sub="distribuição dos compradores"
            flush
          />
          <div className="list" style={{ marginTop: 16, gap: 18 }}>
            {timeBuckets.map((bucket) => (
              <div key={bucket.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="list-name">{bucket.label}</span>
                  <span className="list-value">{bucket.count} membros</span>
                </div>
                <div className="progress-line">
                  <div className="pb">
                    <div style={{ width: `${bucket.pct}%` }} />
                  </div>
                  <span className="pv">{bucket.pct}%</span>
                </div>
              </div>
            ))}
          </div>
          <p className="metric-hint" style={{ marginTop: 20 }}>
            <b>63%</b> dos membros compram em até <b>15 dias</b> após entrar na
            comunidade.
          </p>
        </div>
      </div>

      {/* Conversões recentes */}
      <div className="section">
        <div className="glass card">
          <SectionHead title="Conversões recentes" sub="maio 2026" flush />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Entrou em</th>
                  <th>Comprou em</th>
                  <th className="r">Jornada</th>
                  <th className="r">Valor</th>
                </tr>
              </thead>
              <tbody>
                {recentConversions.map((row) => (
                  <tr key={`${row.member}-${row.purchased}`}>
                    <td>{row.member}</td>
                    <td className="muted">{row.joined}</td>
                    <td className="muted">{row.purchased}</td>
                    <td className="r">
                      {row.days <= FAST_JOURNEY_DAYS ? (
                        <Badge tone="green">{row.days} dias</Badge>
                      ) : (
                        <span className="mono">{row.days} dias</span>
                      )}
                    </td>
                    <td className="r private">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
