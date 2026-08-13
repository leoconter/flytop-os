"use client";

import {
  ETAPA_LABEL,
  ETAPAS,
  MODALIDADE_LABEL,
  MODALIDADES,
  PRIORIDADE_LABEL,
  PRIORIDADE_PADRAO,
  PRIORIDADES,
} from "@/lib/tarefas/modelo";

export interface Pessoa {
  userId: string;
  fullName: string;
}

/**
 * Os campos da tarefa, compartilhados pelo cadastro e pela edição.
 *
 * Ficam num lugar só porque as duas telas precisam oferecer exatamente as
 * mesmas opções — uma lista de modalidade que divergisse entre criar e editar
 * seria descoberta tarde, com dado já gravado.
 */
export function CamposTarefa({
  pessoas,
  valores,
  mostrarEtapa,
}: {
  pessoas: Pessoa[];
  valores?: {
    title?: string;
    description?: string | null;
    locator?: string | null;
    modality?: string;
    priority?: string;
    status?: string;
    assigneeId?: string | null;
  };
  /** No cadastro a etapa não aparece: tarefa nova nasce em A Fazer. */
  mostrarEtapa?: boolean;
}) {
  const v = valores ?? {};
  return (
    <>
      <div className="field full">
        <label htmlFor="tk-title">Título</label>
        <input
          id="tk-title"
          className="input"
          name="title"
          defaultValue={v.title ?? ""}
          placeholder="Conferir e-mails"
          maxLength={200}
          required
          autoComplete="off"
        />
      </div>

      <div className="field full">
        <label htmlFor="tk-desc">Descrição</label>
        <textarea
          id="tk-desc"
          className="textarea tk-desc"
          name="description"
          defaultValue={v.description ?? ""}
          placeholder="Descreva os detalhes da tarefa."
        />
        <span className="metric-hint">opcional</span>
      </div>

      <div className="field">
        <label htmlFor="tk-loc">Localizador</label>
        <input
          id="tk-loc"
          className="input"
          name="locator"
          defaultValue={v.locator ?? ""}
          placeholder="ABC123"
          maxLength={40}
          autoComplete="off"
        />
        <span className="metric-hint">opcional</span>
      </div>

      <div className="field">
        <label htmlFor="tk-mod">Modalidade</label>
        <select id="tk-mod" className="select" name="modality" defaultValue={v.modality ?? "outro"}>
          {MODALIDADES.map((m) => (
            <option key={m} value={m}>
              {MODALIDADE_LABEL[m]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="tk-quem">Responsável</label>
        <select
          id="tk-quem"
          className="select"
          name="assignee"
          defaultValue={v.assigneeId ?? ""}
        >
          <option value="">Sem responsável</option>
          {pessoas.map((p) => (
            <option key={p.userId} value={p.userId}>
              {p.fullName}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="tk-prio">Prioridade</label>
        <select
          id="tk-prio"
          className="select"
          name="priority"
          defaultValue={v.priority ?? PRIORIDADE_PADRAO}
        >
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {PRIORIDADE_LABEL[p]}
            </option>
          ))}
        </select>
      </div>

      {mostrarEtapa && (
        <div className="field">
          <label htmlFor="tk-status">Etapa</label>
          <select
            id="tk-status"
            className="select"
            name="status"
            defaultValue={v.status ?? "a_fazer"}
          >
            {ETAPAS.map((e) => (
              <option key={e} value={e}>
                {ETAPA_LABEL[e]}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
