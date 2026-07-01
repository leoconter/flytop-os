/**
 * Dados ilustrativos da Jornada de Compra (comunidade → venda).
 *
 * Mede o tempo entre a entrada do membro na comunidade e a primeira compra.
 * Segue o padrão dos demais data libs da Fase 1: valores estáticos que
 * alimentam os componentes React do design system. Dados ilustrativos.
 */
import type { Metric } from "./dashboard-data";

export const jornadaMetrics: Metric[] = [
  {
    label: "Tempo médio até a compra",
    value: "18 dias",
    hint: "da entrada na comunidade à 1ª compra",
  },
  {
    label: "Conversão comunidade → venda",
    value: "6,2%",
    tone: "blue",
    bar: { pct: 62 },
    hint: "84 de 1.350 novos membros",
    hintTone: "positive",
  },
  {
    label: "Membros que compraram",
    value: "84",
    hint: "+11 vs abril",
    hintTone: "positive",
  },
  {
    label: "Mediana até a compra",
    value: "12 dias",
    hint: "compra mais rápida: 2 dias",
  },
];

/** Etapas do funil comunidade → venda, com contagem absoluta. */
export interface FunnelStage {
  label: string;
  count: number;
  /** Percentual em relação ao topo do funil (0–100). */
  pct: number;
  /** Conversão para a etapa seguinte, quando aplicável. */
  step?: string;
}

export const funnelStages: FunnelStage[] = [
  { label: "Entraram na comunidade", count: 1_350, pct: 100, step: "53% engajaram" },
  { label: "Engajaram (mensagem ou reação)", count: 720, pct: 53, step: "29% pediram cotação" },
  { label: "Pediram cotação", count: 210, pct: 16, step: "40% fecharam" },
  { label: "Compraram", count: 84, pct: 6 },
];

/** Distribuição do tempo entre entrar na comunidade e comprar. */
export interface TimeBucket {
  label: string;
  count: number;
  /** Percentual do total de compradores (0–100). */
  pct: number;
}

export const timeBuckets: TimeBucket[] = [
  { label: "0–7 dias", count: 22, pct: 26 },
  { label: "8–15 dias", count: 31, pct: 37 },
  { label: "16–30 dias", count: 19, pct: 23 },
  { label: "31+ dias", count: 12, pct: 14 },
];

/** Conversões recentes com o tempo de jornada de cada membro. */
export interface ConversionRow {
  member: string;
  joined: string;
  purchased: string;
  days: number;
  value: string;
}

export const recentConversions: ConversionRow[] = [
  { member: "J. S.", joined: "22/04", purchased: "09/05", days: 17, value: "R$ 15.346" },
  { member: "A. L.", joined: "03/05", purchased: "09/05", days: 6, value: "R$ 24.893" },
  { member: "M. R.", joined: "18/04", purchased: "07/05", days: 19, value: "R$ 30.744" },
  { member: "P. C.", joined: "04/05", purchased: "06/05", days: 2, value: "R$ 39.394" },
  { member: "R. T.", joined: "12/04", purchased: "05/05", days: 23, value: "R$ 18.200" },
  { member: "C. M.", joined: "01/05", purchased: "11/05", days: 10, value: "R$ 21.870" },
];

/** Faixa de dias considerada "rápida" para o badge de destaque na tabela. */
export const FAST_JOURNEY_DAYS = 7;
