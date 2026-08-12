import Link from "next/link";
import { PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import { fmtInt } from "@/lib/meta/instagram";
import { contarTudo, lerTabela, listarTabelas, SENSIVEIS } from "@/lib/monde/db-browser";

export const metadata = { title: "FlyTop OS · Monde & Sincronização" };
export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

/** Um valor de célula legível: jsonb vira texto curto, nulo vira trace. */
function celula(v: unknown): { texto: string; vazio: boolean; longo: boolean } {
  if (v === null || v === undefined) return { texto: "—", vazio: true, longo: false };
  if (typeof v === "boolean") return { texto: v ? "sim" : "não", vazio: false, longo: false };
  if (typeof v === "object") {
    const t = JSON.stringify(v);
    return { texto: t, vazio: false, longo: true };
  }
  const t = String(v);
  return { texto: t, vazio: t === "", longo: t.length > 60 };
}

export default async function MondePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; p?: string; ord?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const tabelas = await listarTabelas();

  if (!tabelas) {
    return (
      <>
        <PageHead title="Monde & Sincronização" sub="Dados como estão no banco" />
        <div className="note-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="nt">O banco ainda não respondeu.</div>
        </div>
      </>
    );
  }

  const contagens = await contarTudo(tabelas);
  const escolhida = tabelas.find((t) => t.nome === params.t)?.nome ?? "monde_sales";
  const pagina = Math.max(0, Number(params.p ?? 0) || 0);
  const ordem = params.ord;
  const desc = params.dir !== "asc";

  const dados = await lerTabela(escolhida, { pagina, porPagina: POR_PAGINA, ordem, desc });
  const meta = tabelas.find((t) => t.nome === escolhida)!;
  const total = dados?.total ?? null;
  const ultimaPagina = total === null ? pagina : Math.max(0, Math.ceil(total / POR_PAGINA) - 1);

  const link = (p: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    q.set("t", escolhida);
    if (pagina) q.set("p", String(pagina));
    if (ordem) q.set("ord", ordem);
    if (params.dir) q.set("dir", params.dir);
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined) q.delete(k);
      else q.set(k, String(v));
    }
    return `/monde?${q.toString()}`;
  };

  const tabelasReais = tabelas.filter((t) => !t.view);
  const views = tabelas.filter((t) => t.view);

  return (
    <>
      <PageHead
        title="Monde & Sincronização"
        sub="Os dados como estão no banco, do mesmo jeito que o Supabase mostra"
        right={<Pill tone="blue">{tabelas.length} tabelas e views</Pill>}
      />

      <div className="db-layout">
        <aside className="glass card db-lista">
          <div className="db-grupo">Tabelas</div>
          {tabelasReais.map((t) => (
            <Link
              key={t.nome}
              href={`/monde?t=${t.nome}`}
              className={`db-item${t.nome === escolhida ? " on" : ""}`}
            >
              <span className="nm">{t.nome}</span>
              <span className="qt">{fmtInt(contagens.get(t.nome) ?? 0)}</span>
            </Link>
          ))}

          <div className="db-grupo">Views</div>
          {views.map((t) => (
            <Link
              key={t.nome}
              href={`/monde?t=${t.nome}`}
              className={`db-item${t.nome === escolhida ? " on" : ""}`}
            >
              <span className="nm">{t.nome}</span>
              <span className="qt">{fmtInt(contagens.get(t.nome) ?? 0)}</span>
            </Link>
          ))}
        </aside>

        <section className="glass card db-conteudo">
          <SectionHead
            title={escolhida}
            sub={
              total !== null
                ? `${fmtInt(total)} linhas · ${meta.colunas.length} colunas`
                : `${meta.colunas.length} colunas`
            }
            flush
          />

          {meta.nota && <p className="db-nota">{meta.nota}</p>}

          {SENSIVEIS.has(escolhida) && (
            <div className="note-box orange" style={{ marginTop: 10 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              <div className="nt">
                Esta tabela guarda o payload cru do ERP, com <b>CPF, passaporte e
                endereço</b>. É o único lugar da plataforma onde esses documentos
                existem.
              </div>
            </div>
          )}

          {!dados || dados.linhas.length === 0 ? (
            <p className="metric-hint" style={{ marginTop: 14 }}>
              {dados ? "Sem linhas nesta página." : "Não foi possível ler esta tabela."}
            </p>
          ) : (
            <>
              <div className="table-wrap db-grade" style={{ marginTop: 10 }}>
                <table>
                  <thead>
                    <tr>
                      {dados.colunas.map((c) => {
                        const ativa = ordem === c;
                        return (
                          <th key={c}>
                            <Link
                              href={link({
                                ord: c,
                                dir: ativa && desc ? "asc" : "desc",
                                p: 0,
                              })}
                              className={`db-ord${ativa ? " on" : ""}`}
                              title={meta.colunas.find((x) => x.nome === c)?.tipo}
                            >
                              {c}
                              {ativa && <span className="seta">{desc ? "↓" : "↑"}</span>}
                            </Link>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.linhas.map((linha, i) => (
                      <tr key={i}>
                        {dados.colunas.map((c) => {
                          const v = celula(linha[c]);
                          return (
                            <td key={c} className={v.vazio ? "muted" : undefined}>
                              <span
                                className={`db-valor${v.longo ? " longo" : ""}`}
                                title={v.longo ? v.texto : undefined}
                              >
                                {v.texto}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="db-paginacao">
                <span className="metric-hint">
                  {total !== null
                    ? `${fmtInt(pagina * POR_PAGINA + 1)}–${fmtInt(pagina * POR_PAGINA + dados.linhas.length)} de ${fmtInt(total)}`
                    : `${dados.linhas.length} linhas`}
                </span>
                <span className="db-botoes">
                  <Link
                    className={`btn btn-ghost btn-sm${pagina === 0 ? " inerte" : ""}`}
                    href={link({ p: Math.max(0, pagina - 1) })}
                    aria-disabled={pagina === 0}
                  >
                    ‹ Anterior
                  </Link>
                  <Link
                    className={`btn btn-ghost btn-sm${pagina >= ultimaPagina ? " inerte" : ""}`}
                    href={link({ p: Math.min(ultimaPagina, pagina + 1) })}
                    aria-disabled={pagina >= ultimaPagina}
                  >
                    Próxima ›
                  </Link>
                </span>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
