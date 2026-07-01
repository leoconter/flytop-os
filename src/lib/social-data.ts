/**
 * Dados ilustrativos da tela de Social Media (marketing · presença).
 *
 * Estrutura seguindo o mapa de métricas definido pelo time:
 *
 *   Social Media → Métricas
 *     ├─ Seguidores
 *     ├─ Novos Seguidores → Tendência
 *     ├─ Posts
 *     ├─ Alcance
 *     ├─ Impressão
 *     └─ Engajamento
 *
 * Segue o mesmo padrão da tela de Métricas de Ads: grade de métricas + gráfico
 * de tendência + recorte por rede.
 */
import type { Metric } from "./dashboard-data";

/** Grade principal de métricas do mês. */
export const socialMetrics: Metric[] = [
  { label: "Seguidores", value: "48.320", hint: "base total" },
  {
    label: "Novos seguidores",
    value: "+2.180",
    tone: "blue",
    hint: "+12% vs abril",
    hintTone: "positive",
  },
  { label: "Posts", value: "42", hint: "publicados no mês" },
  { label: "Alcance", value: "890K", hint: "pessoas únicas" },
  { label: "Impressões", value: "2,1M", hint: "exibições" },
  { label: "Engajamento", value: "6,4%", tone: "green", hint: "taxa média" },
];

/* ---------------------- Gráfico: tendência de seguidores -------------------- */

export interface FollowersTrendSeries {
  labels: string[];
  /** Novos seguidores por mês. */
  values: number[];
}

export const followersTrend: FollowersTrendSeries = {
  labels: ["dez", "jan", "fev", "mar", "abr", "mai"],
  values: [1_450, 1_620, 1_780, 1_690, 1_940, 2_180],
};

/* ------------------------------ Recorte por rede ---------------------------- */

export interface SocialNetworkRow {
  network: string;
  followers: string;
  newFollowers: string;
  posts: string;
  engagement: string;
}

/** Por rede social — maio 2026. Fecha com a base total (48.320) e novos (2.180). */
export const socialByNetwork: SocialNetworkRow[] = [
  { network: "Instagram", followers: "31.400", newFollowers: "+1.420", posts: "24", engagement: "7,1%" },
  { network: "TikTok", followers: "9.860", newFollowers: "+520", posts: "10", engagement: "8,3%" },
  { network: "YouTube", followers: "4.210", newFollowers: "+160", posts: "4", engagement: "4,2%" },
  { network: "Facebook", followers: "2.850", newFollowers: "+80", posts: "4", engagement: "2,4%" },
];
