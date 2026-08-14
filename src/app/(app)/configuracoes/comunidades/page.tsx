import { PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { guardAdmin } from "@/lib/auth/session";
import { listarGrupos, repetidos } from "@/lib/whatsapp/grupos";
import { aceitarSugestoes, alternarAtivo, salvarGrupo } from "./actions";

export const metadata = { title: "FlyTop OS · Comunidades" };
export const dynamic = "force-dynamic";

const PRACAS = ["SP", "RJ"];

/** "agora", "hoje" ou a data — o suficiente para saber se foi você que salvou. */
function quando(iso: string | null): string {
  if (!iso) return "";
  const minutos = (Date.now() - new Date(iso).getTime()) / 60000;
  if (minutos < 2) return "agora";
  if (minutos < 60) return `há ${Math.round(minutos)} min`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export default async function ComunidadesPage() {
  await guardAdmin();

  const r = await listarGrupos();

  if ("erro" in r) {
    return (
      <>
        <PageHead title="Comunidades" sub="Quem é quem nos grupos de WhatsApp" />
        <div className="note-box blue">
          <div className="nt">
            {r.erro === "sem-tabela" ? (
              <>
                As tabelas do WhatsApp ainda não existem. Rode{" "}
                <b>20260813000005_whatsapp_grupos.sql</b> e as migrações de 14/08 no Supabase.
              </>
            ) : (
              <>O banco não respondeu. Confira as credenciais do Supabase.</>
            )}
          </div>
        </div>
      </>
    );
  }

  const { grupos } = r;
  const duplicados = repetidos(grupos);
  const semNumero = grupos.filter((g) => g.numero == null);
  const aSugerir = grupos.filter((g) => !g.confirmado && g.sugestao.numero != null);
  const totalMembros = grupos.reduce((a, g) => a + (g.ativo ? g.membros : 0), 0);

  return (
    <>
      <PageHead
        title="Comunidades"
        sub="O WhatsApp identifica o grupo por um código; aqui ele ganha o número que a operação usa"
        right={
          <>
            <Pill tone="blue">{grupos.length} grupos</Pill>
            <Pill tone="green">{totalMembros.toLocaleString("pt-BR")} membros</Pill>
          </>
        }
      />

      {(semNumero.length > 0 || duplicados.size > 0) && (
        <div className="section">
          <div className="note-box amber">
            <div className="nt">
              {semNumero.length > 0 && (
                <>
                  <b>{semNumero.length}</b>{" "}
                  {semNumero.length === 1 ? "grupo não diz" : "grupos não dizem"} de que
                  comunidade {semNumero.length === 1 ? "é" : "são"} — o nome no WhatsApp não
                  tem número. Precisa de alguém que saiba.
                </>
              )}
              {semNumero.length > 0 && duplicados.size > 0 && <br />}
              {duplicados.size > 0 && (
                <>
                  <b>{[...duplicados].join(", ")}</b>{" "}
                  {duplicados.size === 1 ? "está" : "estão"} em mais de um grupo. Um dos dois
                  está com o número errado.
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {aSugerir.length > 0 && (
        <div className="section">
          <div className="glass card">
            <SectionHead
              title="Identificação automática"
              sub={`${aSugerir.length} ${aSugerir.length === 1 ? "grupo tem" : "grupos têm"} número no próprio nome`}
              flush
            />
            <p className="metric-hint" style={{ marginTop: 10 }}>
              Aplica o que está no nome do grupo — “Oportunidades FlyTop #33” vira SP #33.
              O que já foi salvo à mão não é tocado.
            </p>
            <FormAcao action={aceitarSugestoes} style={{ marginTop: 14 }}>
              <BotaoAcao enviando="Aplicando…">
                Aplicar aos {aSugerir.length} grupos
              </BotaoAcao>
            </FormAcao>
          </div>
        </div>
      )}

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Grupos"
            sub="número e praça identificam a comunidade; o apelido tem prioridade sobre os dois"
            flush
          />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Grupo no WhatsApp</th>
                  <th className="r" style={{ width: 96 }}>Membros</th>
                  {/* Número, praça e apelido vivem dentro de um formulário só,
                      então dividi-los em colunas do cabeçalho desalinharia os
                      campos. Um rótulo para os três. */}
                  <th style={{ width: 430 }}>Identificação da comunidade</th>
                  <th style={{ width: 110 }} />
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => {
                  const chave = `${g.praca ?? ""}#${g.numero}`;
                  const conflito = g.numero != null && duplicados.has(chave);
                  return (
                    <tr key={g.groupId} style={g.ativo ? undefined : { opacity: 0.55 }}>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {g.name ?? <span className="metric-hint">sem nome no WhatsApp</span>}
                        </div>
                        <div className="metric-hint" style={{ fontSize: 11 }}>
                          {g.groupId}
                          {/* O formulário remonta ao salvar (a `key` muda junto
                              com os valores) e leva o recado de sucesso embora.
                              Este selo fica: é o que confirma que gravou. */}
                          {g.confirmado ? ` · conferido ${quando(g.confirmadoEm)}` : " · não conferido"}
                          {g.eventos > 0 && ` · ${g.eventos} eventos`}
                        </div>
                      </td>
                      <td className="r">{g.membros.toLocaleString("pt-BR")}</td>
                      <td style={{ padding: 0 }}>
                        <FormAcao
                          key={`${g.groupId}|${g.numero}|${g.praca}|${g.apelido}`}
                          action={salvarGrupo}
                          exigeMudanca
                          className="row-form"
                          style={{ padding: "8px 10px", gap: 8 }}
                        >
                          <input type="hidden" name="groupId" value={g.groupId} />
                          <input
                            className="input"
                            name="numero"
                            defaultValue={g.numero ?? ""}
                            inputMode="numeric"
                            placeholder={g.sugestao.numero != null ? `${g.sugestao.numero}?` : "—"}
                            aria-label={`Número da comunidade de ${g.name ?? g.groupId}`}
                            style={{
                              width: 72,
                              ...(conflito ? { borderColor: "var(--amber, #b45309)" } : {}),
                            }}
                          />
                          <select
                            className="select"
                            name="praca"
                            defaultValue={g.praca ?? ""}
                            aria-label={`Praça de ${g.name ?? g.groupId}`}
                            style={{ width: 88 }}
                          >
                            <option value="">—</option>
                            {PRACAS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <input
                            className="input"
                            name="apelido"
                            defaultValue={g.apelido ?? ""}
                            placeholder="opcional"
                            aria-label={`Apelido de ${g.name ?? g.groupId}`}
                            style={{ width: 168 }}
                          />
                          <BotaoAcao className="btn btn-ghost btn-sm">Salvar</BotaoAcao>
                        </FormAcao>
                      </td>
                      <td>
                        <FormAcao action={alternarAtivo}>
                          <input type="hidden" name="groupId" value={g.groupId} />
                          <input type="hidden" name="ativo" value={g.ativo ? "1" : "0"} />
                          <BotaoAcao
                            className={`btn btn-ghost btn-sm${g.ativo ? " danger" : ""}`}
                            enviando="…"
                            title={
                              g.ativo
                                ? "Some das telas; o histórico continua no banco"
                                : "Volta a aparecer nas telas"
                            }
                          >
                            {g.ativo ? "Desativar" : "Reativar"}
                          </BotaoAcao>
                        </FormAcao>
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
