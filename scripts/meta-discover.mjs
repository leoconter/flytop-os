/**
 * Descobre o ID da conta profissional do Instagram a partir do token da Meta.
 *
 * Uso:
 *   1. Coloque META_ACCESS_TOKEN no .env.local (ou exporte no shell)
 *   2. node scripts/meta-discover.mjs
 *
 * Lista as Páginas acessíveis pelo token e, para cada uma, a conta do
 * Instagram vinculada — o campo `id` dessa conta é o META_IG_USER_ID.
 */
import { readFileSync } from "node:fs";

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}`;

function loadToken() {
  if (process.env.META_ACCESS_TOKEN) return process.env.META_ACCESS_TOKEN;
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = env.split("\n").find((l) => l.startsWith("META_ACCESS_TOKEN="));
    if (line) return line.slice("META_ACCESS_TOKEN=".length).trim().replace(/^["']|["']$/g, "");
  } catch {}
  return null;
}

const token = loadToken();
if (!token) {
  console.error("Defina META_ACCESS_TOKEN no .env.local ou no ambiente.");
  process.exit(1);
}

async function get(path, params = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await fetch(url);
  const body = await res.json();
  if (body.error) throw new Error(`${path}: ${body.error.message}`);
  return body;
}

const me = await get("me", { fields: "id,name" });
console.log(`Token de: ${me.name} (${me.id})\n`);

const pages = await get("me/accounts", {
  fields: "name,id,instagram_business_account{id,username,followers_count}",
  limit: "50",
});

if (!pages.data?.length) {
  console.log(
    "Nenhuma Página acessível por este token.\n" +
      "Confira se o token tem as permissões pages_show_list, instagram_basic e\n" +
      "instagram_manage_insights, e se a Página está no portfólio do app.",
  );
  process.exit(0);
}

for (const page of pages.data) {
  console.log(`Página: ${page.name} (${page.id})`);
  const ig = page.instagram_business_account;
  if (ig) {
    console.log(`  Instagram: @${ig.username} · ${ig.followers_count} seguidores`);
    console.log(`  META_IG_USER_ID=${ig.id}\n`);
  } else {
    console.log("  (sem conta do Instagram vinculada)\n");
  }
}
