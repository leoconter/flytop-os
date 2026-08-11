/**
 * Carrega os cadastros do Monde que existem fora da venda: pessoas,
 * vendedores e contas a pagar/receber.
 *
 * Uso:  node scripts/monde-catalog.mts
 *
 * Espera no .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * e MONDE_API_TOKEN.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  syncBills,
  syncPeople,
  syncSellers,
} from "../supabase/functions/monde-sync/catalog.ts";

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
  console.error("Faltam credenciais no .env.local (ver .env.local.example).");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const started = Date.now();

const { data: run } = await db
  .from("sync_runs")
  .insert({ source: "monde", mode: "catalog", status: "running" })
  .select("id")
  .single();

const etapas: [string, () => Promise<number>][] = [
  ["pessoas", () => syncPeople(db, token)],
  ["vendedores", () => syncSellers(db, token)],
  ["contas a pagar/receber", () => syncBills(db, token)],
];

let total = 0;
try {
  for (const [nome, fn] of etapas) {
    const t = Date.now();
    const n = await fn();
    total += n;
    console.log(`  ${nome.padEnd(24)} ${String(n).padStart(5)} registros  (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  }

  await db
    .from("sync_runs")
    .update({
      status: "success",
      sales_seen: total,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
    })
    .eq("id", run?.id);

  console.log(`\nConcluído em ${((Date.now() - started) / 1000).toFixed(1)}s — ${total} registros.`);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  await db
    .from("sync_runs")
    .update({
      status: "error",
      error_message: message,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
    })
    .eq("id", run?.id);
  console.error(`\nFalhou: ${message}`);
  process.exit(1);
}
