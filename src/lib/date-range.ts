/**
 * Intervalo de análise compartilhado pela plataforma. O seletor do cabeçalho
 * grava as datas na URL (`?de=YYYY-MM-DD&ate=YYYY-MM-DD`) e as telas leem
 * daqui — assim o período é linkável e sobrevive a recarregar a página.
 */
import type { SocialRange } from "@/lib/meta/instagram";

export const PARAM_FROM = "de";
export const PARAM_TO = "ate";

/** Padrão quando a URL não traz datas. */
export const DEFAULT_DAYS = 30;
/** Teto de segurança para intervalos vindos da URL. */
const MAX_DAYS = 366;

/**
 * Cada tela tem o período que faz sentido para ela. O Geral é uma leitura de
 * mês (meta, projeção, ritmo), então abre no mês corrente; as demais abrem na
 * janela móvel de 30 dias.
 */
export type PeriodDefault = "30d" | "mes";

export const DEFAULT_LABEL: Record<PeriodDefault, string> = {
  "30d": `Últimos ${DEFAULT_DAYS} dias`,
  mes: "Este mês",
};

/** Telas de leitura mensal: abrem no mês corrente, não na janela de 30 dias. */
const POR_MES = ["/", "/vendedor"];

/** Padrão da rota. Usado no servidor (resolveRange) e no seletor do cabeçalho. */
export function periodDefaultFor(pathname: string): PeriodDefault {
  return POR_MES.includes(pathname) ? "mes" : "30d";
}

/** Telas de cadastro: configuram a plataforma, não exibem resultado. */
const CADASTRO = ["/metas", "/configuracoes", "/monde"];

/**
 * Telas de cadastro não usam os controles de dados do cabeçalho.
 *
 * Nem o período — Metas é anual e tem navegação própria, Configurações ignora
 * data — nem o "ocultar valores": não há resultado financeiro para esconder,
 * e as metas ficam em campos de digitação, que o borrão não alcança.
 */
export function telaDeCadastro(pathname: string): boolean {
  return CADASTRO.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Telas que também não têm período, mas continuam mostrando valores.
 *
 * O banco de alertas é fila de trabalho, não recorte de datas: um alerta
 * cadastrado semana passada e ainda não enviado precisa aparecer. Comparação
 * exata, não por prefixo — `/alertas/dados` é justamente a tela que usa o
 * período.
 */
/* As telas de voos têm janela própria e fixa de 48h: o seletor mudaria de mês
   sem mudar nada na lista, o que faz o número parecer errado. */
const SEM_PERIODO = [
  "/alertas",
  "/alertas/novo",
  "/crm/embarques",
  "/crm/retornos",
  "/crm/retornaram",
];

/** O seletor de período faz sentido nesta rota? */
export function mostraPeriodo(pathname: string): boolean {
  return !telaDeCadastro(pathname) && !SEM_PERIODO.includes(pathname);
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const isoFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Hoje em São Paulo, como YYYY-MM-DD. */
export function todaySP(): string {
  return isoFmt.format(new Date());
}

/** Soma dias a uma data ISO (aritmética em UTC, sem efeito de fuso). */
export function addDaysISO(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function valid(iso: string | undefined): iso is string {
  return Boolean(iso && ISO_RE.test(iso) && !Number.isNaN(Date.parse(`${iso}T12:00:00Z`)));
}

function diffDays(since: string, until: string): number {
  const a = Date.parse(`${since}T12:00:00Z`);
  const b = Date.parse(`${until}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Intervalo aberto por padrão, sem nada na URL. */
export function defaultRange(mode: PeriodDefault = "30d"): SocialRange {
  const today = todaySP();
  return mode === "mes"
    ? { since: `${today.slice(0, 8)}01`, until: today }
    : { since: addDaysISO(today, -(DEFAULT_DAYS - 1)), until: today };
}

/**
 * Resolve o intervalo a partir dos parâmetros da URL, caindo no padrão da tela
 * quando ausentes ou inválidos. Nunca retorna datas futuras.
 */
export function resolveRange(
  params: {
    [PARAM_FROM]?: string;
    [PARAM_TO]?: string;
  },
  mode: PeriodDefault = "30d",
): SocialRange {
  const today = todaySP();
  const fallback = defaultRange(mode);

  const from = params[PARAM_FROM];
  const to = params[PARAM_TO];
  if (!valid(from) || !valid(to)) return fallback;

  const since = from;
  const until = to > today ? today : to;
  const span = diffDays(since, until);
  if (span < 0 || span + 1 > MAX_DAYS) return fallback;

  return { since, until };
}

const labelFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

/** "28/06/26 – 27/07/26" */
export function formatRange({ since, until }: SocialRange): string {
  const f = (iso: string) => labelFmt.format(new Date(`${iso}T12:00:00Z`));
  return since === until ? f(since) : `${f(since)} – ${f(until)}`;
}
