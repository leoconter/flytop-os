/**
 * Conector da Graph API (Meta) para as métricas orgânicas do Instagram —
 * alimenta a tela Social Media com dados reais quando as credenciais existem.
 *
 * Configuração via variáveis de ambiente (ver .env.local.example):
 *   META_ACCESS_TOKEN   token do app (ideal: usuário do sistema, longa duração)
 *   META_IG_USER_ID     ID da conta profissional do Instagram (descobrir com
 *                       `node scripts/meta-discover.mjs`)
 *   META_GRAPH_VERSION  opcional, padrão v23.0
 *
 * Sem credenciais (ou em caso de erro na API) as funções retornam null e a
 * tela cai nos dados ilustrativos de social-data.ts. Todas as chamadas usam
 * cache de 1h (`next.revalidate`) — módulo só para uso em Server Components.
 */
import type { PostRow, PostType } from "@/lib/social-data";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const REVALIDATE_SECONDS = 3600;

/** Períodos de análise suportados (a série de seguidores só cobre 30 dias). */
export const SOCIAL_PERIODS = [7, 14, 30] as const;
export type SocialPeriod = (typeof SOCIAL_PERIODS)[number];

export interface IgDailySeries {
  labels: string[];
  values: number[];
}

export interface IgSocialLive {
  username: string;
  periodDays: SocialPeriod;
  followers: number;
  /** Soma de novos seguidores no período (null se indisponível). */
  newFollowers: number | null;
  /** Novos seguidores por dia no período (null se indisponível). */
  followerTrend: IgDailySeries | null;
  /** Posts publicados no período. */
  posts: PostRow[];
  postsTotals: {
    count: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  /** Métricas da conta no período — incluem orgânico + pago. */
  reach: number | null;
  views: number | null;
  /** Interações totais ÷ alcance, em % (null se alcance indisponível). */
  engagementPct: number | null;
  /**
   * Recorte orgânico: agregado dos insights dos posts do período (soma por
   * post — o alcance pode contar a mesma pessoa mais de uma vez).
   */
  organic: {
    reach: number;
    views: number;
    interactions: number;
    engagementPct: number | null;
  } | null;
}

export function metaConfigured(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_IG_USER_ID);
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", process.env.META_ACCESS_TOKEN!);

  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  const body = await res.json();
  if (!res.ok || body.error) {
    throw new Error(
      `Graph API ${path}: ${body?.error?.message ?? `HTTP ${res.status}`}`,
    );
  }
  return body as T;
}

/* ------------------------------- tipos da API ------------------------------ */

interface IgProfile {
  username: string;
  followers_count: number;
  media_count: number;
}

interface InsightTotalValue {
  data: { name: string; total_value?: { value?: number } }[];
}

interface InsightTimeSeries {
  data: {
    name: string;
    values: { value: number; end_time: string }[];
  }[];
}

interface IgMediaChild {
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
}

interface IgMediaItem {
  id: string;
  timestamp: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  like_count?: number;
  comments_count?: number;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  children?: { data: IgMediaChild[] };
  insights?: { data: { name: string; values?: { value: number }[] }[] };
}

interface IgMediaList {
  data: IgMediaItem[];
}

/* -------------------------------- coleta ---------------------------------- */

const MEDIA_TYPE_LABEL: Record<string, PostType> = {
  IMAGE: "Image",
  VIDEO: "Video",
  CAROUSEL_ALBUM: "Carousel Album",
};

const MEDIA_FIELDS_BASE =
  "id,timestamp,media_type,like_count,comments_count,permalink," +
  "media_url,thumbnail_url,children{media_type,media_url,thumbnail_url}";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});
const dayLabelFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

/** Thumbnail exibível do post (vídeos usam thumbnail_url; álbuns, o 1º item). */
function thumbOf(m: IgMediaItem): string | null {
  if (m.media_type === "VIDEO") return m.thumbnail_url ?? null;
  if (m.media_type === "CAROUSEL_ALBUM") {
    const first = m.children?.data?.[0];
    if (!first) return m.media_url ?? null;
    return (first.media_type === "VIDEO" ? first.thumbnail_url : first.media_url) ?? null;
  }
  return m.media_url ?? null;
}

function mediaMetric(m: IgMediaItem, name: string): number | null {
  return m.insights?.data.find((d) => d.name === name)?.values?.[0]?.value ?? null;
}

/**
 * Busca tudo que a tela Social precisa para o período dado. Retorna null
 * quando o app Meta não está configurado ou a API falha — a tela usa os
 * dados ilustrativos.
 */
