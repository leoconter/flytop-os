/**
 * Dados ilustrativos do Dashboard Interno (visão dos sócios).
 * Portado do preview da Fase 1.
 */
import type { ListItem, Metric } from "./dashboard-data";

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

/** Lista completa de companhias por receita (Interno). */
export const companiesList: ListItem[] = [
  { name: "LATAM Airlines Brasil", meta: "19,8% do faturamento", value: "R$ 261.359" },
  { name: "United Airlines", meta: "16,2% do faturamento", value: "R$ 214.142" },
  { name: "Qatar Airways", meta: "11,6% do faturamento", value: "R$ 153.718" },
  { name: "TAP Air Portugal", meta: "9,4% do faturamento", value: "R$ 124.349" },
  { name: "American Airlines", meta: "8,1% do faturamento", value: "R$ 107.152" },
  { name: "Air France", meta: "6,7% do faturamento", value: "R$ 88.632" },
  { name: "ITA Airways", meta: "5,2% do faturamento", value: "R$ 68.789" },
];

/** Lista completa de destinos/trechos por receita (Interno). */
export const routesList: ListItem[] = [
  { name: "GRU-DOH-ATH-DOH-GRU", meta: "5 vendas", value: "R$ 153.718", mono: true },
  { name: "GRU-MIA-GRU", meta: "7 vendas", value: "R$ 107.420", mono: true },
  { name: "GRU-MCO-GRU", meta: "2 vendas", value: "R$ 78.788", mono: true },
  { name: "GRU-PTY-CUN-PTY-GRU", meta: "1 venda", value: "R$ 74.800", mono: true },
  { name: "GRU-FCO-GRU", meta: "3 vendas", value: "R$ 74.680", mono: true },
  { name: "GRU-LIS-GRU", meta: "4 vendas", value: "R$ 68.200", mono: true },
  { name: "GRU-CDG-GRU", meta: "3 vendas", value: "R$ 61.540", mono: true },
  { name: "GRU-JFK-GRU", meta: "2 vendas", value: "R$ 52.900", mono: true },
];

export const consolidatorRows: ConsolidatorRow[] = [
  { name: "Trend Operadora", sales: 19, revenue: "R$ 396.858", share: "30,0%" },
  { name: "Flytour", sales: 14, revenue: "R$ 291.029", share: "22,0%" },
  { name: "BWT Operadora", sales: 12, revenue: "R$ 238.115", share: "18,0%" },
  { name: "Agaxtur", sales: 10, revenue: "R$ 198.429", share: "15,0%" },
  { name: "Emissão direta", sales: 9, revenue: "R$ 198.429", share: "15,0%" },
];
