/**
 * Dados e séries do dashboard de vendas de maio/2026.
 *
 * Portado de `public/preview/dashboard-maio.html` (versão validada). A lógica de
 * pace/necessidade por dia útil é idêntica à do HTML — apenas movida para TS
 * puro para alimentar os componentes React. Os textos de métricas e listas são
 * mantidos exatamente como exibidos no dashboard original.
 */

export const META = 3_500_000;
export const DAYS_IN_MAY = 31;
export const LAST_DAY = 11; // dados vão até o dia 11
export const MONTH_INDEX = 4; // maio (0-based)
export const HOLIDAYS_MAY_2026 = [1]; // Dia do Trabalho (1º de maio)

/** Faturamento diário real (linha de total da planilha já excluída). */
const daily: Record<number, number> = {
  1: 53840.0,
  2: 45717.85,
  4: 262966.72,
  5: 140310.52,
  6: 258033.46,
  7: 210375.45,
  8: 183048.47,
  9: 23880.0,
  11: 144687.96,
};

/** Faturamento por dia (1..LAST_DAY), com 0 nos dias sem venda. */
export const dailyRevenue: { day: number; value: number }[] = Array.from(
  { length: LAST_DAY },
  (_, i) => ({ day: i + 1, value: daily[i + 1] ?? 0 }),
);

export function isBusinessDay(day: number): boolean {
  const dow = new Date(2026, MONTH_INDEX, day).getDay(); // 0 = dom, 6 = sáb
  if (dow === 0 || dow === 6) return false;
  if (HOLIDAYS_MAY_2026.includes(day)) return false;
  return true;
}

export interface DashboardSeries {
  /** Rótulos do eixo X (1..31). */
  labels: number[];
  /** Acumulado realizado até LAST_DAY, depois null. */
  cumulative: (number | null)[];
  /** Projeção (escada que sobe só em dias úteis), ancorada em LAST_DAY. */
  pace: (number | null)[];
  /** Necessidade: acumulado exigido por dia útil para bater a META. */
  necessity: number[];
  /** Linha plana da meta. */
  metaLine: number[];
  /** Flags de dia útil indexadas por dia (businessFlags[dia]). */
  businessFlags: Record<number, boolean>;
}

export function buildSeries(): DashboardSeries {
  const labels = Array.from({ length: DAYS_IN_MAY }, (_, i) => i + 1);
  const businessFlags: Record<number, boolean> = {};
  for (let d = 1; d <= DAYS_IN_MAY; d++) businessFlags[d] = isBusinessDay(d);

  // Acumulado realizado
  const cumulative: (number | null)[] = [];
  let running = 0;
  for (let d = 1; d <= DAYS_IN_MAY; d++) {
    if (d <= LAST_DAY) {
      running += daily[d] || 0;
      cumulative.push(running);
    } else {
      cumulative.push(null);
    }
  }

  // Média por dia útil (apenas dias úteis até LAST_DAY)
  let bizSum = 0;
  let bizCount = 0;
  for (let d = 1; d <= LAST_DAY; d++) {
    if (businessFlags[d]) {
      bizSum += daily[d] || 0;
      bizCount++;
    }
  }
  const avgPerBusinessDay = bizSum / bizCount;

  // Necessidade: META distribuída pelos dias úteis do mês
  let totalBizDays = 0;
  for (let d = 1; d <= DAYS_IN_MAY; d++) if (businessFlags[d]) totalBizDays++;
  const requiredPerBizDay = META / totalBizDays;

  const necessity: number[] = [];
  let needCum = 0;
  for (let d = 1; d <= DAYS_IN_MAY; d++) {
    if (businessFlags[d]) needCum += requiredPerBizDay;
    necessity.push(needCum);
  }

  // Pace: escada que sobe só em dias úteis, ancorada onde o realizado termina
  const pace: (number | null)[] = [];
  for (let d = 1; d <= DAYS_IN_MAY; d++) {
    if (d < LAST_DAY) {
      pace.push(null);
    } else if (d === LAST_DAY) {
      pace.push(cumulative[LAST_DAY - 1]);
    } else {
      const prev = pace[pace.length - 1] as number;
      pace.push(businessFlags[d] ? prev + avgPerBusinessDay : prev);
    }
  }

  const metaLine = Array(DAYS_IN_MAY).fill(META);

  return { labels, cumulative, pace, necessity, metaLine, businessFlags };
}

