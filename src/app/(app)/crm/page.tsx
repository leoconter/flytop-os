import Link from "next/link";
import { CrmManager } from "@/components/crm/crm-manager";
import { Metrics, PageHead, Pill } from "@/components/dashboard/ui";
import { crmMetrics } from "@/lib/crm-data";
import { listarLeads } from "@/lib/crm/store";

export const metadata = {
  title: "FlyTop OS · CRM",
};

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const r = await listarLeads();
  const leads = "leads" in r ? r.leads : [];

  return (
    <>
      <PageHead
        eyebrow="Operação · relacionamento"
        title="Mini CRM"
        sub="Registre o interesse do lead e chame quando o alerta casar"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/crm/embarques" className="chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9.3l-.9.9 5.5 3.5-2.5 2.5-2-.4-1 1 3 2 2 3 1-1-.4-2 2.5-2.5 3.5 5.5.9-.9a1 1 0 0 0 .3-.9z" />
              </svg>
              Embarques e retornos 48h
            </Link>
            <Pill>Registro de interesse</Pill>
          </div>
        }
      />

      <Metrics metrics={crmMetrics} />

      <CrmManager leads={leads} />

      <div className="foot-note">
        <span>FlyTop OS · Prévia da Fase 1 · dados ilustrativos</span>
        <span>Elev · 2026</span>
      </div>
    </>
  );
}
