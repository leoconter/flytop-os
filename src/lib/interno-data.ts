/**
 * Dados ilustrativos do Dashboard Interno (visão dos sócios).
 * Portado do preview da Fase 1.
 */
import type { Metric } from "./dashboard-data";

// KPIs do Interno: reaproveitados do Geral, sem meta/projeção (essas dependem
// do mês fechado; aqui filtramos por data), + número de vendas.
export const internoMetrics: Metric[] = [
  {
    label: "Faturamento",
    value: "R$ 1,32M",
    hint: "R$ 1.322.860 no período",
    privateValue: true,
    privateHint: true,
  },
  { label: "Ticket médio", value: "R$ 20.670", hint: "por venda", privateValue: true },
  { label: "Número de vendas", value: "64", hint: "emitidas no período" },
];

export interface MonthlyRevenue {
  labels: string[];
  values: number[];
  /** Índice da barra destacada (mês parcial). */
  highlightIndex: number;
}

export const revenueByMonth: MonthlyRevenue = {
  labels: ["dez", "jan", "fev", "mar", "abr", "mai*"],
  values: [3_420_000, 2_980_000, 3_510_000, 4_020_000, 3_770_000, 1_322_860],
  highlightIndex: 5,
};

export interface ConsolidatorSlice {
  label: string;
  value: number; // participação (%)
  color: string;
}

export const consolidators: ConsolidatorSlice[] = [
  { label: "Trend", value: 30, color: "#007AFF" },
  { label: "Flytour", value: 22, color: "#5E5CE6" },
  { label: "BWT", value: 18, color: "#34C759" },
  { label: "Agaxtur", value: 15, color: "#FF9500" },
  { label: "Direta", value: 15, color: "#32ADE6" },
];

export interface ConsolidatorRow {
  name: string;
  sales: number;
  revenue: string;
  share: string;
}

export const consolidatorRows: ConsolidatorRow[] = [
  { name: "Trend Operadora", sales: 19, revenue: "R$ 396.858", share: "30,0%" },
  { name: "Flytour", sales: 14, revenue: "R$ 291.029", share: "22,0%" },
  { name: "BWT Operadora", sales: 12, revenue: "R$ 238.115", share: "18,0%" },
  { name: "Agaxtur", sales: 10, revenue: "R$ 198.429", share: "15,0%" },
  { name: "Emissão direta", sales: 9, revenue: "R$ 198.429", share: "15,0%" },
];
