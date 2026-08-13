/**
 * Quando a tarefa recorrente volta.
 *
 * A conta vive aqui, e não no banco, porque é ela que erra: "toda quinta a
 * cada duas semanas" e "todo dia 31" têm casos de borda que só aparecem com
 * calendário na mão. Aqui dá para exercitá-los.
 *
 * Tudo em UTC ao meio-dia, como no resto da plataforma: assim somar dias nunca
 * escorrega para o dia anterior por causa de fuso ou horário de verão.
 */

export const TIPOS = ["diaria", "semanal", "mensal", "personalizada"] as const;
export type TipoRecorrencia = (typeof TIPOS)[number];

export const TIPO_LABEL: Record<TipoRecorrencia, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  personalizada: "Personalizado",
};

export const UNIDADES = ["dia", "semana", "mes"] as const;
export type Unidade = (typeof UNIDADES)[number];

export const UNIDADE_LABEL: Record<Unidade, [string, string]> = {
  dia: ["dia", "dias"],
  semana: ["semana", "semanas"],
  mes: ["mês", "meses"],
};

/** 0 = domingo, como `getUTCDay()`. */
export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DIAS_SEMANA_LONGO = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

export interface Regra {
  tipo: TipoRecorrencia;
  /** A cada N dias/semanas/meses. Sempre ≥ 1. */
  intervalo: number;
  /** Só na personalizada; nas demais é derivada do tipo. */
  unidade: Unidade;
  /** Dias da semana, para a semanal e a personalizada por semana. */
  diasSemana: number[];
  /** Dia do mês, para a mensal. */
  diaDoMes: number | null;
}

const DIA = 86_400_000;
const emUTC = (iso: string) => new Date(`${iso}T12:00:00Z`);
const paraISO = (d: Date) => d.toISOString().slice(0, 10);
const somaDias = (d: Date, n: number) => new Date(d.getTime() + n * DIA);

/** A unidade que a regra realmente usa. */
export function unidadeDe(r: Regra): Unidade {
  if (r.tipo === "diaria") return "dia";
  if (r.tipo === "semanal") return "semana";
  if (r.tipo === "mensal") return "mes";
  return r.unidade;
}

/**
 * Dia `n` do mês de `base`, preso ao fim do mês quando ele não existe.
 *
 * "Todo dia 31" em fevereiro precisa cair em 28 (ou 29) — sem isso o
 * JavaScript viraria o mês e a tarefa apareceria em 3 de março.
 */
function noDiaDoMes(base: Date, dia: number): Date {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const ultimo = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(dia, ultimo), 12));
}

function somaMeses(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1, 12));
}

/**
 * A próxima ocorrência depois de `apartirDe` (exclusive).
 *
 * `apartirDe` é o dia da conclusão: a tarefa concluída hoje não volta hoje.
 */
export function proximaOcorrencia(regra: Regra, apartirDe: string): string {
  const intervalo = Math.max(1, Math.floor(regra.intervalo || 1));
  const base = emUTC(apartirDe);
  const unidade = unidadeDe(regra);

  if (unidade === "dia") return paraISO(somaDias(base, intervalo));

  if (unidade === "semana") {
    const dias = [...new Set(regra.diasSemana)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
    // Sem dia escolhido, repete no mesmo dia da semana da conclusão.
    if (!dias.length) return paraISO(somaDias(base, 7 * intervalo));

    // Ainda esta semana? Só vale para intervalo de 1 — "a cada 2 semanas"
    // salta a semana inteira, e não apenas para o próximo dia marcado.
    if (intervalo === 1) {
      for (let i = 1; i <= 7; i++) {
        const d = somaDias(base, i);
        if (dias.includes(d.getUTCDay())) return paraISO(d);
      }
    }

    // Vai para a semana da vez e pega o primeiro dia marcado dela.
    const domingoDaSemana = somaDias(base, -base.getUTCDay());
    const alvo = somaDias(domingoDaSemana, 7 * intervalo);
    return paraISO(somaDias(alvo, dias[0]));
  }

  // Mensal: o dia escolhido, no mês seguinte (ou N meses à frente).
  const dia = regra.diaDoMes ?? base.getUTCDate();
  const esteMes = noDiaDoMes(base, dia);
  if (intervalo === 1 && esteMes > base) return paraISO(esteMes);
  return paraISO(noDiaDoMes(somaMeses(base, intervalo), dia));
}

/** "Toda quinta", "A cada 2 semanas, seg e qui", "Todo dia 15". */
export function descrever(regra: Regra | null): string | null {
  if (!regra) return null;
  const n = Math.max(1, Math.floor(regra.intervalo || 1));
  const unidade = unidadeDe(regra);

  if (unidade === "dia") return n === 1 ? "Todo dia" : `A cada ${n} dias`;

  if (unidade === "semana") {
    const dias = [...new Set(regra.diasSemana)].sort((a, b) => a - b);
    const nomes = dias.map((d) => DIAS_SEMANA_LONGO[d]);
    const lista =
      nomes.length === 0
        ? ""
        : nomes.length === 1
          ? nomes[0]
          : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
    if (n === 1) return lista ? `Toda ${lista}` : "Toda semana";
    return lista ? `A cada ${n} semanas, ${lista}` : `A cada ${n} semanas`;
  }

  const dia = regra.diaDoMes;
  if (n === 1) return dia ? `Todo dia ${dia}` : "Todo mês";
  return dia ? `A cada ${n} meses, no dia ${dia}` : `A cada ${n} meses`;
}

/** Lê a regra do que veio do banco; null quando a tarefa não repete. */
export function regraDe(t: {
  recurKind: string | null;
  recurInterval: number;
  recurUnit: string | null;
  recurWeekdays: number[];
  recurMonthday: number | null;
}): Regra | null {
  if (!t.recurKind || !TIPOS.includes(t.recurKind as TipoRecorrencia)) return null;
  return {
    tipo: t.recurKind as TipoRecorrencia,
    intervalo: t.recurInterval || 1,
    unidade: (UNIDADES.includes(t.recurUnit as Unidade) ? t.recurUnit : "semana") as Unidade,
    diasSemana: t.recurWeekdays ?? [],
    diaDoMes: t.recurMonthday,
  };
}