/* ----------------------------- Conteúdo estático ---------------------------- */

export interface Metric {
  label: string;
  value: string;
  tone?: "blue" | "green" | "red";
  /** Fonte de valor menor (~22px), para textos como "Europa". */
  small?: boolean;
  hint?: string;
  hintTone?: "positive" | "negative";
  /** Barra de progresso (0–100). green usa o gradiente verde. */
  bar?: { pct: number; green?: boolean };
  /** Borra o valor (e a barra) quando o modo privacidade está ligado. */
  privateValue?: boolean;
  /** Borra a dica quando o modo privacidade está ligado. */
  privateHint?: boolean;
}

export const metrics: Metric[] = [
  {
    label: "Faturamento atual",
    value: "R$ 1,32M",
    hint: "R$ 1.322.860 em 11 dias",
    privateValue: true,
    privateHint: true,
  },
  {
    label: "% da meta",
    value: "37,8%",
    tone: "blue",
    bar: { pct: 37.8 },
    privateValue: true,
  },
  { label: "Ticket médio", value: "R$ 20.670", hint: "por venda", privateValue: true },
  {
    label: "Média por dia útil",
    value: "R$ 199.904",
    hint: "+14% acima do necessário",
    hintTone: "positive",
    privateValue: true,
    privateHint: true,
  },
  {
    label: "Projeção fim de maio",
    value: "R$ 4,12M",
    tone: "green",
    hint: "+17,8% vs meta de R$ 3,5M",
    hintTone: "positive",
    privateValue: true,
    privateHint: true,
  },
];

export interface ListItem {
  name: string;
  meta: string;
  value: string;
  mono?: boolean;
}

export const suppliers: ListItem[] = [
  { name: "LATAM Airlines Brasil", meta: "19,8% do faturamento", value: "R$ 261.359" },
  { name: "United Airlines", meta: "16,2% do faturamento", value: "R$ 214.142" },
  { name: "Qatar Airways", meta: "11,6% do faturamento", value: "R$ 153.718" },
];

export const routes: ListItem[] = [
  { name: "GRU-DOH-ATH-DOH-GRU", meta: "5 vendas", value: "R$ 153.718", mono: true },
  { name: "GRU-MIA-GRU", meta: "7 vendas", value: "R$ 107.420", mono: true },
  { name: "GRU-MCO-GRU", meta: "2 vendas", value: "R$ 78.788", mono: true },
  { name: "GRU-PTY-CUN-PTY-GRU", meta: "1 venda", value: "R$ 74.800", mono: true },
  { name: "GRU-FCO-GRU", meta: "3 vendas", value: "R$ 74.680", mono: true },
];

/* --------------------------- Tela de TV (Geral) ----------------------------
   Cards extras usados só na visão de TV do escritório. Dados ilustrativos. */

/** KPIs grandes da TV: Faturamento, % da meta, Ticket médio, Projeção. */
export const geralKpis: Metric[] = [metrics[0], metrics[1], metrics[2], metrics[4]];

export interface TeamSales {
  name: string;
  meta: string;
  value: string;
}
export const teams: TeamSales[] = [
  { name: "Equipe Antônio", meta: "34 vendas", value: "R$ 706.040" },
  { name: "Equipe Matheus", meta: "30 vendas", value: "R$ 616.820" },
];

/** Classes mais vendidas, da mais para a menos vendida. */
export const salesClasses: ListItem[] = [
  { name: "Executiva", meta: "41 vendas", value: "64%" },
  { name: "First", meta: "14 vendas", value: "22%" },
  { name: "Premium Economy", meta: "9 vendas", value: "14%" },
];

/** Alertas enviados às comunidades no mês, por região. */
export const alertsByRegion = { sp: 79, rj: 8, total: 87 };

/** Total de membros nas comunidades. */
export const communityMembers = { total: "77.769", hint: "em 45 comunidades" };
