import Link from "next/link";
import { Badge, Metrics, PageHead, SectionHead } from "@/components/dashboard/ui";
import {
  alertBank,
  alertMetrics,
  alertsByCompany,
  alertsByContinent,
  alertsByDestino,
  type CountItem,
} from "@/lib/alertas-data";

export const metadata = {
  title: "FlyTop OS · Dados de alertas",
};

function CountList({
  title,
  sub,
  items,
}: {
  title: string;
  sub: string;
  items: CountItem[];
}) {
  return (
    <div className="glass card">
      <SectionHead title={title} sub={sub} flush />
      <div className="list" style={{ marginTop: 14 }}>
        {items.map((item, i) => (
          <div className="list-row" key={item.name}>
            <span className="rank">{i + 1}</span>
            <div className="list-main">
              <div className="list-name">{item.name}</div>
            </div>
            <div className="list-value">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DadosAlertasPage() {
  return (
    <>
      <PageHead
        eyebrow="Alertas · banco de dados"
        title="Dados de alertas"
        sub="Total, por companhia, por destino e por continente"
        right={
          <Link href="/alertas" className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar para alertas
          </Link>
        }
      />

      <Metrics metrics={alertMetrics} />

      <div className="grid-2">
        <CountList title="Por companhia" sub="alertas enviados" items={alertsByCompany} />
        <CountList title="Por destino" sub="alertas enviados" items={alertsByDestino} />
        <CountList title="Por continente" sub="participação" items={alertsByContinent} />
      </div>

      {/* Histórico dos últimos 5 alertas enviados */}
      <div className="section">
        <div className="glass card">
          <SectionHead title="Últimos alertas enviados" sub="histórico recente" flush />
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
