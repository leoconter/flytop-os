/**
 * Dados ilustrativos da tela de Métricas de Ads (marketing · captação).
 *
 * Portado do preview da Fase 1 (`flytop-os-preview-fase1.html`, seção "Métricas
 * de Ads") e reorganizado seguindo o mapa de métricas definido pelo time:
 *
 *   Ads → Métricas
 *     ├─ Investimento
 *     ├─ Alcance
 *     ├─ Impressão
 *     ├─ "Resultado"  → Clique botão Whats · CPA
 *     └─ "Comunidade" → Entradas · Saídas · "CPA final" · Membros (tendência)
 *
 * Os totais fecham com o mockup original: Investimento R$ 28.500 · Cliques
 * 14.200 · Entradas 7.812 · CPA final R$ 3,65 (28.500 / 7.812).
 */
import type { Metric } from "./dashboard-data";

/** Bloco 1 — investimento e entrega da mídia. */
export const adsMetrics: Metric[] = [
  {
    label: "Investimento",
    value: "R$ 28.500",
    hint: "neste mês",
    privateValue: true,
  },
  { label: "Alcance", value: "1,2M", hint: "pessoas únicas" },
  { label: "Impressões", value: "3,4M", hint: "exibições" },
];

/**
 * Bloco 2 — "Resultado": a ação otimizada nos anúncios (clique no botão do
 * WhatsApp) e o custo desse resultado reportado pela Meta (R$ 28.500 / 14.200).
 */
export const resultMetrics: Metric[] = [
  {
    label: "Cliques no WhatsApp",
    value: "14.200",
    tone: "blue",
    hint: "resultado principal",
  },
  {
    label: "CPA",
    value: "R$ 2,01",
    hint: "custo por clique no Whats",
    privateValue: true,
  },
];

/**
 * Bloco 3 — "Comunidade": o que aconteceu depois do clique. Entradas e saídas
 * reais nas comunidades, o custo verdadeiro por membro (CPA final) e o saldo
 * líquido de membros com a tendência do mês.
 */
export const communityMetrics: Metric[] = [
  { label: "Entradas na comunidade", value: "7.812", hint: "via anúncios" },
  { label: "Saídas", value: "1.244", hint: "no mesmo período" },
  {
    label: "CPA final",
    value: "R$ 3,65",
    tone: "green",
    hint: "por membro captado",
    privateValue: true,
  },
  {
    label: "Membros (líquido)",
    value: "+6.568",
    tone: "green",
    hint: "+8,2% vs abril",
    hintTone: "positive",
  },
];

/* ------------------------- Gráfico: investimento × CPA ---------------------- */

export interface AdsEfficiencySeries {
  labels: string[];
  /** Investimento mensal (R$), eixo esquerdo. */
  investment: number[];
  /** CPA final por membro (R$), eixo direito. */
  cpa: number[];
}

export const adsEfficiency: AdsEfficiencySeries = {
  labels: ["dez", "jan", "fev", "mar", "abr", "mai"],
  investment: [22_000, 24_500, 26_800, 27_500, 29_200, 28_500],
  cpa: [4.6, 4.2, 3.9, 3.7, 3.5, 3.65],
};

/* ------------------------------ Tabelas de recorte -------------------------- */

export interface AdsRow {
  /** Nome da campanha ou região. */
  name: string;
  investment: string;
  clicks: string;
  entries: string;
  cpa: string;
}

/** Por campanha — maio 2026. */
export const adsByCampaign: AdsRow[] = [
  { name: "Captação Geral", investment: "R$ 9.800", clicks: "4.900", entries: "2.940", cpa: "R$ 3,33" },
  { name: "Lookalike Compradores", investment: "R$ 6.200", clicks: "3.100", entries: "1.860", cpa: "R$ 3,33" },
  { name: "Remarketing Site", investment: "R$ 4.500", clicks: "2.250", entries: "1.350", cpa: "R$ 3,33" },
  { name: "Destinos Europa", investment: "R$ 4.200", clicks: "2.100", entries: "1.020", cpa: "R$ 4,12" },
  { name: "Destinos EUA", investment: "R$ 3.800", clicks: "1.850", entries: "642", cpa: "R$ 5,92" },
];

/**
 * Por região — mesma leitura da tabela por campanha, separando o investimento
 * entre São Paulo e Rio de Janeiro. Os totais batem com o mês:
 * R$ 24.200 + R$ 4.300 = R$ 28.500 · 12.100 + 2.100 = 14.200 · 6.900 + 912 = 7.812.
 */
export const adsByRegion: AdsRow[] = [
  { name: "São Paulo (SP)", investment: "R$ 24.200", clicks: "12.100", entries: "6.900", cpa: "R$ 3,51" },
  { name: "Rio de Janeiro (RJ)", investment: "R$ 4.300", clicks: "2.100", entries: "912", cpa: "R$ 4,71" },
];
