"use client";

import { Fragment, useCallback, useState } from "react";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import type { AppUser, SellerOption } from "@/lib/auth/users";
import { alternarAtivo, editarUsuario, removerUsuario, resetarMfa } from "./actions";
import { SellerSelect } from "./novo-usuario";

const sw = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconeEditar = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
const IconeDesativar = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </svg>
);
const IconeReativar = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
  </svg>
);
const IconeRemover = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);
const IconeFechar = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/** Botão de ícone dentro de um FormAcao. */
function IconeSubmit({
  children,
  titulo,
  tom,
  disabled,
}: {
  children: React.ReactNode;
  titulo: string;
  tom?: "perigo";
  disabled?: boolean;
}) {
  return (
    <BotaoAcao
      className={`icon-btn${tom === "perigo" ? " perigo" : ""}`}
      title={titulo}
      aria-label={titulo}
      disabled={disabled}
      enviando={children}
    >
      {children}
    </BotaoAcao>
  );
}

export function ListaUsuarios({
  users,
  sellers,
  meuId,
  semMfa,
}: {
  users: AppUser[];
  sellers: SellerOption[];
  meuId?: string;
  /** Contas sem autenticador confirmado — não conseguem entrar até cadastrar. */
  semMfa: string[];
}) {
  const pendentes = new Set(semMfa);
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const fechar = useCallback(() => setEditando(null), []);

  return (
    <div className="table-wrap" style={{ marginTop: 8 }}>
      <table>
        <thead>
          <tr>
            <th>Pessoa</th>
            <th>E-mail</th>
            <th>Papel</th>
            <th>Vendedor no Monde</th>
            <th style={{ width: 150 }}>2FA</th>
            <th style={{ width: 130 }} />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const eu = u.userId === meuId;
            const aberto = editando === u.userId;
            return (
              <Fragment key={u.userId}>
                <tr className={aberto ? "linha-aberta" : undefined}>
                  <td>
                    {u.fullName}
                    {eu && <span className="badge blue" style={{ marginLeft: 8 }}>você</span>}
                    {!u.active && (
                      <span className="badge gray" style={{ marginLeft: 8 }}>sem acesso</span>
                    )}
                  </td>
                  <td className="mono-cell">{u.email}</td>
                  <td>{u.role === "admin" ? "Administrador" : "Vendedor"}</td>
                  <td>
                    {u.sellerName ?? <span className="muted">não vinculado</span>}
                  </td>
                  <td>
                    {pendentes.has(u.userId) ? (
                      <span className="badge gray" title="Vai configurar no próximo login">
                        a configurar
                      </span>
                    ) : (
                      <div className="acoes">
                        <span className="badge green">ativo</span>
                        {/* Some com o autenticador para a pessoa cadastrar de
                            novo — é a única saída de quem perdeu o celular. */}
                        <FormAcao action={resetarMfa} silencioso>
                          <input type="hidden" name="userId" value={u.userId} />
                          <BotaoAcao
                            className="btn btn-ghost btn-sm danger"
                            enviando="…"
                            title="A pessoa terá de configurar o 2FA de novo no próximo login"
                          >
                            remover
                          </BotaoAcao>
                        </FormAcao>
                      </div>
                    )}
                  </td>
                  <td>
                    {confirmando === u.userId ? (
                      <div className="acoes">
                        <span className="confirma">Remover?</span>
                        <FormAcao action={removerUsuario} silencioso>
                          <input type="hidden" name="userId" value={u.userId} />
                          <BotaoAcao className="btn btn-ghost btn-sm danger" enviando="…">
                            Sim
                          </BotaoAcao>
                        </FormAcao>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setConfirmando(null)}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <div className="acoes">
                        <button
                          type="button"
                          className={`icon-btn${aberto ? " on" : ""}`}
                          title={aberto ? "Fechar edição" : "Editar"}
                          aria-label={aberto ? "Fechar edição" : "Editar"}
                          aria-expanded={aberto}
                          onClick={() => setEditando(aberto ? null : u.userId)}
                        >
                          {aberto ? <IconeFechar /> : <IconeEditar />}
                        </button>

                        <FormAcao action={alternarAtivo} silencioso>
                          <input type="hidden" name="userId" value={u.userId} />
                          <input type="hidden" name="ativar" value={u.active ? "0" : "1"} />
                          <IconeSubmit
                            titulo={
                              u.active
                                ? "Desativar — mantém os dados, mas a pessoa deixa de entrar"
                                : "Reativar acesso"
                            }
                            disabled={eu}
                          >
                            {u.active ? <IconeDesativar /> : <IconeReativar />}
                          </IconeSubmit>
                        </FormAcao>

                        <button
                          type="button"
                          className="icon-btn perigo"
                          title="Remover em definitivo"
                          aria-label="Remover em definitivo"
                          disabled={eu}
                          onClick={() => setConfirmando(u.userId)}
                        >
                          <IconeRemover />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>

                {aberto && (
                  <tr className="linha-edicao">
                    <td colSpan={6}>
                      {/* Sem `key` de propósito: o painel some ao concluir e
                          remonta com dados novos na próxima abertura. Com ela,
                          o formulário remontava antes de avisar que terminou e
                          o painel ficava aberto. */}
                      <FormAcao
                        action={editarUsuario}
                        exigeMudanca
                        aoConcluir={fechar}
                        className="form-grid"
                      >
                        <input type="hidden" name="userId" value={u.userId} />
                        <input type="hidden" name="emailAtual" value={u.email} />

                        <div className="field">
                          <label htmlFor={`fn-${u.userId}`}>Nome</label>
                          <input
                            id={`fn-${u.userId}`}
                            className="input"
                            name="firstName"
                            defaultValue={u.firstName}
                            required
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`ln-${u.userId}`}>Sobrenome</label>
                          <input
                            id={`ln-${u.userId}`}
                            className="input"
                            name="lastName"
                            defaultValue={u.lastName}
                            required
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`em-${u.userId}`}>E-mail</label>
                          <input
                            id={`em-${u.userId}`}
                            className="input"
                            name="email"
                            type="email"
                            defaultValue={u.email}
                            required
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`pw-${u.userId}`}>Nova senha</label>
                          <input
                            id={`pw-${u.userId}`}
                            className="input"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="deixe em branco para manter"
                          />
                          <span className="metric-hint">mínimo de 8 caracteres</span>
                        </div>
                        <div className="field">
                          <label htmlFor={`rl-${u.userId}`}>Papel</label>
                          <select
                            id={`rl-${u.userId}`}
                            className="select"
                            name="role"
                            defaultValue={u.role}
                          >
                            <option value="vendedor">Vendedor</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor={`sl-${u.userId}`}>Vendedor no Monde</label>
                          <SellerSelect
                            sellers={sellers}
                            value={u.sellerId}
                            permitirTomado={u.sellerId}
                            label={`Vendedor de ${u.fullName}`}
                          />
                          <span className="metric-hint">liga a conta às vendas do ERP</span>
                        </div>

                        <div className="field full acoes-edicao">
                          <BotaoAcao>Salvar alterações</BotaoAcao>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setEditando(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </FormAcao>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
