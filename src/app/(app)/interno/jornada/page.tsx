import Link from "next/link";
import { JourneyDistributionChart } from "@/components/charts/journey-distribution";
import { JourneyMonthlyChart } from "@/components/charts/journey-monthly";
import { Badge, Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import {
  FAST_JOURNEY_DAYS,
  jornadaMetrics,
  recentConversions,
} from "@/lib/jornada-data";

export const metadata = { title: "FlyTop OS · Jornada de Compra" };

export default function JornadaPage() {
  return (
    <>
      <PageHead
        eyebrow="Controle Interno · comunidade → venda"
        title="Jornada de Compra"
        sub={
          <>
            Tempo entre <b>entrar na comunidade</b> e <b>realizar a compra</b>
          </>
        }
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Pill tone="blue">maio 2026</Pill>
            <Link href="/interno" className="chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Voltar para o Controle Interno
            </Link>
          </div>
        }
      />

      <Metrics metrics={jornadaMetrics} />

      <div className="grid-2 split">
        {/* Distribuição do tempo até a compra */}
        <div className="glass chart-card">
          <SectionHead
            title="Distribuição do tempo até a compra"
            sub="compradores do mês"
          />
          <JourneyDistributionChart />
        </div>

        {/* Tempo médio por mês */}
        <div className="glass chart-card">
          <SectionHead title="Tempo médio por mês" sub="últimos 6 meses" />
          <JourneyMonthlyChart />
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
