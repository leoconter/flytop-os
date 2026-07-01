/**
 * Dados ilustrativos da tela de Alertas. Portado do preview da Fase 1.
 */
import type { Metric } from "./dashboard-data";

export const alertMetrics: Metric[] = [
  { label: "Alertas hoje", value: "4", hint: "enviados às comunidades" },
  { label: "Alertas no mês", value: "87", hint: "+9 vs abril", hintTone: "positive" },
  { label: "Companhia mais alertada", value: "LATAM", small: true, hint: "23 alertas" },
  { label: "Continente em alta", value: "Europa", small: true, hint: "41% dos alertas" },
];

export const cabines = ["Executiva", "Business", "Premium Economy", "Econômica"];

export const companhias = [
  "Air France",
  "LATAM",
  "United Airlines",
  "Qatar Airways",
  "TAP Air Portugal",
  "American Airlines",
  "ITA Airways",
  "Emirates",
];

export interface DisparoOption {
  key: string;
  label: string;
  info: string;
  count: number;
  on: boolean;
}

export const disparoOptions: DisparoOption[] = [
  { key: "sp", label: "Comunidades SP", info: "41 grupos · 72.005", count: 41, on: true },
  { key: "rj", label: "Comunidades RJ", info: "4 grupos · 5.764", count: 4, on: false },
];

export interface AlertBankRow {
  when: string;
  route: string;
  company: string;
  cabin: string;
  price: string;
  groups: number;
  status: "Agendado" | "Enviado";
}

export const alertBank: AlertBankRow[] = [
  { when: "11/05 · 16:30", route: "GRU-FCO-GRU", company: "ITA Airways", cabin: "Executiva", price: "R$ 5.410", groups: 5, status: "Agendado" },
  { when: "11/05 · 14:02", route: "GRU-DOH-ATH-DOH-GRU", company: "Qatar Airways", cabin: "Business", price: "R$ 8.760", groups: 3, status: "Enviado" },
  { when: "11/05 · 11:40", route: "GRU-MIA-GRU", company: "American", cabin: "Executiva", price: "R$ 6.230", groups: 4, status: "Enviado" },
  { when: "11/05 · 09:14", route: "GRU-LIS-GRU", company: "TAP", cabin: "Executiva", price: "R$ 4.890", groups: 6, status: "Enviado" },
  { when: "10/05 · 18:20", route: "GRU-CDG-GRU", company: "Air France", cabin: "Business", price: "R$ 7.120", groups: 6, status: "Enviado" },
];

/** Valores padrão do formulário (exemplo Tóquio · Air France). */
export const defaultAlert = {
  titulo: "✈️ BAIXOU! TÓQUIO NA PREMIUM ECONOMY DA AIR FRANCE COM 41% OFF!",
  origem: "São Paulo",
  destino: "Tóquio 🇯🇵",
  cabine: "Premium Economy",
  companhia: "Air France",
  de: "21427",
  por: "12680",
  xjuros: "4",
  idaDates: [
    "2026-07-16", "2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23",
    "2026-08-01", "2026-08-03", "2026-08-04", "2026-08-05",
  ],
  voltaDates: [
    "2026-08-18", "2026-08-20", "2026-08-25", "2026-08-26",
    "2026-09-01", "2026-09-08", "2026-09-09",
  ],
};
