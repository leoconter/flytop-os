import { PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { getTeams } from "@/lib/monde/teams";
import { criarEquipe, removerEquipe, renomearEquipe, salvarIntegrantes } from "./actions";
import { guardAdmin } from "@/lib/auth/session";

export const metadata = { title: "FlyTop OS · Equipes" };
export const dynamic = "force-dynamic";

export default async function EquipesPage() {
  // A guarda saiu do layout: Configurações agora tem aba para todo mundo.
  await guardAdmin();

  const data = await getTeams();

  if (!data) {
    return (
      <>
        <PageHead title="Equipes" sub="Como os vendedores se organizam" />
        <div className="note-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="nt">
            O banco ainda não respondeu. Se a migração ainda não foi aplicada,
            rode <b>20260812000001_users_and_teams.sql</b> no Supabase.
          </div>
        </div>
      </>
    );
  }

  const todos = [...data.teams.flatMap((t) => t.members.map((m) => ({ ...m, teamId: t.id }))),
                 ...data.semEquipe.map((m) => ({ ...m, teamId: "" }))]
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <>
      <PageHead
        title="Equipes"
        sub="O Monde não tem esse conceito — a organização é definida aqui"
        right={<Pill tone="blue">{data.teams.length} equipes</Pill>}
      />

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Integrantes"
            sub={`${todos.length} vendedores${data.semEquipe.length ? ` · ${data.semEquipe.length} sem equipe` : ""}`}
            flush
          />
          {data.teams.length === 0 ? (
            <p className="metric-hint" style={{ marginTop: 12 }}>
              Crie uma equipe abaixo para começar a distribuir os vendedores.
            </p>
          ) : (
            <FormAcao key={todos.map((m) => `${m.sellerId}:${m.teamId}`).join(",")} action={salvarIntegrantes} exigeMudanca>
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Vendedor</th>
                      <th style={{ width: 320 }}>Equipe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todos.map((m) => (
                      <tr key={m.sellerId}>
                        <td>
                          {m.name}
                          {m.active === false && (
                            <span className="badge gray" style={{ marginLeft: 8 }}>inativo</span>
                          )}
                        </td>
                        <td>
                          <select
                            className="select"
                            name={`s:${m.sellerId}`}
                            defaultValue={m.teamId}
                            aria-label={`Equipe de ${m.name}`}
                          >
                            <option value="">— sem equipe —</option>
                            {data.teams.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 14 }}>
                <BotaoAcao>Salvar equipes</BotaoAcao>
              </div>
            </FormAcao>
          )}
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead title="Equipes cadastradas" sub="renomear ou remover" flush />
          {data.teams.length === 0 ? (
            <p className="metric-hint" style={{ marginTop: 12 }}>Nenhuma equipe ainda.</p>
          ) : (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 340 }}>Nome</th>
                    <th className="r">Integrantes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.teams.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <FormAcao key={`${t.id}|${t.name}`} action={renomearEquipe} exigeMudanca className="row-form">
                          <input type="hidden" name="teamId" value={t.id} />
                          <input
                            className="input"
                            name="name"
                            defaultValue={t.name}
                            aria-label={`Nome da equipe ${t.name}`}
                            style={{ width: 210 }}
                          />
                          <BotaoAcao className="btn btn-ghost btn-sm">Salvar</BotaoAcao>
                        </FormAcao>
                      </td>
                      <td className="r">{t.members.length}</td>
                      <td>
                        <FormAcao action={removerEquipe}>
                          <input type="hidden" name="teamId" value={t.id} />
                          <BotaoAcao
                            className="btn btn-ghost btn-sm danger"
                            enviando="Removendo…"
                            title="Os vendedores voltam para “sem equipe”; ninguém é apagado"
                          >
                            Remover
                          </BotaoAcao>
                        </FormAcao>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead title="Nova equipe" sub="ex.: SP, RJ, Corporativo" flush />
          <FormAcao
            action={criarEquipe}
            exigeMudanca
            limparAoConcluir
            style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}
          >
            <input
              className="input"
              name="name"
              placeholder="Nome da equipe"
              aria-label="Nome da nova equipe"
              required
              style={{ maxWidth: 260 }}
            />
            <BotaoAcao enviando="Criando…">Criar equipe</BotaoAcao>
          </FormAcao>
        </div>
      </div>
    </>
  );
}
