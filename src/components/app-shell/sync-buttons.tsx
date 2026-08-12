"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { rodarSync, type SyncState } from "@/app/(app)/sync-actions";

const sw = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconeAtualizar = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 3v5h-5" />
  </svg>
);

const IconeCompleta = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </svg>
);

function Botao({
  children,
  icone,
  titulo,
}: {
  children: React.ReactNode;
  icone: React.ReactNode;
  titulo: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="sync-btn" disabled={pending} title={titulo}>
      <span className={pending ? "girando" : undefined}>{icone}</span>
      {pending ? "Atualizando…" : children}
    </button>
  );
}

function Acao({
  modo,
  rotulo,
  icone,
  titulo,
}: {
  modo: "daily" | "full";
  rotulo: string;
  icone: React.ReactNode;
  titulo: string;
}) {
  const [state, action] = useActionState<SyncState, FormData>(rodarSync, {});
  return (
    <form action={action}>
      <input type="hidden" name="modo" value={modo} />
      <Botao icone={icone} titulo={titulo}>
        {rotulo}
      </Botao>
      {state.ok && <p className="sync-msg ok">{state.ok}</p>}
      {state.erro && <p className="sync-msg erro">{state.erro}</p>}
    </form>
  );
}

/**
 * Atualização sob demanda, para quem não quer esperar as 00:01.
 *
 * Fica na sidebar e só é renderizada para administradores — a ação confere o
 * papel no servidor de novo, porque esconder o botão não protege nada.
 */
export function SyncButtons() {
  return (
    <div className="sync-box">
      <Acao
        modo="daily"
        rotulo="Atualizar agora"
        icone={<IconeAtualizar />}
        titulo="Relê os últimos 15 dias e as vendas canceladas — alguns segundos"
      />
      <Acao
        modo="full"
        rotulo="Atualização completa"
        icone={<IconeCompleta />}
        titulo="Relê o histórico inteiro do Monde — leva cerca de um minuto"
      />
    </div>
  );
}
