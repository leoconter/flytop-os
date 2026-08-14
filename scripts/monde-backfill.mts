/**
 * Carga histórica das vendas do Monde no Supabase.
 *
 * Roda da máquina de propósito: são ~47 páginas, acima do teto de tempo de uma
 * Edge Function. Usa exatamente o mesmo mapeamento e a mesma gravação do
 * sincronismo diário (`supabase/functions/monde-sync/`), para os dois não
 * divergirem.
 *
 * Uso:
 *   node scripts/monde-backfill.mts           # do começo
 *   node scripts/monde-backfill.mts 12        # retoma da página 12
 *
 * Espera no .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * e MONDE_API_TOKEN.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { fetchSaleDetails, fetchSalesPage, saleId } from "../supabase/functions/monde-sync/monde.ts";
import { emptyCounters, persistPage } from "../supabase/functions/monde-sync/persist.ts";

function env(name: string): string | null {
  if (process.env[name]) return process.env[name]!;
  try {
    const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = file.split("\n").find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  } catch {}
  return null;
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
const token = env("MONDE_API_TOKEN");

if (!url || !key || !token) {
  console.error(
    "Faltam credenciais no .env.local: NEXT_PUBLIC_SUPABASE_URL, " +
      "SUPABASE_SERVICE_ROLE_KEY e MONDE_API_TOKEN (ver .env.local.example).",
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const counters = emptyCounters();
const started = Date.now();

const { data: run } = await db
  .from("sync_runs")
  .insert({ source: "monde", mode: "backfill", status: "running" })
  .select("id")
  .single();

async function finish(status: "success" | "error", error?: string) {
  await db
    .from("sync_runs")
    .update({
      status,
      error_message: error ?? null,
      pages_fetched: counters.pages,
      sales_seen: counters.seen,
      sales_inserted: counters.inserted,
      sales_updated: counters.updated,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
    })
    .eq("id", run?.id);
}

let page = Number(process.argv[2]) || 1;
console.log(`Carga histórica do Monde — começando na página ${page}\n`);

/**
 * Desde 14/08/2026 a listagem devolve só um resumo: o detalhe de cada venda
 * vem numa requisição por venda, em lotes paralelos. A listagem também deixou
 * de informar o total de páginas — agora só diz se existe a próxima.
 */
async function levarPagina(resumos: { id?: string; sale_id?: string }[]) {
  const ids = resumos
    .map((r) => saleId(r as Parameters<typeof saleId>[0]))
    .filter((id): id is string => Boolean(id));
  if (!ids.length) return 0;
  const detalhes = await fetchSaleDetails(token, ids);
  await persistPage(db, detalhes, counters);
  return detalhes.length;
}

try {
  while (true) {
    const res = await fetchSalesPage(token, page);
    const n = await levarPagina(res.sales);
    console.log(
      `  página ${String(page).padStart(2)} — ${n} vendas · acumulado ${counters.seen}`,
    );
    if (!res.hasNext) break;
    page++;
  }

  // Canceladas não aparecem na listagem padrão — precisam de um passe próprio.
  console.log("\nBuscando vendas canceladas...");
  let cPage = 1;
  while (true) {
    const res = await fetchSalesPage(token, cPage, "canceled");
    const n = await levarPagina(res.sales);
    console.log(`  página ${cPage} — ${n} canceladas`);
    if (!res.hasNext) break;
    cPage++;
  }

  await finish("success");
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `\nConcluído em ${secs}s — ${counters.seen} vendas ` +
      `(${counters.inserted} novas, ${counters.updated} atualizadas).`,
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  await finish("error", message);
  console.error(`\nFalhou na página ${page}: ${message}`);
  console.error(`Para retomar daqui:  node scripts/monde-backfill.mts ${page}`);
  process.exit(1);
}
