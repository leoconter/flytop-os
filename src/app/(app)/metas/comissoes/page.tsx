import Link from "next/link";
import { Metrics, PageHead, SectionHead } from "@/components/dashboard/ui";
import { MetasTabs } from "@/components/metas/tabs";
import { conferirFaixas } from "@/lib/comissao-regra";
import type { Metric } from "@/lib/dashboard-data";
import { fmtMoney } from "@/lib/meta/ads";
import { getComissoes } from "@/lib/monde/comissoes";
import { FaixasGrid } from "./faixas-grid";

export const metadata = { title: "FlyTop OS · Comissões" };
export const dynamic = "force-dynamic";

const MES_LONGO = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Mês corrente em São Paulo, "YYYY-MM". */
function mesCorrente(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

function vizinho(mes: string, passo: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, m - 1 + passo, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function rotulo(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${MES_LONGO[m - 1]} ${ano}`;
}

function pct(taxa: number): string {
  return `${(taxa * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const pedido = (await searchParams).mes;
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido ?? "") ? pedido! : mesCorrente();

  const data = await getComissoes(mes);

  if (!data) {
    return (
      <>
        <PageHead title="Comissões" sub="Faixa pelo faturamento, percentual sobre a margem" />
        <MetasTabs />
        <div className="note-box blue">
          <div className="nt">
            O banco não respondeu. Se a migração{" "}
            <b>20260817000003_comissoes.sql</b> ainda não foi aplicada, rode-a no Supabase.
          </div>
        </div>
      </>
    );
  }

  const avisos = conferirFaixas(data.faixas);

  const metrics: Metric[] = [
    {
      label: "Faturamento no mês",
      value: fmtMoney(data.totalFaturamento),
      hint: `${data.linhas.length} vendedores`,
      privateValue: true,
      info: "Soma do valor final das vendas do mês, por vendedor. É o que define a faixa de cada um.",
    },
    {
      label: "Margem no mês",
      value: fmtMoney(data.totalMargem),
      tone: "blue",
      hint: "base do cálculo",
      privateValue: true,
      info: "O que sobra para a agência. O percentual da faixa incide sobre este valor, não sobre o faturamento.",
    },
    {
      label: "Comissão a pagar",
      value: fmtMoney(data.totalComissao),
      tone: "green",
      hint: data.totalMargem > 0
        ? `${((data.totalComissao / data.totalMargem) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da margem`
        : undefined,
      privateValue: true,
      info: "Soma das comissões de todos os vendedores no mês.",
    },
  ];

  return (
    <>
      <PageHead
        title="Comissões"
        sub="A faixa vem do faturamento; o percentual incide sobre a margem"
        right={
          <span className="year-nav">
            <Link className="btn btn-ghost btn-sm" href={`/metas/comissoes?mes=${vizinho(mes, -1)}`} aria-label="Mês anterior">
              ‹
            </Link>
            <b>{rotulo(mes)}</b>
            <Link className="btn btn-ghost btn-sm" href={`/metas/comissoes?mes=${vizinho(mes, 1)}`} aria-label="Próximo mês">
              ›
            </Link>
          </span>
        }
      />

      <MetasTabs />

      <Metrics metrics={metrics} />

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Faixas de comissão"
            sub="valem para todos os vendedores, em qualquer mês"
            flush
          />
          <p className="metric-hint" style={{ marginTop: 10 }}>
            O vendedor entra na faixa pelo <b>faturamento</b> do mês, e o percentual
            é aplicado sobre a <b>margem</b>. Quem faturou {fmtMoney(436316)} com{" "}
            {fmtMoney(40821)} de margem cai na faixa de 6% e recebe {fmtMoney(2449)}.
          </p>

          {avisos.length > 0 && (
            <div className="note-box amber" style={{ marginTop: 12 }}>
              <div className="nt">
                {avisos.map((a) => (
                  <div key={a}>{a}</div>
                ))}
              </div>
            </div>
          )}

          <FaixasGrid faixas={data.faixas} />
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead
            title={`Comissão por vendedor · ${rotulo(mes)}`}
            sub="calculada sobre o que já está lançado no Monde"
            flush
            right={
              data.semFaixa > 0 ? (
                // `badge orange` e não `Pill`: a Pill só tem verde e azul, e
                // faturamento sem faixa precisa parecer pendência, não status.
                <span className="badge orange">{fmtMoney(data.semFaixa)} sem faixa</span>
              ) : undefined
            }
          />
          {data.linhas.length === 0 ? (
            <p className="metric-hint" style={{ marginTop: 14 }}>
              Nenhuma venda lançada em {rotulo(mes)}.
            </p>
          ) : (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th className="r">Faturamento</th>
                    <th className="r" style={{ width: 92 }}>Faixa</th>
                    <th className="r">Margem</th>
                    <th className="r">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {data.linhas.map((l) => (
                    <tr key={l.vendedor}>
                      <td>{l.vendedor}</td>
                      <td className="r private">{fmtMoney(l.faturamento)}</td>
                      <td className="r">
                        {l.faixa ? (
                          <b>{pct(l.faixa.taxa)}</b>
                        ) : (
                          <span className="badge orange" title="Nenhuma faixa cobre este faturamento">
                            sem faixa
                          </span>
                        )}
                      </td>
                      <td className="r private">{fmtMoney(l.margem)}</td>
                      <td className="r private">
                        <b>{fmtMoney(l.comissao)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>
                      <b>Total</b>
                    </td>
                    <td className="r private">{fmtMoney(data.totalFaturamento)}</td>
                    <td />
                    <td className="r private">{fmtMoney(data.totalMargem)}</td>
                    <td className="r private">
                      <b>{fmtMoney(data.totalComissao)}</b>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
