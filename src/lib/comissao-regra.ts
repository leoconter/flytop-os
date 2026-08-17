/**
 * A regra da comissão, sem banco no meio.
 *
 * Fica separada de `monde/comissoes.ts` porque é a parte que decide dinheiro de
 * gente: precisa poder ser conferida sozinha, com números na mão, sem subir
 * aplicação nem consultar Supabase.
 *
 * As duas pernas da regra, que é onde mora o erro fácil:
 *
 *   a **faixa** vem do faturamento do mês   — vendeu 436k, faixa de 6%
 *   o **percentual** incide sobre a margem  — 6% de 40.821 = 2.449
 */

export interface Faixa {
  id: string;
  /** Faturamento a partir do qual a faixa vale (inclusive). */
  de: number;
  /** Até onde vale (exclusive). null = última faixa, sem teto. */
  ate: number | null;
  /** Fração: 0.07 é 7%. */
  taxa: number;
}

/** Em qual faixa cai este faturamento. */
export function faixaDe(faturamento: number, faixas: Faixa[]): Faixa | null {
  return (
    faixas.find((f) => faturamento >= f.de && (f.ate === null || faturamento < f.ate)) ??
    null
  );
}

/** A comissão do mês: taxa da faixa do faturamento, aplicada à margem. */
export function calcular(
  faturamento: number,
  margem: number,
  faixas: Faixa[],
): { faixa: Faixa | null; comissao: number } {
  const faixa = faixaDe(faturamento, faixas);
  // Margem negativa (mês que deu prejuízo) não vira comissão negativa: o
  // vendedor não devolve dinheiro, o mês apenas não rende.
  const base = Math.max(0, margem);
  return { faixa, comissao: faixa ? base * faixa.taxa : 0 };
}

/**
 * Buracos e sobreposições na tabela de faixas.
 *
 * Existe porque as faixas são editáveis: alguém pode salvar 0–250k e 350k–450k
 * e deixar de fora quem vendeu 300k, que passaria a receber zero sem ninguém
 * perceber. A tela mostra estes avisos ao lado da planilha.
 */
export function conferirFaixas(faixas: Faixa[]): string[] {
  const avisos: string[] = [];
  const ordenadas = [...faixas].sort((a, b) => a.de - b.de);

  if (!ordenadas.length) return ["Nenhuma faixa cadastrada: ninguém recebe comissão."];

  if (ordenadas[0].de > 0) {
    avisos.push(`Faturamento abaixo de ${moeda(ordenadas[0].de)} não tem faixa.`);
  }

  for (let i = 0; i < ordenadas.length - 1; i++) {
    const atual = ordenadas[i];
    const proxima = ordenadas[i + 1];

    if (atual.ate === null) {
      avisos.push(
        `A faixa que começa em ${moeda(atual.de)} não tem teto, então as seguintes nunca valem.`,
      );
      break;
    }
    if (atual.ate < proxima.de) {
      avisos.push(`Nada cobre de ${moeda(atual.ate)} a ${moeda(proxima.de)}.`);
    }
    if (atual.ate > proxima.de) {
      avisos.push(
        `As faixas de ${moeda(atual.de)} e ${moeda(proxima.de)} se sobrepõem — vale a primeira.`,
      );
    }
  }

  if (ordenadas[ordenadas.length - 1].ate !== null) {
    avisos.push(
      `Acima de ${moeda(ordenadas[ordenadas.length - 1].ate!)} não há faixa: quem vender mais fica sem comissão.`,
    );
  }

  return avisos;
}

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
