/**
 * Dados ilustrativos do Dashboard Interno (visão dos sócios).
 * Portado do preview da Fase 1.
 */
import type { ListItem, Metric } from "./dashboard-data";

export const internoMetrics: Metric[] = [
  {
    label: "Receita no mês",
    value: "R$ 1,32M",
    hint: "64 vendas emitidas",
    privateValue: true,
    privateHint: true,
  },
  { label: "Ticket médio", value: "R$ 20.670", hint: "por venda", privateValue: true },
  {
    label: "Vendas / dia útil",
    value: "8,0",
    hint: "+12% vs abril",
    hintTone: "positive",
  },
];

/** Vendas por companhia (nº de vendas). */
export const salesByCompany: ListItem[] = [
  { name: "LATAM Airlines Brasil", meta: "21,9% das vendas", value: "14 vendas" },
  { name: "United Airlines", meta: "17,2% das vendas", value: "11 vendas" },
  { name: "Qatar Airways", meta: "12,5% das vendas", value: "8 vendas" },
  { name: "TAP Air Portugal", meta: "10,9% das vendas", value: "7 vendas" },
  { name: "American Airlines", meta: "9,4% das vendas", value: "6 vendas" },
  { name: "Air France", meta: "7,8% das vendas", value: "5 vendas" },
  { name: "ITA Airways", meta: "6,3% das vendas", value: "4 vendas" },
];

/** Vendas por destino/trecho (nº de vendas). */
export const salesByRoute: ListItem[] = [
  { name: "GRU-MIA-GRU", meta: "10,9% das vendas", value: "7 vendas", mono: true },
  { name: "GRU-DOH-ATH-DOH-GRU", meta: "7,8% das vendas", value: "5 vendas", mono: true },
  { name: "GRU-LIS-GRU", meta: "6,3% das vendas", value: "4 vendas", mono: true },
  { name: "GRU-FCO-GRU", meta: "4,7% das vendas", value: "3 vendas", mono: true },
  { name: "GRU-CDG-GRU", meta: "4,7% das vendas", value: "3 vendas", mono: true },
  { name: "GRU-MCO-GRU", meta: "3,1% das vendas", value: "2 vendas", mono: true },
  { name: "GRU-JFK-GRU", meta: "3,1% das vendas", value: "2 vendas", mono: true },
];

/** Vendas por classe (nº de vendas). */
export const salesByClass: ListItem[] = [
  { name: "Executiva", meta: "64,1% das vendas", value: "41 vendas" },
  { name: "First", meta: "21,9% das vendas", value: "14 vendas" },
  { name: "Premium Economy", meta: "14,1% das vendas", value: "9 vendas" },
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
  { label: "Trend", value: 30, color: "#1E56B8" },
  { label: "Flytour", value: 22, color: "#50549F" },
  { label: "BWT", value: 18, color: "#1E7A46" },
  { label: "Agaxtur", value: 15, color: "#B0761E" },
  { label: "Direta", value: 15, color: "#4A7FB5" },
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
