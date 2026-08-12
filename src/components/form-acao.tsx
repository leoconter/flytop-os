"use client";

import {
  createContext,
  useContext,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

/** Resultado de uma Server Action de formulário. */
export interface AcaoState {
  erro?: string;
  ok?: string;
}

/** O botão precisa saber se há algo para gravar; o contexto evita passar prop. */
const FormCtx = createContext<{ podeEnviar: boolean }>({ podeEnviar: true });

/** Estado do formulário como texto, para comparar com o de quando abriu. */
function assinatura(form: HTMLFormElement | null): string {
  if (!form) return "";
  return [...new FormData(form)]
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : ""}`)
    .join("&");
}

/**
 * Formulário com resposta na própria tela.
 *
 * Existe por dois motivos. Primeiro: `throw` numa Server Action derruba a
 * página inteira — nome repetido ou senha curta são erros de uso normal e
 * precisam virar recado, não tela de erro. Segundo: um botão "Salvar" acesso
 * quando não há nada a salvar promete uma ação que não existe; com
 * `exigeMudanca` ele só acende depois que algo muda de verdade.
 */
export function FormAcao({
  action,
  children,
  className,
  style,
  limparAoConcluir,
  exigeMudanca,
}: {
  action: (prev: AcaoState, fd: FormData) => Promise<AcaoState>;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Esvazia os campos depois de gravar — útil em formulário de cadastro. */
  limparAoConcluir?: boolean;
  /** Mantém o botão apagado enquanto nada mudou. */
  exigeMudanca?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const inicial = useRef<string>("");
  const [mudou, setMudou] = useState(false);

  const fotografar = useCallback(() => {
    inicial.current = assinatura(ref.current);
    setMudou(false);
  }, []);

  // Ponto de partida: o que estava na tela quando ela abriu.
  useEffect(fotografar, [fotografar]);

  // Depois de gravar, o que está na tela virou o novo ponto de partida — o
  // botão tem que apagar de novo em vez de seguir convidando a salvar.
  useEffect(() => {
    if (!state.ok) return;
    if (limparAoConcluir) ref.current?.reset();
    fotografar();
  }, [state, limparAoConcluir, fotografar]);

  const conferir = () => setMudou(assinatura(ref.current) !== inicial.current);

  return (
    <FormCtx.Provider value={{ podeEnviar: !exigeMudanca || mudou }}>
      <form
        ref={ref}
        action={formAction}
        className={className}
        style={style}
        onInput={exigeMudanca ? conferir : undefined}
        onChange={exigeMudanca ? conferir : undefined}
      >
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
    </FormCtx.Provider>
  );
}

/**
 * Botão de envio que reflete o que pode fazer: apagado enquanto não há
 * alteração, apagado enquanto envia. Desabilitar durante o envio é também o
 * que impede o clique duplo virar duas gravações.
 */
export function BotaoAcao({
  children,
  enviando,
  className = "btn btn-primary",
  disabled,
  ...rest
}: {
  children: ReactNode;
  enviando?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  const { podeEnviar } = useContext(FormCtx);
  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled || !podeEnviar}
      {...rest}
    >
      {pending ? (enviando ?? "Salvando…") : children}
    </button>
  );
}
