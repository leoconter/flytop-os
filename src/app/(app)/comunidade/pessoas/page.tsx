import Link from "next/link";
import { Badge, Metrics, PageHead, SectionHead } from "@/components/dashboard/ui";
import type { Metric } from "@/lib/dashboard-data";
import { fmtInt } from "@/lib/meta/instagram";
import { listarPessoas, resumoPessoas } from "@/lib/whatsapp/comunidade";
import { FiltroPessoas } from "./filtros";

export const metadata = { title: "FlyTop OS · Quem já passou" };
export const dynamic = "force-dynamic";

function quando(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function PessoasPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string; pagina?: string }>;
}) {
  const p = await searchParams;
  const status = p.status === "dentro" || p.status === "fora" ? p.status : undefined;
  const pagina = Number(p.pagina) > 0 ? Number(p.pagina) : 1;

  const [r, resumo] = await Promise.all([
    listarPessoas({ busca: p.busca, status, pagina, porPagina: 50 }),
    resumoPessoas(),
  ]);

  if (typeof r === "string") {
    return (
      <>
        <PageHead eyebrow="Comunidade" title="Quem já passou" sub="Uma linha por pessoa" />
        <div className="note-box blue">
          <div className="nt">O banco não respondeu.</div>
        </div>
      </>
    );
  }

  const metrics: Metric[] = [
    {
      label: "Pessoas distintas",
      value: fmtInt(resumo?.pessoas ?? 0),
      hint: "já passaram pelas comunidades",
      info: "Cada pessoa uma vez, mesmo participando de várias comunidades.",
    },
    {
      label: "Dentro agora",
      value: fmtInt(resumo?.dentro ?? 0),
      tone: "green",
      hint: "em ao menos uma comunidade",
    },
    {
      label: "Já saíram",
      value: fmtInt(resumo?.fora ?? 0),
      tone: "red",
      hint: "fora de todas",
      info: "Passaram pelas comunidades e hoje não estão em nenhuma.",
    },
    {
      label: "Com telefone",
      value: fmtInt(resumo?.comTelefone ?? 0),
      tone: "blue",
      hint: "dá para cruzar com o cliente",
      info: "O WhatsApp só revela o número em parte dos avisos; o resto fica identificado pelo LID.",
    },
  ];

  const query = (mudanca: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const atual = { busca: p.busca, status, pagina, ...mudanca };
    for (const [k, v] of Object.entries(atual)) {
      if (v !== undefined && v !== "" && !(k === "pagina" && v === 1)) q.set(k, String(v));
    }
    const s = q.toString();
    return s ? `/comunidade/pessoas?${s}` : "/comunidade/pessoas";
  };

  return (
    <>
      <PageHead
        eyebrow="Comunidade"
        title="Quem já passou"
        sub="Uma linha por pessoa, com o estado de agora"
        right={
          <Link href="/comunidade" className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
        }
      />

      <Metrics metrics={metrics} />

      <div className="section">
        <div className="glass card">
          <SectionHead
            title={`${fmtInt(r.total)} ${r.total === 1 ? "pessoa" : "pessoas"}`}
            sub={r.paginas > 1 ? `página ${r.pagina} de ${fmtInt(r.paginas)}` : "todas nesta página"}
            flush
          />

          <FiltroPessoas busca={p.busca ?? ""} status={status} />

          {r.pessoas.length === 0 ? (
            <p className="metric-hint" style={{ marginTop: 14 }}>
              Ninguém encontrado com esse filtro.
            </p>
          ) : (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th style={{ width: 92 }}>Status</th>
                    <th className="r" style={{ width: 120 }}>Comunidades</th>
                    <th className="r" style={{ width: 88 }}>Entradas</th>
                    <th className="r" style={{ width: 78 }}>Saídas</th>
                    <th style={{ width: 130 }}>Última mexida</th>
                  </tr>
                </thead>
                <tbody>
                  {r.pessoas.map((x) => (
                    <tr key={x.chave}>
                      <td>
                        {x.nome ? (
                          <div style={{ fontWeight: 500 }}>{x.nome}</div>
                        ) : null}
                        <div className={x.nome ? "metric-hint" : undefined} style={{ fontSize: x.nome ? 11.5 : undefined }}>
                          {x.telefone ? (
                            <span className="mono-cell">{x.telefone}</span>
                          ) : (
                            <span className="muted" title="O WhatsApp não revelou o número desta pessoa">
                              sem telefone
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge tone={x.status === "dentro" ? "green" : "gray"}>
                          {x.status}
                        </Badge>
                      </td>
                      <td className="r">
                        {x.comunidadesDentro}
                        {x.comunidadesJaPassou !== x.comunidadesDentro && (
                          <span className="muted"> de {x.comunidadesJaPassou}</span>
                        )}
                      </td>
                      <td className="r">{x.entradas || <span className="muted">—</span>}</td>
                      <td className="r">{x.saidas || <span className="muted">—</span>}</td>
                      <td className="metric-hint" style={{ fontSize: 12 }}>
                        {x.soDaCarga ? (
                          <span className="muted" title="Estava no grupo quando o sistema começou a observar">
                            já estava lá
                          </span>
                        ) : (
                          quando(x.ultimaMovimentacao)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {r.paginas > 1 && (
            <div className="acoes" style={{ marginTop: 14, justifyContent: "space-between" }}>
              {r.pagina > 1 ? (
                <Link className="btn btn-ghost btn-sm" href={query({ pagina: r.pagina - 1 })}>
                  ‹ anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="metric-hint">
                {r.pagina} / {fmtInt(r.paginas)}
              </span>
              {r.pagina < r.paginas ? (
                <Link className="btn btn-ghost btn-sm" href={query({ pagina: r.pagina + 1 })}>
                  próxima ›
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