export async function getInstagramSocial(
  days: SocialPeriod = 30,
): Promise<IgSocialLive | null> {
  if (!metaConfigured()) return null;

  const ig = process.env.META_IG_USER_ID!;
  // Âncora na hora cheia: URLs estáveis por 1h → cache de dados aproveitado.
  const until = Math.floor(Date.now() / 3_600_000) * 3600;
  const since = until - days * 24 * 60 * 60;
  const range = { since: String(since), until: String(until) };

  try {
    const profile = await graphGet<IgProfile>(ig, {
      fields: "username,followers_count,media_count",
    });

    // Alcance + interações do período (agregado da conta; inclui pago).
    // "views" substituiu "impressions" na v22+; pedimos separado para
    // tolerar contas/versões em que uma métrica específica falhe.
    const reach = await graphGet<InsightTotalValue>(`${ig}/insights`, {
      metric: "reach,total_interactions",
      period: "day",
      metric_type: "total_value",
      ...range,
    }).catch(() => null);

    const views = await graphGet<InsightTotalValue>(`${ig}/insights`, {
      metric: "views",
      period: "day",
      metric_type: "total_value",
      ...range,
    }).catch(() => null);

    // Série diária de novos seguidores (a API só expõe os últimos 30 dias;
    // indisponível para contas com menos de 100 seguidores).
    const followerSeries = await graphGet<InsightTimeSeries>(`${ig}/insights`, {
      metric: "follower_count",
      period: "day",
      ...range,
    }).catch(() => null);

    // Mídia com insights por post (orgânico). Se a expansão de insights
    // falhar (contas/mídias sem suporte), refaz sem ela.
    const media = await graphGet<IgMediaList>(`${ig}/media`, {
      fields: `${MEDIA_FIELDS_BASE},insights.metric(reach,views,saved,shares)`,
      limit: "50",
    }).catch(() =>
      graphGet<IgMediaList>(`${ig}/media`, {
        fields: MEDIA_FIELDS_BASE,
        limit: "50",
      }),
    );

    const totalOf = (res: InsightTotalValue | null, name: string) =>
      res?.data.find((d) => d.name === name)?.total_value?.value ?? null;

    const reachTotal = totalOf(reach, "reach");
    const interactions = totalOf(reach, "total_interactions");
    const viewsTotal = totalOf(views, "views");

    const daily = followerSeries?.data
      .find((d) => d.name === "follower_count")
      ?.values.slice();
    // A Meta consolida follower_count com ~1–2 dias de atraso; os últimos
    // pontos chegam como 0 e criariam uma queda falsa no gráfico.
    let trimmed = 0;
    while (daily?.length && daily[daily.length - 1].value === 0 && trimmed < 2) {
      daily.pop();
      trimmed++;
    }
    const followerTrend: IgDailySeries | null = daily?.length
      ? {
          labels: daily.map((v) => dayLabelFmt.format(new Date(v.end_time))),
          values: daily.map((v) => v.value),
        }
      : null;
    const newFollowers = followerTrend
      ? followerTrend.values.reduce((sum, v) => sum + v, 0)
      : null;

    const cutoff = new Date(since * 1000);
    const inPeriod = media.data.filter((m) => new Date(m.timestamp) >= cutoff);

    const posts: PostRow[] = inPeriod.map((m) => {
      const d = new Date(m.timestamp);
      return {
        datetime: `${dateFmt.format(d)} às ${timeFmt.format(d)}`,
        type: MEDIA_TYPE_LABEL[m.media_type] ?? "Image",
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        shares: mediaMetric(m, "shares") ?? undefined,
        saves: mediaMetric(m, "saved") ?? undefined,
        thumb: thumbOf(m),
        permalink: m.permalink,
      };
    });

    // Recorte orgânico: soma dos insights por post do período.
    const organicPosts = inPeriod.filter((m) => m.insights);
    const sumMetric = (name: string) =>
      organicPosts.reduce((sum, m) => sum + (mediaMetric(m, name) ?? 0), 0);
    let organic: IgSocialLive["organic"] = null;
    if (organicPosts.length) {
      const organicReach = sumMetric("reach");
      const organicInteractions =
        posts.reduce((s, p) => s + p.likes + p.comments, 0) +
        sumMetric("shares") +
        sumMetric("saved");
      organic = {
        reach: organicReach,
        views: sumMetric("views"),
        interactions: organicInteractions,
        engagementPct:
          organicReach > 0 ? (organicInteractions / organicReach) * 100 : null,
      };
    }

    return {
      username: profile.username,
      periodDays: days,
      followers: profile.followers_count,
      newFollowers,
      followerTrend,
      posts,
      postsTotals: {
        count: posts.length,
        likes: posts.reduce((sum, p) => sum + p.likes, 0),
        comments: posts.reduce((sum, p) => sum + p.comments, 0),
        shares: posts.reduce((sum, p) => sum + (p.shares ?? 0), 0),
        saves: posts.reduce((sum, p) => sum + (p.saves ?? 0), 0),
      },
      reach: reachTotal,
      views: viewsTotal,
      engagementPct:
        reachTotal && interactions !== null
          ? (interactions / reachTotal) * 100
          : null,
      organic,
    };
  } catch (err) {
    console.error("[meta/instagram] falha ao buscar métricas:", err);
    return null;
  }
}

/* ------------------------------ formatação -------------------------------- */

/** 890432 → "890,4K" · 2103000 → "2,1M" · 942 → "942" (padrão pt-BR). */
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "M";
  if (n >= 10_000) return Math.round(n / 1_000).toLocaleString("pt-BR") + "K";
  if (n >= 1_000) return (n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString("pt-BR");
}

export function fmtInt(n: number): string {
  return n.toLocaleString("pt-BR");
}
