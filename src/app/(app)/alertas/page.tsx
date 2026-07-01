import Link from "next/link";
import { AlertsManager } from "@/components/alertas/alerts-manager";
import { Metrics, PageHead, Pill } from "@/components/dashboard/ui";
import { alertMetrics } from "@/lib/alertas-data";

export const metadata = {
  title: "FlyTop OS · Alertas",
};

export default function AlertasPage() {
  return (
    <>
      <PageHead
        eyebrow="Comunidade · operação"
        title="Controle de Alertas"
        sub="Cadastre, pré-visualize e dispare ofertas nos grupos"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/alertas/dados" className="chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 3 3 5-6" />
              </svg>
              Dados de alertas
            </Link>
            <Pill>4 alertas hoje</Pill>
          </div>
        }
      />

      <Metrics metrics={alertMetrics} />

      <AlertsManager />

      <div className="foot-note">
        <span>FlyTop OS · Prévia da Fase 1 · dados ilustrativos</span>
        <span>Elev · 2026</span>
      </div>
    </>
  );
}
