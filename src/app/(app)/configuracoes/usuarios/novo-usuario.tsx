"use client";

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
          <option key={s.sellerId} value={s.sellerId} disabled={tomado}>
            {s.name}
            {s.active === false ? " (inativo)" : ""}
            {tomado ? ` — já vinculado a ${s.takenBy}` : ""}
          </option>
        );
      })}
    </select>
  );
}

export function NovoUsuario({ sellers }: { sellers: SellerOption[] }) {
  return (
    <FormAcao action={criarUsuario} limparAoConcluir className="form-grid" style={{ marginTop: 14 }}>
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

      <div className="field full" style={{ alignItems: "flex-start" }}>
        <BotaoAcao enviando="Criando…">Criar usuário</BotaoAcao>
      </div>
    </FormAcao>
  );
}
