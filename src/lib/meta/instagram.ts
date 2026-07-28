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
 * ISR de 1h (`next.revalidate`) — módulo só para uso em Server Components.
 */
import type { PostRow, PostType } from "@/lib/social-data";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const REVALIDATE_SECONDS = 3600;
const PERIOD_DAYS = 30;

export interface IgDailySeries {
  labels: string[];
  values: number[];
}

export interface IgSocialLive {
  username: string;
  followers: number;
  /** Soma de novos seguidores nos últimos 30 dias (null se indisponível). */
  newFollowers: number | null;
  /** Novos seguidores por dia, últimos 30 dias (null se indisponível). */
  followerTrend: IgDailySeries | null;
  /** Posts publicados nos últimos 30 dias. */
  posts: PostRow[];
  postsTotals: { count: number; likes: number; comments: number };
  reach: number | null;
  views: number | null;
  /** Interações totais ÷ alcance, em % (null se alcance indisponível). */
  engagementPct: number | null;
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

interface IgMediaList {
  data: {
    id: string;
    timestamp: string;
    media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
    like_count?: number;
    comments_count?: number;
  }[];
}

/* -------------------------------- coleta ---------------------------------- */

const MEDIA_TYPE_LABEL: Record<string, PostType> = {
  IMAGE: "Image",
  VIDEO: "Video",
  CAROUSEL_ALBUM: "Carousel Album",
};

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

/**
 * Busca tudo que a tela Social precisa. Retorna null quando o app Meta não
 * está configurado ou a API falha — a tela usa os dados ilustrativos.
 */
export async function getInstagramSocial(): Promise<IgSocialLive | null> {
  if (!metaConfigured()) return null;

  const ig = process.env.META_IG_USER_ID!;
  const until = Math.floor(Date.now() / 1000);
  const since = until - PERIOD_DAYS * 24 * 60 * 60;
  const range = { since: String(since), until: String(until) };

  try {
    const profile = await graphGet<IgProfile>(ig, {
      fields: "username,followers_count,media_count",
    });

    // Alcance + interações do período (agregado). "views" substituiu
    // "impressions" na v22+; pedimos separado para tolerar contas/versões
    // em que uma métrica específica falhe.
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

    const media = await graphGet<IgMediaList>(`${ig}/media`, {
      fields: "id,timestamp,media_type,like_count,comments_count",
      limit: "50",
    });

    const totalOf = (res: InsightTotalValue | null, name: string) =>
      res?.data.find((d) => d.name === name)?.total_value?.value ?? null;

    const reachTotal = totalOf(reach, "reach");
    const interactions = totalOf(reach, "total_interactions");
    const viewsTotal = totalOf(views, "views");

    const daily = followerSeries?.data.find((d) => d.name === "follower_count")?.values;
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
    const posts: PostRow[] = media.data
      .filter((m) => new Date(m.timestamp) >= cutoff)
      .map((m) => {
        const d = new Date(m.timestamp);
        return {
          datetime: `${dateFmt.format(d)} às ${timeFmt.format(d)}`,
          type: MEDIA_TYPE_LABEL[m.media_type] ?? "Image",
          likes: m.like_count ?? 0,
          comments: m.comments_count ?? 0,
        };
      });

    return {
      username: profile.username,
      followers: profile.followers_count,
      newFollowers,
      followerTrend,
      posts,
      postsTotals: {
        count: posts.length,
        likes: posts.reduce((sum, p) => sum + p.likes, 0),
        comments: posts.reduce((sum, p) => sum + p.comments, 0),
      },
      reach: reachTotal,
      views: viewsTotal,
      engagementPct:
        reachTotal && interactions !== null
          ? (interactions / reachTotal) * 100
          : null,
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
