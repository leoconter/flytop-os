/**
 * Sincronização diária das vendas do Monde.
 *
 * Fica separada da entrada da Edge Function porque dois runtimes a executam: o
 * Deno (`index.ts`) e o Node (a rota agendada da Vercel). Duplicar a
 * orquestração faria as duas divergirem com o tempo — e o erro só apareceria
 * meses depois, num número errado na tela.
 *
 * ## A mudança de 14/08/2026
 *
 * A listagem deixou de devolver a venda inteira e passou a devolver um resumo
 * de dez campos. O detalhe virou uma requisição por venda — cara: ~0,25s cada
 * em ritmo normal, e a API responde 429 se atropelar.
 *
 * O que salva o desenho é o resumo trazer `totals`. Faturamento e margem, que
 * alimentam quase toda tela, entram direto da listagem. O detalhe fica
 * reservado para os filhos — bilhetes, trechos, passageiros — e só é buscado
 * de venda que ainda não temos ou que mudou. Na prática são as poucas do dia,
 * em vez das 85 da janela.
 */
import {
  fetchSaleDetails,
  fetchSalesPage,
  finalValue,
  type MondeSale,
  saleId,
} from "./monde.ts";
import {
  type Counters,
  type Db,
  emptyCounters,
  persistPage,
  persistSummaries,
} from "./persist.ts";

/** Dias para trás cobertos pela carga diária — folga para venda cadastrada com atraso. */
export const DEFAULT_WINDOW_DAYS = 15;

/** Trava contra laço infinito, caso a API passe a mentir no `has_next_page`. */
const MAX_PAGINAS = 200;

/**
 * Teto de detalhes por execução.
 *
 * A Edge Function morre em 300s. O que passar do teto fica para a próxima
 * carga — a janela de 15 dias garante que nada se perde, só atrasa.
 */
const MAX_DETALHES = 120;

export async function runDaily(
  db: Db,
  token: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
  agora: number = Date.now(),
): Promise<Counters> {
  const counters = emptyCounters();

  const cutoff = new Date(agora - windowDays * 86_400_000).toISOString().slice(0, 10);
  const resumos: MondeSale[] = [];

  // 1. A listagem, que já resolve cabeçalho e valores.
  let page = 1;
  while (page <= MAX_PAGINAS) {
    const res = await fetchSalesPage(token, page);
    const naJanela = res.sales.filter((s) => s.sale_date >= cutoff);
    resumos.push(...naJanela);
    if (naJanela.length < res.sales.length || !res.hasNext) break;
    page++;
  }

  // Canceladas somem da listagem padrão: sem este passo, uma venda cancelada
  // no ERP ficaria valendo aqui para sempre.
  let cPage = 1;
  while (cPage <= MAX_PAGINAS) {
    const res = await fetchSalesPage(token, cPage, "canceled");
    resumos.push(...res.sales);
    if (!res.hasNext) break;
    cPage++;
  }

  await gravar(db, token, resumos, counters);
  return counters;
}

/** Percorre a listagem inteira — a carga completa do histórico. */
export async function runFull(db: Db, token: string): Promise<Counters> {
  const counters = emptyCounters();
  const resumos: MondeSale[] = [];

  for (const status of [undefined, "canceled" as const]) {
    let page = 1;
    while (page <= MAX_PAGINAS) {
      const res = await fetchSalesPage(token, page, status);
      resumos.push(...res.sales);
      if (!res.hasNext) break;
      page++;
    }
  }

  await gravar(db, token, resumos, counters);
  return counters;
}

async function gravar(
  db: Db,
  token: string,
  resumos: MondeSale[],
  counters: Counters,
): Promise<void> {
  const validos = resumos.filter((s) => {
    if (saleId(s)) return true;
    // Era daqui que saía o `invalid input syntax for type uuid: "undefined"`:
    // o id virava a string "undefined" dentro do filtro.
    console.warn("[monde] venda sem identificador, descartada:", s.sale_number ?? "(sem número)");
    counters.skipped += 1;
    return false;
  });
  if (!validos.length) return;

  // 2. Cabeçalho e valores de todas — barato, vem do resumo.
  await persistSummaries(db, validos, counters);

  // 3. Detalhe só de quem precisa.
  const pendentes = await semDetalhe(db, validos);
  const fatia = pendentes.slice(0, MAX_DETALHES);
  if (pendentes.length > fatia.length) {
    console.warn(
      `[monde] ${pendentes.length} vendas aguardando detalhe; ${fatia.length} nesta carga, o resto na próxima.`,
    );
  }
  if (!fatia.length) return;

  const detalhes = await fetchSaleDetails(token, fatia);
  await persistPage(db, detalhes, counters, token);
}

/**
 * Quais vendas ainda precisam do detalhe.
 *
 * Duas situações: nunca detalhamos (não há payload cru), ou o resumo diz algo
 * diferente do que está gravado — status ou valor mudaram, o que significa que
 * a venda foi editada no ERP e os filhos podem ter mudado junto.
 */
async function semDetalhe(db: Db, resumos: MondeSale[]): Promise<string[]> {
  const ids = resumos.map((s) => saleId(s)!);
  const porId = new Map(resumos.map((s) => [saleId(s)!, s]));

  const gravadas = new Map<string, { status: string; valor: number | null }>();
  const detalhadas = new Set<string>();

  for (let i = 0; i < ids.length; i += 200) {
    const fatia = ids.slice(i, i + 200);
    const [vendas, cruas] = await Promise.all([
      db.from("monde_sales").select("sale_id, status, total_final_value").in("sale_id", fatia),
      db.from("monde_sales_raw").select("sale_id").in("sale_id", fatia),
    ]);
    for (const r of vendas.data ?? []) {
      gravadas.set(r.sale_id, {
        status: r.status,
        valor: r.total_final_value === null ? null : Number(r.total_final_value),
      });
    }
    for (const r of cruas.data ?? []) detalhadas.add(r.sale_id);
  }

  return ids.filter((id) => {
    if (!detalhadas.has(id)) return true;
    const antes = gravadas.get(id);
    if (!antes) return true;
    const s = porId.get(id)!;
    const valor = finalValue(s.totals ?? {});
    return antes.status !== s.status || Number(antes.valor ?? -1) !== Number(valor ?? -1);
  });
}
