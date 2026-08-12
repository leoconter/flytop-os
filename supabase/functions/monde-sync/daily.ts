/**
 * Sincronização diária das vendas do Monde.
 *
 * Fica separada da entrada da Edge Function porque dois runtimes a executam: o
 * Deno (`index.ts`) e o Node (a rota agendada da Vercel). Duplicar a
 * orquestração faria as duas divergirem com o tempo — e o erro só apareceria
 * meses depois, num número errado na tela.
 */
import { fetchSalesPage } from "./monde.ts";
import { type Counters, type Db, emptyCounters, persistPage } from "./persist.ts";

/** Dias para trás cobertos pela carga diária — folga para venda cadastrada com atraso. */
export const DEFAULT_WINDOW_DAYS = 15;

export async function runDaily(
  db: Db,
  token: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
  agora: number = Date.now(),
): Promise<Counters> {
  const counters = emptyCounters();

  // A API devolve da venda mais recente para a mais antiga: dá para parar nas
  // primeiras páginas em vez de varrer as 47.
  const cutoff = new Date(agora - windowDays * 86_400_000).toISOString().slice(0, 10);
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const res = await fetchSalesPage(token, page);
    totalPages = res.totalPages;
    const inWindow = res.sales.filter((s) => s.sale_date >= cutoff);
    await persistPage(db, inWindow, counters);
    if (inWindow.length < res.sales.length) break; // passou da janela
    page++;
  }

  // Canceladas somem da listagem padrão: sem este passo, uma venda cancelada
  // no ERP ficaria valendo aqui para sempre.
  let cPage = 1;
  let cTotal = 1;
  do {
    const res = await fetchSalesPage(token, cPage, "canceled");
    cTotal = res.totalPages;
    await persistPage(db, res.sales, counters);
    cPage++;
  } while (cPage <= cTotal);

  return counters;
}
