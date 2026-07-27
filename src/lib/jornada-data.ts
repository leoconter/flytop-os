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
    value: "42 dias",
    tone: "blue",
    hint: "da entrada na comunidade à 1ª compra",
  },
  {
    label: "Tempo mediano",
    value: "31 dias",
    hint: "metade compra antes disso",
  },
  {
    label: "Compradores da comunidade",
    value: "90,6%",
    tone: "green",
    hint: "58 de 64 vendas no mês",
  },
  {
    label: "Janela mais comum",
    value: "31–60 dias",
    hint: "33% das compras",
  },
];

/** Distribuição do tempo entre entrar na comunidade e comprar. */
export interface TimeBucket {
  label: string;
  count: number;
}

export const timeBuckets: TimeBucket[] = [
  { label: "0–7", count: 4 },
  { label: "8–15", count: 7 },
  { label: "16–30", count: 14 },
  { label: "31–60", count: 19 },
  { label: "61–90", count: 9 },
  { label: "90+", count: 5 },
];

/** Índice da faixa em destaque (janela mais comum). */
export const timeBucketHighlight = 3;

/** Tempo médio (em dias) até a compra, por mês — últimos 6 meses. */
export const monthlyAvgDays: { labels: string[]; values: number[] } = {
  labels: ["dez", "jan", "fev", "mar", "abr", "mai"],
  values: [38, 45, 41, 44, 39, 42],
};

/** Conversões recentes com o tempo de jornada de cada membro. */
export interface ConversionRow {
  member: string;
  joined: string;
  purchased: string;
  days: number;
  value: string;
}

export const recentConversions: ConversionRow[] = [
  { member: "J. S.", joined: "22/03", purchased: "09/05", days: 48, value: "R$ 15.346" },
  { member: "A. L.", joined: "03/05", purchased: "09/05", days: 6, value: "R$ 24.893" },
  { member: "M. R.", joined: "18/03", purchased: "07/05", days: 50, value: "R$ 30.744" },
  { member: "P. C.", joined: "04/05", purchased: "06/05", days: 2, value: "R$ 39.394" },
  { member: "R. T.", joined: "02/04", purchased: "05/05", days: 33, value: "R$ 18.200" },
  { member: "C. M.", joined: "10/04", purchased: "11/05", days: 31, value: "R$ 21.870" },
];

/** Faixa de dias considerada "rápida" para o badge de destaque na tabela. */
export const FAST_JOURNEY_DAYS = 7;
