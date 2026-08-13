"use client";

import { comentar, removerComentario } from "@/app/(app)/tarefas/actions";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { CAMPO_LABEL } from "@/lib/tarefas/modelo";
import type { Comentario, Evento } from "@/lib/tarefas/store";

const quando = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const IconeRemover = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

function iniciais(nome: string | null): string {
  if (!nome) return "?";
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}

/** Frase do histórico. Sem isto a tela mostraria "status: a_fazer → concluido". */
function frase(e: Evento): string {
  const quem = e.actorName?.split(" ")[0] ?? "Alguém";
  switch (e.kind) {
    case "criou":
      return `${quem} criou a tarefa`;
    case "comentou":
      return `${quem} comentou`;
    case "anexou":
      return `${quem} anexou ${e.to ?? "um arquivo"}`;
    case "removeu_anexo":
      return `${quem} removeu ${e.to ?? "um anexo"}`;
    case "alterou": {
      const campo = CAMPO_LABEL[e.field ?? ""] ?? e.field ?? "algo";
      if (!e.from) return `${quem} definiu ${campo} como ${e.to ?? "vazio"}`;
      if (!e.to) return `${quem} limpou ${campo}`;
      // Título e descrição podem ser longos: no histórico só se diz que mudou.
      if (e.field === "title" || e.field === "description") return `${quem} alterou o ${campo}`;
      return `${quem} mudou ${campo} de ${e.from} para ${e.to}`;
    }
    default:
      return `${quem} mexeu na tarefa`;
  }
}

type Linha =
  | { tipo: "comentario"; em: string; c: Comentario }
  | { tipo: "evento"; em: string; e: Evento };

/**
 * Atividade da tarefa: comentários e histórico na mesma linha do tempo.
 *
 * Separá-los em duas listas obrigaria a ler as duas e cruzar horários para
 * entender o que aconteceu — "comentou pedindo o localizador, e então mudou
 * para Aguardando" é uma história só.
 */
export function Atividade({
  taskId,
  comentarios,
  eventos,
  meuId,
  souAdmin,
}: {
  taskId: string;
  comentarios: Comentario[];
  eventos: Evento[];
  meuId: string;
  souAdmin: boolean;
}) {
  // O evento "comentou" viraria uma linha repetindo o comentário ao lado.
  const linhas: Linha[] = [
    ...comentarios.map<Linha>((c) => ({ tipo: "comentario", em: c.createdAt, c })),
    ...eventos
      .filter((e) => e.kind !== "comentou")
      .map<Linha>((e) => ({ tipo: "evento", em: e.createdAt, e })),
  ].sort((a, b) => (a.em < b.em ? 1 : -1));

  return (
    <div className="glass card tk-atividade">
      <div className="section-head flush">
        <span className="section-title">Atividade</span>
        <span className="section-sub">
          {comentarios.length} {comentarios.length === 1 ? "comentário" : "comentários"}
        </span>
      </div>

      <FormAcao action={comentar} limparAoConcluir exigeMudanca className="tk-comentar">
        <input type="hidden" name="taskId" value={taskId} />
        <textarea
          className="textarea tk-caixa-comentario"
          name="body"
          placeholder="Escreva um comentário…"
          rows={3}
        />
        <BotaoAcao className="btn btn-primary btn-sm" enviando="Enviando…">
          Comentar
        </BotaoAcao>
      </FormAcao>

      <ol className="tk-linha-tempo">
        {linhas.length === 0 && <li className="tk-vazia">Nada aconteceu ainda.</li>}

        {linhas.map((l) =>
          l.tipo === "comentario" ? (
            <li key={`c-${l.c.id}`} className="tk-fala">
              <span className="quem" title={l.c.authorName ?? undefined}>
                {iniciais(l.c.authorName)}
              </span>
              <div className="tk-balao">
                <div className="tk-balao-topo">
                  <b>{l.c.authorName ?? "Alguém"}</b>
                  <span className="dt">{quando.format(new Date(l.c.createdAt))}</span>
                  {(l.c.authorId === meuId || souAdmin) && (
                    <FormAcao action={removerComentario} silencioso>
                      <input type="hidden" name="taskId" value={taskId} />
                      <input type="hidden" name="id" value={l.c.id} />
                      <BotaoAcao
                        className="icon-btn perigo"
                        title="Apagar comentário"
                        aria-label="Apagar comentário"
                        enviando="…"
                      >
                        <IconeRemover />
                      </BotaoAcao>
                    </FormAcao>
                  )}
                </div>
                <p className="tk-balao-texto">{l.c.body}</p>
              </div>
            </li>
          ) : (
            <li key={`e-${l.e.id}`} className="tk-evento">
              <span className="pt" aria-hidden="true" />
              <span className="tx">{frase(l.e)}</span>
              <span className="dt">{quando.format(new Date(l.e.createdAt))}</span>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
