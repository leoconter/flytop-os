/**
 * Vocabulário das tarefas.
 *
 * Fica num arquivo só, sem `db`, porque tanto o servidor quanto o navegador
 * precisam dele — a etapa e a prioridade aparecem em rótulo, cor e ordenação.
 * O valor guardado é o da esquerda; o texto na tela é sempre derivado daqui,
 * nunca escrito à mão numa tela.
 */

export const ETAPAS = ["a_fazer", "em_andamento", "aguardando", "concluido"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ETAPA_LABEL: Record<Etapa, string> = {
  a_fazer: "A Fazer",
  em_andamento: "Em Andamento",
  aguardando: "Aguardando",
  concluido: "Concluído",
};

/** Cor da coluna do kanban e da etiqueta na lista. */
export const ETAPA_TOM: Record<Etapa, "cinza" | "azul" | "laranja" | "verde"> = {
  a_fazer: "cinza",
  em_andamento: "azul",
  aguardando: "laranja",
  concluido: "verde",
};

export const PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

/** Padrão do formulário, como pedido: Média já vem marcada. */
export const PRIORIDADE_PADRAO: Prioridade = "media";

/** Da mais urgente para a menos — usada para ordenar a lista. */
export const PRIORIDADE_PESO: Record<Prioridade, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

export const MODALIDADES = [
  "alteracao_cancelamento",
  "servicos_reservas",
  "outro",
] as const;
export type Modalidade = (typeof MODALIDADES)[number];

export const MODALIDADE_LABEL: Record<Modalidade, string> = {
  alteracao_cancelamento: "Alteração/Cancelamento",
  servicos_reservas: "Serviços em Reservas",
  outro: "Outro",
};

/** Converte texto vindo do banco/formulário, caindo no padrão quando não bate. */
export function comoEtapa(v: unknown): Etapa {
  return ETAPAS.includes(v as Etapa) ? (v as Etapa) : "a_fazer";
}
export function comoPrioridade(v: unknown): Prioridade {
  return PRIORIDADES.includes(v as Prioridade) ? (v as Prioridade) : PRIORIDADE_PADRAO;
}
export function comoModalidade(v: unknown): Modalidade {
  return MODALIDADES.includes(v as Modalidade) ? (v as Modalidade) : "outro";
}

/** Rótulo legível de um campo, para o histórico. */
export const CAMPO_LABEL: Record<string, string> = {
  title: "título",
  description: "descrição",
  locator: "localizador",
  modality: "modalidade",
  assignee: "responsável",
  priority: "prioridade",
  status: "etapa",
};
