/**
 * Preenche os produtos terrestres a partir do payload que já está no banco.
 *
 * Não chama a API: `monde_sales_raw` guarda o espelho fiel de cada venda, o
 * que torna a recarga instantânea comparada a refazer as 47 páginas.
 *
 * Uso:  node scripts/monde-land-backfill.mts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { persistLandItems } from "../supabase/functions/monde-sync/land.ts";

const env = (n: string) => {
  if (process.env[n]) return process.env[n]!;
  const f = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const l = f.split("\n").find((x) => x.startsWith(n + "="));
  return l ? l.slice(n.length + 1).trim() : "";
};

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const started = Date.now();
let total = 0;
let vendas = 0;

for (let from = 0; ; from += 300) {
  const { data, error } = await db
    .from("monde_sales_raw")
    .select("sale_id, payload")
    .range(from, from + 299);
  if (error) throw new Error(error.message);
  if (!data?.length) break;

  total += await persistLandItems(db, data as never);
  vendas += data.length;
  process.stdout.write(`\r  ${vendas} vendas processadas · ${total} itens terrestres`);
  if (data.length < 300) break;
}

console.log(`\nConcluído em ${((Date.now() - started) / 1000).toFixed(1)}s.`);
