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

/* ------------------------------ Posts no período ---------------------------- */

export type PostType = "Image" | "Video" | "Carousel Album";

export interface PostRow {
  /** Data e hora da publicação (ex.: "29/06/2026 às 12:36"). */
  datetime: string;
  type: PostType;
  likes: number;
  comments: number;
  /** Compartilhamentos (insights por post; ausente nos dados ilustrativos antigos). */
  shares?: number;
  /** Salvamentos (insights por post). */
  saves?: number;
  /** URL da thumbnail do post (CDN do Instagram). */
  thumb?: string | null;
  /** Link do post no Instagram. */
  permalink?: string;
}

/** Posts publicados no período — junho 2026. */
export const postsInPeriod: PostRow[] = [
  { datetime: "29/06/2026 às 12:36", type: "Image", likes: 20, comments: 0, shares: 3, saves: 5 },
  { datetime: "22/06/2026 às 12:00", type: "Image", likes: 26, comments: 1, shares: 4, saves: 7 },
  { datetime: "17/06/2026 às 12:06", type: "Carousel Album", likes: 9, comments: 0, shares: 1, saves: 3 },
  { datetime: "15/06/2026 às 12:07", type: "Video", likes: 69, comments: 10, shares: 18, saves: 22 },
  { datetime: "10/06/2026 às 11:59", type: "Carousel Album", likes: 19, comments: 0, shares: 2, saves: 6 },
  { datetime: "08/06/2026 às 12:03", type: "Video", likes: 46, comments: 1, shares: 11, saves: 14 },
  { datetime: "01/06/2026 às 12:51", type: "Image", likes: 32, comments: 0, shares: 5, saves: 8 },
];

/** Totais agregados do período. */
export const postsTotals = {
  count: postsInPeriod.length,
  likes: postsInPeriod.reduce((sum, p) => sum + p.likes, 0),
  comments: postsInPeriod.reduce((sum, p) => sum + p.comments, 0),
  shares: postsInPeriod.reduce((sum, p) => sum + (p.shares ?? 0), 0),
  saves: postsInPeriod.reduce((sum, p) => sum + (p.saves ?? 0), 0),
};
