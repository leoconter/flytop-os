/**
 * Dados ilustrativos da Tela do Vendedor. Portado do preview da Fase 1.
 */
import type { Metric } from "./dashboard-data";

export const vendorName = "Marina";
export const vendorTeam = "Antônio";

export const vendorMetrics: Metric[] = [
  { label: "% da sua meta", value: "62%", tone: "blue", bar: { pct: 62 } },
  {
    label: "Valor de vendas",
    value: "R$ 248.040",
    hint: "meta: R$ 400.000",
    privateValue: true,
    privateHint: true,
  },
  {
    label: "Nº de vendas",
    value: "12",
    hint: "+3 vs mesma data em abril",
    hintTone: "positive",
  },
  { label: "Seu ticket médio", value: "R$ 20.670", hint: "por venda", privateValue: true },
];

/** Evolução acumulada em maio (dias 1..11), preenchendo dias sem venda. */
const vendorDaily: Record<number, number> = {
  1: 0,
  2: 18200,
  4: 18200,
  5: 39394,
  6: 78788,
  7: 109532,
  8: 109532,
  9: 134425,
  11: 248040,
};

export const vendorEvolution: { labels: number[]; values: number[] } = (() => {
  const labels: number[] = [];
  const values: number[] = [];
  for (let d = 1; d <= 11; d++) {
    labels.push(d);
    const prev = values[values.length - 1] ?? 0;
    values.push(vendorDaily[d] !== undefined ? vendorDaily[d] : prev);
  }
  return { labels, values };
})();

export interface TeamRank {
  name: string;
  sales: string;
  revenue: string;
  me?: boolean;
}

export const teamRanking: TeamRank[] = [
  { name: "Equipe Antônio · sua equipe", sales: "34 vendas", revenue: "R$ 706.040", me: true },
  { name: "Equipe Matheus", sales: "30 vendas", revenue: "R$ 616.820" },
];

export interface RecentSale {
  date: string;
  route: string;
  client: string;
  cabin: string;
  value: string;
}

export const recentSales: RecentSale[] = [
  { date: "11/05", route: "GRU-MIA-GRU", client: "J. S.", cabin: "Executiva", value: "R$ 15.346" },
  { date: "09/05", route: "GRU-FCO-GRU", client: "A. L.", cabin: "Executiva", value: "R$ 24.893" },
  { date: "07/05", route: "GRU-DOH-ATH-DOH-GRU", client: "M. R.", cabin: "Business", value: "R$ 30.744" },
  { date: "06/05", route: "GRU-MCO-GRU", client: "P. C.", cabin: "Executiva", value: "R$ 39.394" },
  { date: "05/05", route: "GRU-LIS-GRU", client: "R. T.", cabin: "Executiva", value: "R$ 18.200" },
];
