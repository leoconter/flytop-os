import Link from "next/link";
import { MovimentoChart } from "@/components/comunidade/movimento-chart";
import { Badge, Metrics, PageHead, SectionHead } from "@/components/dashboard/ui";
import type { Metric } from "@/lib/dashboard-data";
import { fmtInt } from "@/lib/meta/instagram";
import {
  listarComunidades,
  movimentoPorDia,
  resumoPessoas,
} from "@/lib/whatsapp/comunidade";

export const metadata = { title: "FlyTop OS · Comunidade" };

// A movimentação chega o dia inteiro pelo webhook: servir número cacheado aqui
// mostraria um total que já mudou.
export const dynamic = "force-dynamic";

export default async function ComunidadePage() {
  const [comunidades, movimento, resumo] = await Promise.all([
    listarComunidades(),
    movimentoPorDia(14),
    resumoPessoas(),
  ]);

  if (typeof comunidades === "string") {
    return (
      <>
        <PageHead eyebrow="Crescimento" title="Controle da Comunidade" sub="Entradas, saídas e membros" />
        <div className="note-box blue">
          <div className="nt">
            {comunidades === "sem-tabela"
              ? "As tabelas do WhatsApp ainda não existem. Rode as migrações no Supabase."
              : "O banco não respondeu."}
          </div>
        </div>
      </>
    );
  }

  const membros = comunidades.reduce((s, c) => s + c.membros, 0);
  const entradas = comunidades.reduce((s, c) => s + c.entradas, 0);
  const saidas = comunidades.reduce((s, c) => s + c.saidas, 0);
  const hoje = movimento[movimento.length - 1];

  const metrics: Metric[] = [
    {
      label: "Membros agora",
      value: fmtInt(membros),
      hint: `${comunidades.length} comunidades`,
      info: "Soma de quem está dentro de cada comunidade, segundo o que o webhook registrou. Quem está em duas comunidades conta duas vezes aqui — para pessoas distintas, veja a lista.",
    },
    {
      label: "Pessoas distintas",
      value: fmtInt(resumo?.pessoas ?? 0),
      tone: "blue",
      hint: `${fmtInt(resumo?.dentro ?? 0)} dentro · ${fmtInt(resumo?.fora ?? 0)} fora`,
      info: "Cada pessoa uma vez, mesmo que participe de várias comunidades.",
    },
    {
      label: "Entradas registradas",
      value: fmtInt(entradas),
      tone: "green",
      hint: hoje ? `${fmtInt(hoje.entradas)} hoje` : "desde 14/08",
      info: "Cada entrada é um evento. Quem entrou, saiu e voltou conta três eventos — dois de entrada e um de saída.",
    },
    {
      label: "Saídas registradas",
      value: fmtInt(saidas),
      tone: saidas > entradas ? "red" : undefined,
      hint: hoje ? `${fmtInt(hoje.saidas)} hoje` : "desde 14/08",
      info: "Cada saída é um evento separado da entrada — é assim que dá para ver a movimentação real, e não só o saldo.",
    },
  ];

  return (
    <>
      <PageHead
        eyebrow="Crescimento"
        title="Controle da Comunidade"
        sub={
          <>
            Movimentação registrada pelo webhook · <b>{comunidades.length} comunidades</b>
          </>
        }
        right={
          <Link href="/comunidade/pessoas" className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            Quem já passou
          </Link>
        }
      />

      <Metrics metrics={metrics} />

      <div className="section">
        <div className="glass chart-card">
          <SectionHead title="Entradas e saídas" sub="por dia, todas as comunidades" />
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-line ll-green" />
              Entradas
            </span>
            <span className="legend-item">
              <span className="legend-line ll-red" />
              Saídas
            </span>
          </div>
          {movimento.length === 0 ? (
            <p className="metric-hint" style={{ marginTop: 14 }}>
              Nenhuma movimentação registrada ainda.
            </p>
          ) : (
            <MovimentoChart dados={movimento} />
          )}
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Por comunidade"
            sub={`${fmtInt(membros)} membros · entradas e saídas desde que o webhook está ligado`}
            flush
          />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Comunidade</th>
                  <th style={{ width: 70 }}>Praça</th>
                  <th className="r">Membros</th>
                  <th className="r">Entradas</th>
                  <th className="r">Saídas</th>
                  <th className="r">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {comunidades.map((c) => {
                  const saldo = c.entradas - c.saidas;
                  return (
                    <tr key={c.groupId}>
                      <td>
                        {c.etiqueta}
                        {c.numero === null && (
                          <span className="badge gray" style={{ marginLeft: 8 }}>
                            sem número
                          </span>
                        )}
                      </td>
                      <td>
                        {c.praca ? (
                          <Badge tone={c.praca === "RJ" ? "orange" : "blue"}>{c.praca}</Badge>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="r">{fmtInt(c.membros)}</td>
                      <td className="r">{c.entradas ? fmtInt(c.entradas) : <span className="muted">—</span>}</td>
                      <td className="r">{c.saidas ? fmtInt(c.saidas) : <span className="muted">—</span>}</td>
                      <td className="r">
                        {c.entradas || c.saidas ? (
                          <b className={saldo < 0 ? "neg" : saldo > 0 ? "pos" : undefined}>
                            {saldo > 0 ? "+" : ""}
                            {fmtInt(saldo)}
                          </b>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
