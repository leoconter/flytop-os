/**
 * Conector da Marketing API (Meta) para a tela de Métricas de Ads.
 *
 * Variáveis de ambiente (ver .env.local.example):
 *   META_ACCESS_TOKEN     mesmo token do Instagram, com a permissão ads_read
 *   META_AD_ACCOUNT_ID    conta de anúncios no formato act_<id>
 *                         (descobrir com `node scripts/meta-discover.mjs`)
 *
 * A tela separa as campanhas de captação (nome contém "Leads") do restante.
 * O corte é feito pelo `filtering` da própria API, e não somando campanhas:
 * assim o alcance de cada grupo continua sendo de pessoas únicas — somar o
 * alcance campanha a campanha contaria a mesma pessoa mais de uma vez.
 */
import type { SocialRange } from "@/lib/meta/instagram";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const REVALIDATE_SECONDS = 3600;

/** Termo que separa as campanhas de captação das demais. */
export const LEADS_TERM = "Leads";

/** Conversão contabilizada como resultado (evento personalizado do pixel). */
const CONVERSION_ACTION = "offsite_conversion.fb_pixel_custom";

export interface AdsTotals {
  spend: number;
  /** Pessoas únicas (desduplicado pela API dentro do grupo). */
  reach: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  landingPageViews: number;
  conversions: number;
  ctr: number | null;
  /** Investimento ÷ conversões. */
  cpa: number | null;
  /** Investimento ÷ cliques no link. */
  cpc: number | null;
  /** Custo por mil impressões. */
  cpm: number | null;
}

export interface AdsCampaignRow {
  name: string;
  spend: number;
  reach: number;
  impressions: number;
  linkClicks: number;
  conversions: number;
  cpa: number | null;
}

export interface AdsDaily {
  labels: string[];
  spend: number[];
  cpa: (number | null)[];
}

export interface AdsLive {
  range: SocialRange;
  currency: string;
  /** Totais das campanhas cujo nome contém o termo de captação. */
  leads: AdsTotals;
  /** Totais das demais campanhas. */
  others: AdsTotals;
  leadsCampaigns: AdsCampaignRow[];
  otherCampaigns: AdsCampaignRow[];
  daily: AdsDaily | null;
}

export function adsConfigured(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);
}

/* ------------------------------- tipos da API ------------------------------ */

interface ActionValue {
  action_type: string;
  value: string;
}

interface InsightRow {
  date_start?: string;
  campaign_name?: string;
  account_currency?: string;
  spend?: string;
  reach?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  actions?: ActionValue[];
}

interface InsightResponse {
  data: InsightRow[];
  paging?: { next?: string };
}

/* -------------------------------- helpers --------------------------------- */

const num = (v: string | undefined) => (v ? Number(v) : 0);

function actionOf(row: InsightRow, type: string): number {
  return num(row.actions?.find((a) => a.action_type === type)?.value);
}

function totalsOf(row: InsightRow | undefined): AdsTotals {
  const spend = num(row?.spend);
  const linkClicks = row ? actionOf(row, "link_click") : 0;
  const conversions = row ? actionOf(row, CONVERSION_ACTION) : 0;
  return {
    spend,
    reach: num(row?.reach),
    impressions: num(row?.impressions),
    clicks: num(row?.clicks),
    linkClicks,
    landingPageViews: row ? actionOf(row, "landing_page_view") : 0,
    conversions,
    ctr: row?.ctr ? Number(row.ctr) : null,
    cpa: conversions > 0 ? spend / conversions : null,
    cpc: linkClicks > 0 ? spend / linkClicks : null,
    cpm: row?.cpm ? Number(row.cpm) : null,
  };
}

async function insights(
  path: string,
  params: Record<string, string>,
): Promise<InsightResponse | null> {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", process.env.META_ACCESS_TOKEN!);

  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  const body = await res.json();
  if (!res.ok || body.error) {
    console.error(
      `[meta/ads] ${path}: ${body?.error?.message ?? `HTTP ${res.status}`}`,
    );
    return null;
  }
  return body as InsightResponse;
}

/**
 * Como `insights`, mas junta todas as páginas. A Graph API devolve só 25
 * linhas por padrão — sem isso, uma série diária de um mês chegava cortada
 * no dia 25 e o gráfico parecia terminar antes do fim do período.
 */
