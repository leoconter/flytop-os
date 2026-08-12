"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { entrar, type LoginState } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm({ de }: { de: string }) {
  const [state, action] = useActionState<LoginState, FormData>(entrar, {});

  return (
    <form action={action} className="login-form">
      <input type="hidden" name="de" value={de} />

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          className="input"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
        />
      </div>

      <div className="field">
        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          className="input"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state.erro && (
        <p className="login-erro" role="alert">
          {state.erro}
        </p>
      )}

      <Botao />
    </form>
  );
}
