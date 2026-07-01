/**
 * Dados ilustrativos da tela de Alertas. Portado do preview da Fase 1.
 */
import type { AlertFields } from "./alert-message";
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

/* --------------------------- Dados de alertas ------------------------------ */

export interface CountItem {
  name: string;
  value: string;
}

export const alertsTotalMonth = "87";
export const alertsToday = "4";

export const alertsByCompany: CountItem[] = [
  { name: "LATAM", value: "23 alertas" },
  { name: "Air France", value: "14 alertas" },
  { name: "Qatar Airways", value: "11 alertas" },
  { name: "TAP Air Portugal", value: "9 alertas" },
  { name: "ITA Airways", value: "8 alertas" },
  { name: "American Airlines", value: "7 alertas" },
  { name: "United Airlines", value: "6 alertas" },
];

export const alertsByDestino: CountItem[] = [
  { name: "Lisboa", value: "12 alertas" },
  { name: "Paris", value: "10 alertas" },
  { name: "Roma", value: "9 alertas" },
  { name: "Tóquio", value: "7 alertas" },
  { name: "Miami", value: "7 alertas" },
  { name: "Nova York", value: "6 alertas" },
  { name: "Madri", value: "5 alertas" },
];

export const alertsByContinent: CountItem[] = [
  { name: "Europa", value: "41%" },
  { name: "Ásia", value: "23%" },
  { name: "América do Norte", value: "22%" },
  { name: "América do Sul", value: "14%" },
];

/* ---------------------- Alertas salvos para enviar depois ------------------ */

export interface SavedAlert {
  id: string;
  fields: AlertFields;
}

export const savedSeed: SavedAlert[] = [
  {
    id: "seed-lis",
    fields: {
      titulo: "✈️ ALERTA! LISBOA NA EXECUTIVA DA TAP COM 38% OFF!",
      origem: "São Paulo",
      destino: "Lisboa 🇵🇹",
      cabine: "Executiva",
      companhia: "TAP Air Portugal",
      de: "7900",
      por: "4890",
      xjuros: "6",
      idaDates: ["2026-08-12", "2026-08-14", "2026-08-18"],
      voltaDates: ["2026-08-22", "2026-08-25"],
    },
  },
  {
    id: "seed-mia",
    fields: {
      titulo: "✈️ BAIXOU! MIAMI NA EXECUTIVA COM 30% OFF!",
      origem: "São Paulo",
      destino: "Miami 🇺🇸",
      cabine: "Executiva",
      companhia: "American Airlines",
      de: "8900",
      por: "6230",
      xjuros: "10",
      idaDates: ["2026-09-05", "2026-09-08"],
      voltaDates: ["2026-09-18", "2026-09-20"],
    },
  },
];
