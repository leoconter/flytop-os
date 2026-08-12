import { VendorEvolutionChart } from "@/components/charts/vendor-evolution";
import { Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import { currentUser } from "@/lib/auth/session";
import type { Metric } from "@/lib/dashboard-data";
import { PARAM_FROM, PARAM_TO, formatRange, resolveRange } from "@/lib/date-range";
import { fmtMoney, fmtMoneyCompact } from "@/lib/meta/ads";
import { fmtInt } from "@/lib/meta/instagram";
import { getVendorView, listSellers } from "@/lib/monde/vendor";
import { SellerSwitch } from "./seller-switch";

export const metadata = { title: "FlyTop OS · Tela do Vendedor" };
export const dynamic = "force-dynamic";

const MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="note-box blue">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <div className="nt">{children}</div>
    </div>
  );
}

export default async function VendedorPage({
  searchParams,
}: {
  searchParams: Promise<{ [PARAM_FROM]?: string; [PARAM_TO]?: string; vendedor?: string }>;
}) {
  const params = await searchParams;
  // A tela é uma leitura de mês: sem período na URL, abre no mês corrente.
  const range = resolveRange(params, "mes");
  const user = await currentUser();
  if (!user) return null;

  const admin = user.role === "admin";
  // Só administrador escolhe de quem é a tela. Vendedor vê a própria, e
  // ignorar o parâmetro aqui é o que impede olhar a venda do colega pela URL.
  const sellerId = admin ? (params.vendedor ?? user.sellerId) : user.sellerId;
  const sellers = admin ? await listSellers() : null;

  if (!sellerId) {
    return (
      <>
        <PageHead title="Tela do Vendedor" sub="Sua performance no período" />
        <Aviso>
          {admin ? (
            <>
              Sua conta é de administrador e não está vinculada a um vendedor do
              Monde. Escolha um vendedor para visualizar, ou faça o vínculo em{" "}
              <b>Configurações · Usuários</b>.
            </>
          ) : (
            <>
              Sua conta ainda não está vinculada a um vendedor do Monde, então
              não há vendas para mostrar. Peça a um administrador para fazer o
              vínculo em <b>Configurações · Usuários</b>.
            </>
          )}
        </Aviso>
        {admin && sellers && sellers.length > 0 && (
          <div className="section">
            <div className="glass card">
              <SectionHead title="Escolher vendedor" sub="para ver a tela dele" flush />
              <div style={{ marginTop: 14 }}>
                <SellerSwitch sellers={sellers} atual="" />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const view = await getVendorView(sellerId, range);
  if (!view) {
    return (
      <>
        <PageHead title="Tela do Vendedor" sub="Sua performance no período" />
        <Aviso>O banco ainda não respondeu.</Aviso>
      </>
    );
  }

  const { kpis } = view;
  const mesLabel = `${MES[Number(range.until.slice(5, 7)) - 1]} de ${range.until.slice(0, 4)}`;
  const souEu = view.sellerId === user.sellerId;

  const metrics: Metric[] = [
    {
      label: souEu ? "% da sua meta" : "% da meta",
      value: kpis.goalPct !== null
        ? `${kpis.goalPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
        : "sem meta",
      small: kpis.goalPct === null,
      tone: kpis.goalPct !== null && kpis.goalPct >= 100 ? "green" : "blue",
      bar: kpis.goalPct !== null
        ? { pct: Math.min(100, kpis.goalPct), green: kpis.goalPct >= 100 }
        : undefined,
      hint: kpis.goal ? `meta: ${fmtMoney(kpis.goal)}` : "defina em Metas de Venda",
      privateValue: true,
      privateHint: true,
    },
    {
      label: "Valor de vendas",
      value: fmtMoneyCompact(kpis.revenue),
      hint: `faturamento em ${mesLabel}`,
      privateValue: true,
    },
    {
      label: "Nº de vendas",
      value: fmtInt(kpis.salesCount),
      hint: "no período",
    },
    {
      label: souEu ? "Seu ticket médio" : "Ticket médio",
      value: fmtMoney(kpis.avgTicket),
      hint: "por venda",
      privateValue: true,
    },
  ];

  return (
    <>
      <PageHead
        eyebrow={souEu ? "Sua performance" : "Performance do vendedor"}
        title={souEu ? `Olá, ${user.firstName}` : view.name}
        sub={
          <>
            {souEu ? "Veja como você está em " : "Resultado em "}
            <b>{formatRange(range)}</b>
          </>
        }
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {view.teamName && <Pill>Equipe: {view.teamName}</Pill>}
            {admin && sellers && <SellerSwitch sellers={sellers} atual={view.sellerId} />}
          </div>
        }
      />

      <Metrics metrics={metrics} />

      <div className="grid-2 split">
        <div className="glass chart-card">
          <SectionHead title="Evolução" sub={`acumulado em ${mesLabel}`} />
          <VendorEvolutionChart labels={view.evolution.labels} values={view.evolution.values} />
        </div>

        <div className="glass card">
          <SectionHead title="Ranking das equipes" sub="por faturamento no período" flush />
          {view.teams.length === 0 ? (
            <p className="metric-hint" style={{ marginTop: 14 }}>Sem vendas no período.</p>
          ) : (
            <div className="list" style={{ marginTop: 14 }}>
              {view.teams.map((t, i) => (
                <div className={`list-row${t.me ? " me" : ""}`} key={t.name}>
                  <span className={`rank${i === 0 ? " gold" : ""}`}>{i + 1}</span>
                  <div className="list-main">
                    <div className="list-name">{t.name}</div>
                    <div className="list-meta">{fmtInt(t.salesCount)} vendas</div>
                  </div>
                  <div className="list-value private">{fmtMoneyCompact(t.revenue)}</div>
                </div>
              ))}
            </div>
          )}
          {view.teams.length > 0 && !view.teamName && (
            <p className="metric-hint" style={{ marginTop: 16 }}>
              Este vendedor ainda não está em nenhuma equipe. Defina em{" "}
              <b>Configurações · Equipes</b>.
            </p>
          )}
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Vendas no período"
            sub={view.recent.length >= 8 ? "as 8 mais recentes" : `${view.recent.length} no período`}
            flush
          />
          {view.recent.length === 0 ? (
            <p className="metric-hint" style={{ marginTop: 14 }}>Nenhuma venda no período.</p>
          ) : (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Trecho</th>
                    <th>Companhia</th>
                    <th>Classe</th>
                    <th className="r">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {view.recent.map((s) => (
                    <tr key={s.saleId}>
                      <td className="mono-cell">
                        {s.date.slice(8, 10)}/{s.date.slice(5, 7)}
                      </td>
                      <td>{s.customer ?? <span className="muted">—</span>}</td>
                      <td className="mono-cell">{s.route ?? s.destination ?? "—"}</td>
                      <td>{s.airline ?? <span className="muted">—</span>}</td>
                      <td>{s.cabin ?? <span className="muted">—</span>}</td>
                      <td className="r private">{fmtMoney(s.value)}</td>
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
