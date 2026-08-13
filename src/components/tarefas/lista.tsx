import Link from "next/link";
import { ETAPA_LABEL, ETAPAS, PRIORIDADE_PESO, type Etapa } from "@/lib/tarefas/modelo";
import type { Tarefa } from "@/lib/tarefas/store";
import { descrever, regraDe } from "@/lib/tarefas/recorrencia";
import { Avatar, Bandeira, Etiqueta, Modal, Repete } from "./etiquetas";

const dataCurta = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

/**
 * Lista agrupada por etapa.
 *
 * O agrupamento é o que faz a lista responder à mesma pergunta do quadro —
 * "o que está em cada fase" — sem obrigar a pessoa a arrastar. Dentro do
 * grupo, a urgência manda: o que é urgente aparece antes.
 */
export function ListaTarefas({ tarefas }: { tarefas: Tarefa[] }) {
  const grupos = ETAPAS.map((etapa) => ({
    etapa,
    itens: tarefas
      .filter((t) => t.status === etapa)
      .sort(
        (a, b) =>
          PRIORIDADE_PESO[a.priority] - PRIORIDADE_PESO[b.priority] ||
          a.position - b.position,
      ),
  })).filter((g) => g.itens.length > 0);

  if (!grupos.length) {
    return (
      <p className="wa-empty" style={{ padding: "28px 10px" }}>
        Nenhuma tarefa por aqui. Use <b>Nova tarefa</b> para criar a primeira.
      </p>
    );
  }

  return (
    <div className="tk-lista">
      {grupos.map((g) => (
        <Grupo key={g.etapa} etapa={g.etapa} itens={g.itens} />
      ))}
    </div>
  );
}

function Grupo({ etapa, itens }: { etapa: Etapa; itens: Tarefa[] }) {
  return (
    <section className="glass card">
      <div className="tk-grupo-topo">
        <Etiqueta etapa={etapa} />
        <span className="tk-grupo-qt">
          {itens.length} {itens.length === 1 ? "tarefa" : "tarefas"}
        </span>
      </div>
      <div className="table-wrap" style={{ marginTop: 4 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 34 }} />
              <th>Tarefa</th>
              <th>Modalidade</th>
              <th>Localizador</th>
              <th>Responsável</th>
              <th className="r">Criada</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((t) => (
              <tr key={t.id}>
                <td>
                  <Bandeira prioridade={t.priority} />
                </td>
                <td>
                  <Link href={`/tarefas/${t.id}`} className="tk-link">
                    <span className="tk-seq">#{t.seq}</span>
                    {t.title}
                  </Link>
                  {(t.checklistTotal > 0 || t.comentarios > 0 || t.anexos > 0) && (
                    <span className="tk-mini">
                      {t.checklistTotal > 0 && `${t.checklistFeitos}/${t.checklistTotal} no checklist`}
                      {t.comentarios > 0 && ` · ${t.comentarios} coment.`}
                      {t.anexos > 0 && ` · ${t.anexos} anexo${t.anexos > 1 ? "s" : ""}`}
                    </span>
                  )}
                </td>
                <td>
                  <span className="tk-quem-nome">
                    <Modal modalidade={t.modality} />
                    <Repete texto={descrever(regraDe(t))} />
                  </span>
                </td>
                <td className="mono-cell">{t.locator ?? <span className="muted">—</span>}</td>
                <td>
                  <span className="tk-quem-nome">
                    <Avatar nome={t.assigneeName} />
                    {t.assigneeName ?? <span className="muted">sem responsável</span>}
                  </span>
                </td>
                <td className="r muted">{dataCurta.format(new Date(t.createdAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export { ETAPA_LABEL };