async function insightsAll(
  path: string,
  params: Record<string, string>,
  maxPages = 8,
): Promise<InsightRow[] | null> {
  const first = await insights(path, { limit: "500", ...params });
  if (!first) return null;

  const rows = [...first.data];
  let next = first.paging?.next;
  for (let page = 1; page < maxPages && next; page++) {
    const res = await fetch(next, { next: { revalidate: REVALIDATE_SECONDS } });
    const body = await res.json();
    if (!res.ok || body.error) {
      console.error(
        `[meta/ads] paginação ${path}: ${body?.error?.message ?? `HTTP ${res.status}`}`,
      );
      break;
    }
    rows.push(...(body.data ?? []));
    next = body.paging?.next;
  }
  return rows;
}

const nameFilter = (operator: "CONTAIN" | "NOT_CONTAIN") =>
  JSON.stringify([{ field: "campaign.name", operator, value: LEADS_TERM }]);

const ACCOUNT_FIELDS =
  "spend,reach,impressions,clicks,ctr,cpm,actions,account_currency";

/** "2026-07-20" → "20/07" */
const shortLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/* --------------------------------- coleta --------------------------------- */

/**
 * Busca os números da conta de anúncios no intervalo, já separados entre
 * campanhas de captação e demais. Retorna null quando não configurado ou
 * quando a API falha — a tela cai nos dados ilustrativos.
 */
export async function getAdsInsights(range: SocialRange): Promise<AdsLive | null> {
  if (!adsConfigured()) return null;

  const act = process.env.META_AD_ACCOUNT_ID!;
  const time_range = JSON.stringify({ since: range.since, until: range.until });

  try {
    const [leadsRes, othersRes, campaignRes, dailyRes] = await Promise.all([
      insights(`${act}/insights`, {
        level: "account",
        fields: ACCOUNT_FIELDS,
        time_range,
        filtering: nameFilter("CONTAIN"),
      }),
      insights(`${act}/insights`, {
        level: "account",
        fields: ACCOUNT_FIELDS,
        time_range,
        filtering: nameFilter("NOT_CONTAIN"),
      }),
      insightsAll(`${act}/insights`, {
        level: "campaign",
        fields: "campaign_name,spend,reach,impressions,clicks,actions",
        time_range,
      }),
      insightsAll(`${act}/insights`, {
        level: "account",
        fields: "spend,actions",
        time_range,
        filtering: nameFilter("CONTAIN"),
        time_increment: "1",
      }),
    ]);

    if (!leadsRes && !campaignRes) return null;

    const rows = campaignRes ?? [];
    const toRow = (r: InsightRow): AdsCampaignRow => {
      const spend = num(r.spend);
      const conversions = actionOf(r, CONVERSION_ACTION);
      return {
        name: r.campaign_name ?? "—",
        spend,
        reach: num(r.reach),
        impressions: num(r.impressions),
        linkClicks: actionOf(r, "link_click"),
        conversions,
        cpa: conversions > 0 ? spend / conversions : null,
      };
    };
    const isLeads = (r: InsightRow) =>
      (r.campaign_name ?? "").toLowerCase().includes(LEADS_TERM.toLowerCase());

    const bySpend = (a: AdsCampaignRow, b: AdsCampaignRow) => b.spend - a.spend;

    // A API pode devolver os dias fora de ordem entre páginas.
    const dailyRows = (dailyRes ?? [])
      .filter((d) => d.date_start)
      .sort((a, b) => (a.date_start! < b.date_start! ? -1 : 1));
    const daily: AdsDaily | null = dailyRows.length
      ? {
          labels: dailyRows.map((d) => shortLabel(d.date_start!)),
          spend: dailyRows.map((d) => num(d.spend)),
          cpa: dailyRows.map((d) => {
            const c = actionOf(d, CONVERSION_ACTION);
            return c > 0 ? num(d.spend) / c : null;
          }),
        }
      : null;

    return {
      range,
      currency: leadsRes?.data?.[0]?.account_currency ?? "BRL",
      leads: totalsOf(leadsRes?.data?.[0]),
      others: totalsOf(othersRes?.data?.[0]),
      leadsCampaigns: rows.filter(isLeads).map(toRow).sort(bySpend),
      otherCampaigns: rows.filter((r) => !isLeads(r)).map(toRow).sort(bySpend),
      daily,
    };
  } catch (err) {
    console.error("[meta/ads] falha ao buscar métricas:", err);
    return null;
  }
}

/* ------------------------------ formatação -------------------------------- */

export function fmtMoney(n: number, currency = "BRL", decimals = 0): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Acima de 1 milhão encurta para caber no card: "R$ 1,2M". */
export function fmtMoneyCompact(n: number, currency = "BRL"): string {
  if (n < 1_000_000) return fmtMoney(n, currency);
  const symbol = currency === "BRL" ? "R$" : currency;
  const short = (n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${symbol} ${short}M`;
}
