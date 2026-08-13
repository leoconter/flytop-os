import {
  ETAPA_LABEL,
  ETAPA_TOM,
  MODALIDADE_LABEL,
  PRIORIDADE_LABEL,
  type Etapa,
  type Modalidade,
  type Prioridade,
} from "@/lib/tarefas/modelo";

/** Etiqueta da etapa. A cor vem do modelo, não fica escrita em cada tela. */
export function Etiqueta({ etapa }: { etapa: Etapa }) {
  return <span className={`etapa ${ETAPA_TOM[etapa]}`}>{ETAPA_LABEL[etapa]}</span>;
}

/**
 * Prioridade como bandeirinha, no gesto do ClickUp: a cor carrega a urgência,
 * o texto fica no title para quem não distingue as cores.
 */
export function Bandeira({ prioridade }: { prioridade: Prioridade }) {
  return (
    <span
      className={`prio ${prioridade}`}
      title={`Prioridade ${PRIORIDADE_LABEL[prioridade].toLowerCase()}`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M5 21V4a1 1 0 0 1 1-1h12.2a.6.6 0 0 1 .49.95L15.5 8.5l3.19 4.55a.6.6 0 0 1-.49.95H7v7z" />
      </svg>
      <span className="sr">{PRIORIDADE_LABEL[prioridade]}</span>
    </span>
  );
}

export function Modal({ modalidade }: { modalidade: Modalidade }) {
  return <span className="modalidade">{MODALIDADE_LABEL[modalidade]}</span>;
}

/** Iniciais do responsável. Sem responsável, um traço — não um vazio mudo. */
export function Avatar({ nome }: { nome: string | null }) {
  if (!nome) return <span className="quem vazio" title="Sem responsável">—</span>;
  const partes = nome.trim().split(/\s+/);
  const iniciais = ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  return (
    <span className="quem" title={nome}>
      {iniciais || "?"}
    </span>
  );
}
