"use client";

import { useRef } from "react";
import { adicionarItem, alternarItem, removerItem } from "@/app/(app)/tarefas/actions";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import type { ItemChecklist } from "@/lib/tarefas/store";

const IconeRemover = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * Checklist da tarefa.
 *
 * Marcar um item é um envio de formulário, não estado de tela: o que está
 * feito precisa valer para quem abrir a tarefa depois. A caixa dispara o envio
 * sozinha para não exigir um "salvar" a cada item.
 */
export function Checklist({ taskId, itens }: { taskId: string; itens: ItemChecklist[] }) {
  const feitos = itens.filter((i) => i.done).length;
  const pct = itens.length ? Math.round((feitos / itens.length) * 100) : 0;
  const campo = useRef<HTMLInputElement>(null);

  return (
    <div className="glass card">
      <div className="section-head flush">
        <span className="section-title">Checklist</span>
        {itens.length > 0 && (
          <span className="section-sub">
            {feitos} de {itens.length} · {pct}%
          </span>
        )}
      </div>

      {itens.length > 0 && (
        <div className="tk-barra" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
      )}

      <ul className="tk-checklist">
        {itens.map((i) => (
          <li key={i.id} className={i.done ? "feito" : undefined}>
            <FormAcao action={alternarItem} silencioso className="tk-item-marca">
              <input type="hidden" name="taskId" value={taskId} />
              <input type="hidden" name="itemId" value={i.id} />
              <input type="hidden" name="feito" value={i.done ? "0" : "1"} />
              <button
                type="submit"
                className={`tk-caixa${i.done ? " on" : ""}`}
                aria-label={i.done ? `Desmarcar ${i.label}` : `Marcar ${i.label}`}
                aria-pressed={i.done}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 6l3 3 5-6" />
                </svg>
              </button>
            </FormAcao>
            <span className="tk-item-texto">{i.label}</span>
            <FormAcao action={removerItem} silencioso>
              <input type="hidden" name="taskId" value={taskId} />
              <input type="hidden" name="itemId" value={i.id} />
              <BotaoAcao className="icon-btn perigo" title="Remover item" aria-label="Remover item" enviando="…">
                <IconeRemover />
              </BotaoAcao>
            </FormAcao>
          </li>
        ))}
      </ul>

      {/* `silencioso`: o item aparecendo na lista já é a confirmação — o
          recado verde ao lado do botão só ocupava espaço. */}
      <FormAcao
        action={adicionarItem}
        limparAoConcluir
        exigeMudanca
        silencioso
        aoConcluir={() => campo.current?.focus()}
        className="tk-novo-item"
      >
        <input type="hidden" name="taskId" value={taskId} />
        <input
          ref={campo}
          className="input"
          name="label"
          placeholder="Adicionar item ao checklist"
          maxLength={200}
          autoComplete="off"
        />
        <BotaoAcao className="btn btn-ghost btn-sm" enviando="…">
          Adicionar
        </BotaoAcao>
      </FormAcao>
    </div>
  );
}
