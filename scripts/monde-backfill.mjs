/**
 * Carga histórica das vendas do Monde.
 *
 * Chama a Edge Function `monde-sync` em blocos de páginas até acabar o
 * histórico. Roda da máquina de propósito: a função tem teto de tempo de
 * execução, e são ~47 páginas.
 *
 * Uso:
 *   node scripts/monde-backfill.mjs            # do começo
 *   node scripts/monde-backfill.mjs 12         # retoma da página 12
 *
 * Espera no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL      URL do projeto
 *   SUPABASE_SERVICE_ROLE_KEY     chave de serviço (nunca vai ao navegador)
 */
import { readFileSync } from "node:fs";

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = file.split("\n").find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  } catch {}
  return null;
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !key) {
  console.error(
    "Faltam credenciais. Preencha NEXT_PUBLIC_SUPABASE_URL e " +
      "SUPABASE_SERVICE_ROLE_KEY no .env.local (ver .env.local.example).",
  );
  process.exit(1);
}

const endpoint = `${url.replace(/\/$/, "")}/functions/v1/monde-sync`;
let page = Number(process.argv[2]) || 1;

const total = { pages: 0, seen: 0, inserted: 0, updated: 0 };
const started = Date.now();

console.log(`Carga histórica do Monde — começando na página ${page}\n`);

while (page !== null) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode: "backfill", page }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`\nFalhou na página ${page}: ${body.error ?? `HTTP ${res.status}`}`);
    console.error(`Para retomar daqui:  node scripts/monde-backfill.mjs ${page}`);
    process.exit(1);
  }

  total.pages += body.pages ?? 0;
  total.seen += body.seen ?? 0;
  total.inserted += body.inserted ?? 0;
  total.updated += body.updated ?? 0;

  const ate = body.nextPage ? body.nextPage - 1 : "fim";
  console.log(
    `  páginas ${page}–${ate}: ${body.seen ?? 0} vendas ` +
      `(${body.inserted ?? 0} novas, ${body.updated ?? 0} atualizadas)`,
  );

  page = body.nextPage ?? null;
}

// As canceladas não aparecem na listagem padrão — precisam de um passe próprio.
console.log("\nBuscando vendas canceladas...");
const res = await fetch(endpoint, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ mode: "canceled" }),
});
const canceled = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`  falhou: ${canceled.error ?? `HTTP ${res.status}`}`);
} else {
  console.log(`  ${canceled.seen ?? 0} canceladas registradas`);
  total.seen += canceled.seen ?? 0;
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `\nConcluído em ${secs}s — ${total.seen} vendas ` +
    `(${total.inserted} novas, ${total.updated} atualizadas).`,
);
console.log("Confira o resultado na tabela sync_runs.");
