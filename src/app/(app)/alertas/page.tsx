import { AlertBuilder } from "@/components/alertas/alert-builder";
import { Badge, Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import { alertBank, alertMetrics } from "@/lib/alertas-data";

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
        right={<Pill>4 alertas hoje</Pill>}
      />

      <Metrics metrics={alertMetrics} />

      <AlertBuilder />

      {/* Banco de alertas */}
      <div className="section">
        <div className="glass card">
          <SectionHead title="Banco de alertas" sub="histórico recente" flush />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Trecho</th>
                  <th>Companhia</th>
                  <th>Cabine</th>
                  <th className="r">Preço</th>
                  <th className="r">Grupos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alertBank.map((row) => (
                  <tr key={`${row.when}-${row.route}`}>
                    <td className="muted">{row.when}</td>
                    <td className="mono-cell">{row.route}</td>
                    <td>{row.company}</td>
                    <td>{row.cabin}</td>
                    <td className="r">{row.price}</td>
                    <td className="r">{row.groups}</td>
                    <td>
                      <Badge tone={row.status === "Enviado" ? "green" : "orange"}>
                        {row.status}
                      </Badge>
                    </td>
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
