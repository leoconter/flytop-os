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
 *
 * Limites da API que o código contorna:
 *   - insights da conta aceitam no máximo 30 dias por chamada → o intervalo é
 *     quebrado em janelas e somado (alcance somado deixa de ser "únicos");
 *   - follower_count só existe para os últimos 30 dias corridos;
 *   - /media pagina de 50 em 50.
 */
import type { PostRow, PostType } from "@/lib/social-data";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const REVALIDATE_SECONDS = 3600;
const MAX_WINDOWS = 12; // ~1 ano de insights da conta
const MAX_MEDIA_PAGES = 6; // até 300 posts

/** Intervalo de análise em datas ISO (YYYY-MM-DD), fuso America/Sao_Paulo. */
export interface SocialRange {
  since: string;
  until: string;
}

export interface IgDailySeries {
  labels: string[];
  values: number[];
}

export interface IgSocialLive {
  username: string;
  range: SocialRange;
  /** Dias no intervalo (inclusivo). */
  days: number;
  followers: number;
  /** Soma de novos seguidores no período (null se indisponível). */
  newFollowers: number | null;
  /** Novos seguidores por dia (null se indisponível). */
  followerTrend: IgDailySeries | null;
  /** true quando a série cobre menos que o período pedido (limite de 30 dias). */
  trendLimited: boolean;
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
  /** true quando o alcance é a soma de janelas de 30 dias (não são únicos). */
  reachIsSum: boolean;
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

/* ------------------------------- datas ------------------------------------ */

const DAY = 86_400;
/** O Brasil não tem horário de verão desde 2019 — offset fixo. */
const SP_OFFSET = "-03:00";

/** Unix (s) do início ou do fim do dia em São Paulo. */
function spUnix(dateISO: string, endOfDay = false): number {
  const time = endOfDay ? "23:59:59" : "00:00:00";
  return Math.floor(Date.parse(`${dateISO}T${time}${SP_OFFSET}`) / 1000);
}

/** Dias no intervalo, inclusivo nas duas pontas. */
export function rangeDays({ since, until }: SocialRange): number {
  return Math.max(1, Math.round((spUnix(until) - spUnix(since)) / DAY) + 1);
}

/** Quebra o intervalo em janelas de no máximo 30 dias (limite da API). */
function windows({ since, until }: SocialRange): { since: string; until: string }[] {
  const start = spUnix(since);
  const end = spUnix(until, true);
  const out: { since: string; until: string }[] = [];
  for (let s = start; s < end && out.length < MAX_WINDOWS; s += 30 * DAY) {
    out.push({
      since: String(s),
      until: String(Math.min(s + 30 * DAY - 1, end)),
    });
  }
  return out;
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
  paging?: { cursors?: { after?: string }; next?: string };
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
const MEDIA_FIELDS_INSIGHTS = `${MEDIA_FIELDS_BASE},insights.metric(reach,views,saved,shares)`;

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

/** Busca a mídia página a página até cobrir o início do intervalo. */
async function fetchMedia(ig: string, sinceUnix: number): Promise<IgMediaItem[]> {
  const all: IgMediaItem[] = [];
  let after: string | undefined;
  let fields = MEDIA_FIELDS_INSIGHTS;

  for (let page = 0; page < MAX_MEDIA_PAGES; page++) {
    const params: Record<string, string> = { fields, limit: "50" };
    if (after) params.after = after;

    let res: IgMediaList;
    try {
      res = await graphGet<IgMediaList>(`${ig}/media`, params);
    } catch (err) {
      // Contas/mídias sem suporte a insights: refaz a página sem a expansão.
      if (fields === MEDIA_FIELDS_INSIGHTS) {
        fields = MEDIA_FIELDS_BASE;
        params.fields = fields;
        res = await graphGet<IgMediaList>(`${ig}/media`, params);
      } else {
        throw err;
      }
    }

    all.push(...res.data);
    const oldest = res.data[res.data.length - 1];
    if (!res.paging?.next || !oldest) break;
    if (Math.floor(Date.parse(oldest.timestamp) / 1000) < sinceUnix) break;
    after = res.paging.cursors?.after;
    if (!after) break;
  }
  return all;
}

/**
 * Busca tudo que a tela Social precisa para o intervalo dado. Retorna null
 * quando o app Meta não está configurado ou a API falha — a tela usa os
 * dados ilustrativos.
 */
export async function getInstagramSocial(
  range: SocialRange,
): Promise<IgSocialLive | null> {
  if (!metaConfigured()) return null;

  const ig = process.env.META_IG_USER_ID!;
  const sinceUnix = spUnix(range.since);
  const untilUnix = spUnix(range.until, true);
  const days = rangeDays(range);
  const chunks = windows(range);

  try {
    const profile = await graphGet<IgProfile>(ig, {
      fields: "username,followers_count,media_count",
    });

    // Insights da conta (orgânico + pago), somados por janela de 30 dias.
    // "views" substituiu "impressions" na v22+; vai em chamada separada para
    // tolerar contas/versões em que uma métrica específica falhe.
    let reachTotal: number | null = null;
    let interactions: number | null = null;
    let viewsTotal: number | null = null;

    const totalOf = (res: InsightTotalValue | null, name: string) =>
      res?.data.find((d) => d.name === name)?.total_value?.value ?? null;

    for (const w of chunks) {
      const main = await graphGet<InsightTotalValue>(`${ig}/insights`, {
        metric: "reach,total_interactions",
        period: "day",
        metric_type: "total_value",
        ...w,
      }).catch(() => null);
      const v = await graphGet<InsightTotalValue>(`${ig}/insights`, {
        metric: "views",
        period: "day",
        metric_type: "total_value",
        ...w,
      }).catch(() => null);

      const r = totalOf(main, "reach");
      const i = totalOf(main, "total_interactions");
      const vv = totalOf(v, "views");
      if (r !== null) reachTotal = (reachTotal ?? 0) + r;
      if (i !== null) interactions = (interactions ?? 0) + i;
      if (vv !== null) viewsTotal = (viewsTotal ?? 0) + vv;
    }

    // Série de novos seguidores: a API só cobre os últimos 30 dias corridos.
    const trendSince = Math.max(sinceUnix, untilUnix - 30 * DAY);
    const trendLimited = trendSince > sinceUnix;
    const followerSeries = await graphGet<InsightTimeSeries>(`${ig}/insights`, {
      metric: "follower_count",
      period: "day",
      since: String(trendSince),
      until: String(untilUnix),
    }).catch(() => null);

    const media = await fetchMedia(ig, sinceUnix);

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

    const inPeriod = media.filter((m) => {
      const t = Math.floor(Date.parse(m.timestamp) / 1000);
      return t >= sinceUnix && t <= untilUnix;
    });

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
      range,
      days,
      followers: profile.followers_count,
      newFollowers,
      followerTrend,
      trendLimited,
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
      reachIsSum: chunks.length > 1,
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
