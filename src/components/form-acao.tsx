"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Resultado de uma Server Action de formulário. */
export interface AcaoState {
  erro?: string;
  ok?: string;
}

/**
 * Formulário com resposta na própria tela.
 *
 * Existe porque `throw` numa Server Action derruba a página inteira: o
 * navegador troca tudo por "A server error occurred" e a pessoa precisa
 * recarregar. Nome de equipe repetido, senha curta ou vendedor já vinculado
 * são erros previsíveis — têm que virar recado, não tela de erro.
 */
export function FormAcao({
  action,
  children,
  className,
  style,
  limparAoConcluir,
}: {
  action: (prev: AcaoState, fd: FormData) => Promise<AcaoState>;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Esvazia os campos depois de gravar — útil em formulário de cadastro. */
  limparAoConcluir?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const ultimoOk = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (limparAoConcluir && state.ok && state.ok !== ultimoOk.current) {
      ultimoOk.current = state.ok;
      ref.current?.reset();
    }
  }, [state.ok, limparAoConcluir]);

  return (
    <form ref={ref} action={formAction} className={className} style={style}>
      {children}
      {state.erro && (
        <p className="form-erro" role="alert">
          {state.erro}
        </p>
      )}
      {state.ok && (
        <p className="form-ok" role="status">
          {state.ok}
        </p>
      )}
    </form>
  );
}

/**
 * Botão que se desabilita enquanto envia — é o que impede o clique duplo de
 * virar duas gravações (e, no caso de nome único, um erro de servidor).
 */
export function BotaoAcao({
  children,
  enviando,
  className = "btn btn-primary",
  ...rest
}: {
  children: ReactNode;
  enviando?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} {...rest}>
      {pending ? (enviando ?? "Salvando…") : children}
    </button>
  );
}
