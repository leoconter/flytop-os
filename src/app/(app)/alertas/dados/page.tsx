import Link from "next/link";
import { Badge, Metrics, PageHead, SectionHead } from "@/components/dashboard/ui";
import { money, percentOff } from "@/lib/alert-message";
import { type Contagem, estatisticas, listarAlertas } from "@/lib/alertas/store";
import type { Metric } from "@/lib/dashboard-data";
import { fmtInt } from "@/lib/meta/instagram";

export const metadata = {
  title: "FlyTop OS · Dados de alertas",
};

export const dynamic = "force-dynamic";

const quando = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function CountList({
  title,
  sub,
  items,
}: {
  title: string;
  sub: string;
  items: Contagem[];
}) {
  return (
    <div className="glass card">
      <SectionHead title={title} sub={sub} flush />
      {items.length === 0 ? (
        <p className="metric-hint" style={{ marginTop: 14 }}>
          Nada enviado ainda.
        </p>
      ) : (
        <div className="list" style={{ marginTop: 14 }}>
          {items.slice(0, 7).map((item, i) => (
            <div className="list-row" key={item.name}>
              <span className="rank">{i + 1}</span>
              <div className="list-main">
                <div className="list-name">{item.name}</div>
              </div>
              <div className="list-value">
                {fmtInt(item.count)} {item.count === 1 ? "alerta" : "alertas"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function DadosAlertasPage() {
  const listagem = await listarAlertas();
  const alertas = "alertas" in listagem ? listagem.alertas : [];
  const st = estatisticas(alertas);
  const enviados = alertas.filter((a) => a.enviadoEm).slice(0, 10);
  const topCompanhia = st.porCompanhia[0];

  const metrics: Metric[] = [
    { label: "Enviados hoje", value: fmtInt(st.enviadosHoje), hint: "marcados como enviados" },
    { label: "Enviados no mês", value: fmtInt(st.enviadosMes), hint: "no mês corrente" },
    { label: "Na fila", value: fmtInt(st.naFila), hint: "cadastrados, ainda não enviados" },
    {
      label: "Companhia mais alertada",
      value: topCompanhia?.name ?? "—",
      small: true,
      hint: topCompanhia
        ? `${fmtInt(topCompanhia.count)} ${topCompanhia.count === 1 ? "alerta" : "alertas"}`
        : "nenhum envio registrado",
    },
  ];

  return (
    <>
      <PageHead
        eyebrow="Alertas · banco de dados"
        title="Dados de alertas"
        sub="Contagem do que já foi enviado, por companhia, destino e cabine"
        right={
          <Link href="/alertas" className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar para alertas
          </Link>
        }
      />

      <Metrics metrics={metrics} />

      <div className="grid-2">
        <CountList title="Por companhia" sub="alertas enviados" items={st.porCompanhia} />
        <CountList title="Por destino" sub="alertas enviados" items={st.porDestino} />
        {/* Antes havia um corte por continente; o cadastro não pergunta o
            continente, então ele seria um palpite a partir do nome do destino. */}
        <CountList title="Por cabine" sub="alertas enviados" items={st.porCabine} />
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead title="Últimos alertas enviados" sub="histórico recente" flush />
          {enviados.length === 0 ? (
            <p className="metric-hint" style={{ marginTop: 14 }}>
              Nenhum alerta marcado como enviado até agora.
            </p>
          ) : (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Trecho</th>
                    <th>Companhia</th>
                    <th>Cabine</th>
                    <th className="r">Preço</th>
                    <th className="r">% OFF</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enviados.map((a) => (
                    <tr key={a.id}>
                      <td className="muted">{quando.format(new Date(a.enviadoEm!))}</td>
                      <td>
                        {a.fields.origem} → {a.fields.destino}
                      </td>
                      <td>{a.fields.companhia || <span className="muted">—</span>}</td>
                      <td>{a.fields.cabine || <span className="muted">—</span>}</td>
                      <td className="r private">{money(a.fields.por)}</td>
                      <td className="r">{percentOff(a.fields.de, a.fields.por)}</td>
                      <td>
                        <Badge tone="green">Enviado</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
