"use client";

import { useCallback, useState } from "react";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import type { SellerOption } from "@/lib/auth/users";
import { criarUsuario } from "./actions";

/** Opções de vendedor, marcando quem já está em outra conta. */
export function SellerSelect({
  sellers,
  name = "sellerId",
  value,
  label,
  permitirTomado,
}: {
  sellers: SellerOption[];
  name?: string;
  value?: string | null;
  label?: string;
  /** O vínculo atual da própria linha não pode aparecer como indisponível. */
  permitirTomado?: string | null;
}) {
  return (
    <select className="select" name={name} defaultValue={value ?? ""} aria-label={label}>
      <option value="">— sem vínculo —</option>
      {sellers.map((s) => {
        const tomado = Boolean(s.takenBy) && s.sellerId !== permitirTomado;
        return (
          <option
            key={s.sellerId}
            value={s.sellerId}
            disabled={tomado}
            title={tomado ? `Já vinculado a ${s.takenBy}` : undefined}
          >
            {s.name}
            {s.active === false ? " (inativo)" : ""}
            {tomado ? " · em uso" : ""}
          </option>
        );
      })}
    </select>
  );
}

/**
 * Cadastro recolhido: a tela abre mostrando quem já existe, e o formulário só
 * aparece quando alguém pede para adicionar.
 */
export function NovoUsuario({ sellers }: { sellers: SellerOption[] }) {
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);

  if (!aberto) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setAberto(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Adicionar usuário
      </button>
    );
  }

  return (
    <FormAcao
      action={criarUsuario}
      exigeMudanca
      limparAoConcluir
      aoConcluir={fechar}
      className="form-grid"
      style={{ marginTop: 14 }}
    >
      <div className="field">
        <label htmlFor="firstName">Nome</label>
        <input id="firstName" className="input" name="firstName" required />
      </div>
      <div className="field">
        <label htmlFor="lastName">Sobrenome</label>
        <input id="lastName" className="input" name="lastName" required />
      </div>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" className="input" name="email" type="email" autoComplete="off" required />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          className="input"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <span className="metric-hint">mínimo de 8 caracteres</span>
      </div>
      <div className="field">
        <label htmlFor="role">Papel</label>
        <select id="role" className="select" name="role" defaultValue="vendedor">
          <option value="vendedor">Vendedor</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="sellerId">Vendedor no Monde</label>
        <SellerSelect sellers={sellers} label="Vendedor no Monde" />
        <span className="metric-hint">é o que liga a conta às vendas do ERP</span>
      </div>

      <div className="field full acoes-edicao">
        <BotaoAcao enviando="Criando…">Criar usuário</BotaoAcao>
        <button type="button" className="btn btn-ghost" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </FormAcao>
  );
}
