/**
 * Dados ilustrativos do Mini CRM (registro de interesse + embarques/retornos 48h).
 * Portado do preview da Fase 1. Data de referência: 30/06/2026.
 */
import type { Metric } from "./dashboard-data";

/** Normaliza cidade para casar leads com alertas (remove acento, emoji e caixa). */
export function normalizeCity(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Alerta já enviado às comunidades (usado para casar com o interesse do lead). */
export interface AlertaEnviado {
  origem: string;
  destino: string;
  companhia: string;
  preco: string;
  quando: string;
}

export const alertasEnviados: AlertaEnviado[] = [
  { origem: "São Paulo", destino: "Lisboa", companhia: "TAP Air Portugal", preco: "R$ 3.180", quando: "hoje · 09:12" },
  { origem: "Rio de Janeiro", destino: "Paris", companhia: "Air France", preco: "R$ 4.210", quando: "hoje · 08:40" },
  { origem: "São Paulo", destino: "Tóquio", companhia: "Air France", preco: "R$ 12.680", quando: "ontem · 17:20" },
  { origem: "São Paulo", destino: "Roma", companhia: "ITA Airways", preco: "R$ 5.410", quando: "ontem · 11:05" },
  { origem: "São Paulo", destino: "Miami", companhia: "American Airlines", preco: "R$ 2.940", quando: "28/06 · 15:48" },
  { origem: "São Paulo", destino: "Madri", companhia: "Iberia", preco: "R$ 3.560", quando: "27/06 · 10:30" },
];

/** Mês de interesse de viagem (ex.: "2026-07" → "Jul/26"). */
export interface MesOption {
  key: string;
  label: string;
}

/** 12 meses a partir de julho/2026 (referência da Fase 1). */
export const mesesOptions: MesOption[] = [
  { key: "2026-07", label: "Jul/26" },
  { key: "2026-08", label: "Ago/26" },
  { key: "2026-09", label: "Set/26" },
  { key: "2026-10", label: "Out/26" },
  { key: "2026-11", label: "Nov/26" },
  { key: "2026-12", label: "Dez/26" },
  { key: "2027-01", label: "Jan/27" },
  { key: "2027-02", label: "Fev/27" },
  { key: "2027-03", label: "Mar/27" },
  { key: "2027-04", label: "Abr/27" },
  { key: "2027-05", label: "Mai/27" },
  { key: "2027-06", label: "Jun/27" },
];

const MES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/** Rótulo curto de um mês a partir da chave "AAAA-MM" (ex.: "Jul/26"). */
export function mesLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return key;
  return `${MES_ABREV[m - 1]}/${String(y).slice(2)}`;
}

/** Lead com interesse registrado por um vendedor. */
export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  destino: string;
  /** Um ou mais meses de interesse de viagem (chaves "AAAA-MM"). */
  meses: string[];
  criadoEm: string;
}

export const leadsSeed: Lead[] = [
  { id: "ld-1", nome: "Ana Souza", telefone: "+55 11 98765-4321", origem: "São Paulo", destino: "Orlando", meses: ["2026-12", "2027-01"], criadoEm: "hoje · 10:22" },
  { id: "ld-2", nome: "Carlos Lima", telefone: "+55 11 99123-4567", origem: "São Paulo", destino: "Lisboa", meses: ["2026-09"], criadoEm: "hoje · 09:05" },
  { id: "ld-3", nome: "Marina Alves", telefone: "+55 21 98811-2200", origem: "Rio de Janeiro", destino: "Paris", meses: ["2026-10", "2026-11"], criadoEm: "ontem · 18:40" },
  { id: "ld-4", nome: "Pedro Rocha", telefone: "+55 11 97400-1188", origem: "São Paulo", destino: "Tóquio", meses: ["2027-03"], criadoEm: "ontem · 16:12" },
  { id: "ld-5", nome: "Juliana Dias", telefone: "+55 11 96555-7788", origem: "São Paulo", destino: "Cancún", meses: ["2026-07"], criadoEm: "28/06 · 14:03" },
  { id: "ld-6", nome: "Rafael Nunes", telefone: "+55 21 99677-3421", origem: "Rio de Janeiro", destino: "Buenos Aires", meses: ["2026-08", "2026-09"], criadoEm: "28/06 · 11:47" },
];

