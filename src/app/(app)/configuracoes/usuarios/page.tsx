import { PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { currentUser } from "@/lib/auth/session";
import { listSellerOptions, listUsers } from "@/lib/auth/users";
import { alternarAtivo, removerUsuario, salvarVinculo, trocarSenha } from "./actions";
import { NovoUsuario, SellerSelect } from "./novo-usuario";

export const metadata = { title: "FlyTop OS · Usuários" };
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const [users, sellers, eu] = await Promise.all([
    listUsers(),
    listSellerOptions(),
    currentUser(),
  ]);

  if (!users || !sellers) {
    return (
      <>
        <PageHead title="Usuários" sub="Contas de acesso à plataforma" />
        <div className="note-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="nt">
            O banco ainda não respondeu. Se a migração de usuários ainda não foi
            aplicada, rode <b>20260812000001_users_and_teams.sql</b> no Supabase.
          </div>
        </div>
      </>
    );
  }

  const semVinculo = users.filter((u) => !u.sellerId && u.role !== "admin").length;

  return (
    <>
      <PageHead
        title="Usuários"
        sub="Quem entra na plataforma e a quem cada conta corresponde no Monde"
        right={<Pill tone="blue">{users.length} contas</Pill>}
      />

      {semVinculo > 0 && (
        <div className="note-box orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <div className="nt">
            <b>{semVinculo}</b>{" "}
            {semVinculo === 1 ? "conta de vendedor não está vinculada" : "contas de vendedor não estão vinculadas"}{" "}
            a ninguém no Monde. Sem o vínculo, a Tela do Vendedor não tem quais
            vendas mostrar para essas pessoas.
          </div>
        </div>
      )}

      <div className="section">
        <div className="glass card">
          <SectionHead title="Contas" sub={`${users.length} cadastradas`} flush />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>E-mail</th>
                  <th>Equipe</th>
                  <th style={{ width: 430 }}>Papel e vínculo com o Monde</th>
                  <th style={{ width: 250 }}>Nova senha</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId}>
                    <td>
                      {u.fullName}
                      {u.userId === eu?.userId && (
                        <span className="badge blue" style={{ marginLeft: 8 }}>você</span>
                      )}
                      {!u.active && (
                        <span className="badge gray" style={{ marginLeft: 8 }}>desativada</span>
                      )}
                    </td>
                    <td className="mono-cell">{u.email}</td>
                    <td>{u.teamName ?? <span className="muted">—</span>}</td>
                    <td>
                      <FormAcao
                        action={salvarVinculo}
                        style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
                      >
                        <input type="hidden" name="userId" value={u.userId} />
                        <select className="select" name="role" defaultValue={u.role} style={{ maxWidth: 150 }}>
                          <option value="vendedor">Vendedor</option>
                          <option value="admin">Administrador</option>
                        </select>
                        <SellerSelect
                          sellers={sellers}
                          value={u.sellerId}
                          permitirTomado={u.sellerId}
                          label={`Vendedor de ${u.fullName}`}
                        />
                        <BotaoAcao className="btn btn-ghost btn-sm">Salvar</BotaoAcao>
                      </FormAcao>
                    </td>
                    <td>
                      <FormAcao action={trocarSenha} limparAoConcluir style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input type="hidden" name="userId" value={u.userId} />
                        <input
                          className="input"
                          name="password"
                          type="password"
                          minLength={8}
                          autoComplete="new-password"
                          placeholder="mín. 8 caracteres"
                          aria-label={`Nova senha de ${u.fullName}`}
                          style={{ maxWidth: 150 }}
                          required
                        />
                        <BotaoAcao className="btn btn-ghost btn-sm">Trocar</BotaoAcao>
                      </FormAcao>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <FormAcao action={alternarAtivo}>
                          <input type="hidden" name="userId" value={u.userId} />
                          <input type="hidden" name="ativar" value={u.active ? "0" : "1"} />
                          <BotaoAcao
                            className="btn btn-ghost btn-sm"
                            disabled={u.userId === eu?.userId}
                            title={u.active ? "Impede a conta de entrar" : "Devolve o acesso"}
                          >
                            {u.active ? "Desativar" : "Reativar"}
                          </BotaoAcao>
                        </FormAcao>
                        <FormAcao action={removerUsuario}>
                          <input type="hidden" name="userId" value={u.userId} />
                          <BotaoAcao
                            className="btn btn-ghost btn-sm danger"
                            enviando="Removendo…"
                            disabled={u.userId === eu?.userId}
                            title="Apaga a conta em definitivo"
                          >
                            Remover
                          </BotaoAcao>
                        </FormAcao>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Novo usuário"
            sub="a senha vai direto para o Supabase Auth, sem passar por tabela nossa"
            flush
          />
          <NovoUsuario sellers={sellers} />
        </div>
      </div>
    </>
  );
}
