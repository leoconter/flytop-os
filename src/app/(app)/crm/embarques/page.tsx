import Link from "next/link";
import { Badge, Metrics, PageHead, SectionHead } from "@/components/dashboard/ui";
import {
  embarques48h,
  embarquesMetrics,
  retornos48h,
  type VooCRM,
  waLink,
} from "@/lib/crm-data";

export const metadata = {
  title: "FlyTop OS · Embarques e retornos 48h",
};

function VooTable({
  title,
  sub,
  voos,
}: {
  title: string;
  sub: string;
  voos: VooCRM[];
}) {
  return (
    <div className="glass card">
      <SectionHead title={title} sub={sub} flush />
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Cliente</th>
              <th>Trecho</th>
              <th>Companhia</th>
              <th>Localizador</th>
              <th className="r">Contato</th>
            </tr>
          </thead>
          <tbody>
            {voos.map((v) => (
              <tr key={v.id}>
                <td>
                  <Badge tone={v.horas <= 24 ? "orange" : "blue"}>
                    {v.quando}
                  </Badge>
                </td>
                <td>{v.cliente}</td>
                <td className="mono-cell">{v.trecho}</td>
                <td>{v.companhia}</td>
                <td className="mono-cell muted">{v.localizador}</td>
                <td className="r">
                  <div className="row-actions">
                    <a
                      className="btn btn-ghost btn-sm"
                      href={waLink(v.telefone)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EmbarquesPage() {
  return (
    <>
      <PageHead
        eyebrow="CRM · operação"
        title="Embarques e retornos"
        sub="Clientes partindo e voltando nas próximas 48h"
        right={
          <Link href="/crm" className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar para o CRM
          </Link>
        }
      />

      <Metrics metrics={embarquesMetrics} />

      <div className="section">
        <VooTable
          title="Embarques nas próximas 48h"
          sub="clientes partindo — acompanhe a viagem"
          voos={embarques48h}
        />
      </div>

      <div className="section">
        <VooTable
          title="Retornos nas próximas 48h"
          sub="clientes voltando — ofereça a próxima viagem"
          voos={retornos48h}
        />
      </div>

      <div className="foot-note">
        <span>FlyTop OS · Prévia da Fase 1 · dados ilustrativos</span>
        <span>Elev · 2026</span>
      </div>
    </>
  );
}