/** Retorna o alerta enviado que casa com origem + destino do lead, se houver. */
export function matchAlerta(lead: Pick<Lead, "origem" | "destino">): AlertaEnviado | undefined {
  return alertasEnviados.find(
    (a) =>
      normalizeCity(a.origem) === normalizeCity(lead.origem) &&
      normalizeCity(a.destino) === normalizeCity(lead.destino),
  );
}

/** Só dígitos, para montar link do WhatsApp. */
export function waLink(telefone: string): string {
  return `https://wa.me/${telefone.replace(/\D/g, "")}`;
}

const prontos = leadsSeed.filter((l) => matchAlerta(l)).length;

export const crmMetrics: Metric[] = [
  { label: "Leads ativos", value: String(leadsSeed.length), hint: "interesses registrados" },
  { label: "Prontos para chamar", value: String(prontos), hint: "com alerta enviado", hintTone: "positive" },
  { label: "Aguardando alerta", value: String(leadsSeed.length - prontos), hint: "sem oferta ainda" },
  { label: "Destino mais pedido", value: "Lisboa", small: true, hint: "3 interesses" },
];

/** Voo de embarque (ida) ou retorno (volta) nas próximas 48h. */
export interface VooCRM {
  id: string;
  cliente: string;
  telefone: string;
  trecho: string;
  companhia: string;
  quando: string;
  horas: number;
  localizador: string;
}

export const embarques48h: VooCRM[] = [
  { id: "emb-1", cliente: "Fernanda Melo", telefone: "+55 11 98432-1100", trecho: "GRU → LIS", companhia: "TAP Air Portugal", quando: "hoje · 23:40", horas: 8, localizador: "TP7X2K" },
  { id: "emb-2", cliente: "Bruno Castro", telefone: "+55 21 97655-8842", trecho: "GIG → MIA", companhia: "American Airlines", quando: "amanhã · 06:15", horas: 15, localizador: "AA9QLM" },
  { id: "emb-3", cliente: "Camila Reis", telefone: "+55 11 99012-3344", trecho: "GRU → FCO", companhia: "ITA Airways", quando: "amanhã · 14:20", horas: 23, localizador: "AZ4RT8" },
  { id: "emb-4", cliente: "Diego Santos", telefone: "+55 11 98120-5567", trecho: "GRU → CDG", companhia: "Air France", quando: "02/07 · 10:05", horas: 43, localizador: "AF2W9P" },
  { id: "emb-5", cliente: "Larissa Pinto", telefone: "+55 11 97788-2231", trecho: "GRU → JFK", companhia: "LATAM", quando: "02/07 · 22:30", horas: 47, localizador: "LA6KD3" },
];

export const retornos48h: VooCRM[] = [
  { id: "ret-1", cliente: "Marcos Vieira", telefone: "+55 11 98900-1234", trecho: "LIS → GRU", companhia: "TAP Air Portugal", quando: "hoje · 18:50", horas: 3, localizador: "TP1B7Y" },
  { id: "ret-2", cliente: "Patrícia Gomes", telefone: "+55 11 99544-8890", trecho: "MAD → GRU", companhia: "Iberia", quando: "amanhã · 11:40", horas: 20, localizador: "IB5N2Q" },
  { id: "ret-3", cliente: "Thiago Barros", telefone: "+55 21 98233-6677", trecho: "MIA → GIG", companhia: "American Airlines", quando: "amanhã · 20:10", horas: 29, localizador: "AA3ZP9" },
  { id: "ret-4", cliente: "Sofia Cardoso", telefone: "+55 11 97011-4523", trecho: "FCO → GRU", companhia: "ITA Airways", quando: "02/07 · 09:30", horas: 42, localizador: "AZ8LK4" },
];

export const embarquesMetrics: Metric[] = [
  { label: "Embarques em 48h", value: String(embarques48h.length), hint: "clientes partindo" },
  { label: "Retornos em 48h", value: String(retornos48h.length), hint: "clientes voltando" },
  { label: "Próximo embarque", value: "8h", small: true, hint: "Fernanda · GRU → LIS", hintTone: "positive" },
  { label: "Próximo retorno", value: "3h", small: true, hint: "Marcos · LIS → GRU" },
];
