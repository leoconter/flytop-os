"use client";

import { useState } from "react";
import { excluirTarefa } from "@/app/(app)/tarefas/actions";
import { BotaoAcao, FormAcao } from "@/components/form-acao";

/**
 * Excluir apaga comentários, checklist, anexos e histórico junto — por isso
 * pergunta antes, no lugar, sem tirar a pessoa da tela.
 */
export function ExcluirTarefa({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button type="button" className="btn btn-ghost danger" onClick={() => setConfirmando(true)}>
        Excluir tarefa
      </button>
    );
  }

  return (
    <span className="acoes">
      <span className="confirma">Excluir com comentários e anexos?</span>
      <FormAcao action={excluirTarefa} silencioso>
        <input type="hidden" name="id" value={id} />
        <BotaoAcao className="btn btn-ghost btn-sm danger" enviando="Excluindo…">
          Sim, excluir
        </BotaoAcao>
      </FormAcao>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmando(false)}>
        Cancelar
      </button>
    </span>
  );
}
