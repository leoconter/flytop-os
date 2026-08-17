import Link from "next/link";
import { Badge, Metrics, PageHead, SectionHead } from "@/components/dashboard/ui";
import { money, percentOff } from "@/lib/alert-message";
import {
  contagens,
  type Contagem,
  enviadosNoPeriodo,
  listarAlertas,
} from "@/lib/alertas/store";
import type { Metric } from "@/lib/dashboard-data";
import { formatRange, PARAM_FROM, PARAM_TO, resolveRange } from "@/lib/date-range";
import { fmtInt } from "@/lib/meta/instagram";
import { CompanhiaNome } from "@/components/companhia-logo";

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
  comLogo = false,
}: {
  title: string;
  sub: string;
  items: Contagem[];
  comLogo?: boolean;
}) {
  return (
    <div className="glass card">
      <SectionHead title={title} sub={sub} flush />
      {items.length === 0 ? (
        <p className="metric-hint" style={{ marginTop: 14 }}>
          Nada enviado no período.
        </p>
      ) : (
        <div className="list" style={{ marginTop: 14 }}>
          {items.slice(0, 7).map((item, i) => (
            <div className="list-row" key={item.name}>
              <span className="rank">{i + 1}</span>
              <div className="list-main">
                <div className="list-name">
                  {comLogo ? <CompanhiaNome nome={item.name} /> : item.name}
                </div>
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

export default async function DadosAlertasPage({
  searchParams,
}: {
  searchParams: Promise<{ [PARAM_FROM]?: string; [PARAM_TO]?: string }>;
}) {
  const range = resolveRange(await searchParams);
  const listagem = await listarAlertas();
  const alertas = "alertas" in listagem ? listagem.alertas : [];

  // A fila é estado de agora, não do período: um alerta parado há um mês
  // continua parado, escolha-se o intervalo que for.
  const naFila = alertas.filter((a) => !a.enviadoEm).length;
  const enviados = enviadosNoPeriodo(alertas, range);
  const { porCompanhia, porDestino, porCabine } = contagens(enviados);

  const rotulo = formatRange(range);
  const primeiro = (c: Contagem[]) => c[0];
  const contagem = (c?: Contagem) =>
    c ? `${fmtInt(c.count)} ${c.count === 1 ? "alerta" : "alertas"}` : "nada enviado no período";

  const metrics: Metric[] = [
    { label: "Enviados no período", value: fmtInt(enviados.length), hint: rotulo },
    {
      label: "Companhia mais alertada",
      value: primeiro(porCompanhia)?.name ?? "—",
      small: true,
      hint: contagem(primeiro(porCompanhia)),
    },
    {
      label: "Destino mais alertado",
      value: primeiro(porDestino)?.name ?? "—",
      small: true,
      hint: contagem(primeiro(porDestino)),
    },
    {
      label: "Na fila",
      value: fmtInt(naFila),
      hint: "cadastrados, ainda não enviados",
    },
  ];

  return (
    <>
      <PageHead
        eyebrow="Alertas · banco de dados"
        title="Dados de alertas"
        sub={`O que foi enviado entre ${rotulo}, por companhia, destino e cabine`}
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
        <CountList title="Por companhia" sub="alertas enviados" items={porCompanhia} comLogo />
        <CountList title="Por destino" sub="alertas enviados" items={porDestino} />
        {/* Antes havia um corte por continente; o cadastro não pergunta o
            continente, então ele seria um palpite a partir do nome do destino. */}
        <CountList title="Por cabine" sub="alertas enviados" items={porCabine} />
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead title="Alertas enviados" sub="do mais recente ao mais antigo" flush />
          {enviados.length === 0 ? (
            <p className="metric-hint" style={{ marginTop: 14 }}>
              Nenhum alerta marcado como enviado entre {rotulo}.
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
                  {enviados.slice(0, 50).map((a) => (
                    <tr key={a.id}>
                      <td className="muted">{quando.format(new Date(a.enviadoEm!))}</td>
                      <td>
                        {a.fields.origem} → {a.fields.destino}
                      </td>
                      <td>
                        <CompanhiaNome nome={a.fields.companhia} />
                      </td>
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
