/**
 * Carga inicial dos grupos de WhatsApp.
 *
 * O webhook só sabe do que acontece depois que ele é ligado. Sem esta carga, um
 * grupo com 1.800 pessoas apareceria na tela com zero membros, e a taxa de
 * saída ficaria sem denominador. Aqui a lista atual é lida da Z-API e gravada
 * como ponto de partida.
 *
 * Pode rodar de novo quando quiser: quem continua no grupo é atualizado, quem
 * sumiu entre uma execução e outra é marcado como fora, e o retrato do dia é
 * regravado. É assim que o número se corrige sozinho se um aviso do webhook se
 * perder.
 *
 * Uso:  node scripts/zapi-carga.mts
 *
 * Espera no .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * ZAPI_INSTANCE_ID e ZAPI_INSTANCE_TOKEN.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { inferir } from "../src/lib/whatsapp/rotulo.ts";
import { listarGrupos, metadados } from "../src/lib/whatsapp/zapi.ts";

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
const chave = env("SUPABASE_SERVICE_ROLE_KEY");
const instanceId = env("ZAPI_INSTANCE_ID");
const token = env("ZAPI_INSTANCE_TOKEN");

if (!url || !chave || !instanceId || !token) {
  console.error(
    "Faltam variáveis no .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ZAPI_INSTANCE_ID, ZAPI_INSTANCE_TOKEN",
  );
  process.exit(1);
}

const db = createClient(url, chave, { auth: { persistSession: false } });
const c = { instanceId, token, clientToken: env("ZAPI_CLIENT_TOKEN") };

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Repete o que falhou por causa da rede.
 *
 * São 80 mil linhas em 160 requisições grandes seguidas; na segunda execução,
 * 30 dos 49 grupos morreram com `fetch failed` no meio. Sem repetir, uma carga
 * "concluída" deixa buracos que ninguém vê — o grupo fica com a contagem certa
 * no retrato e a lista de membros pela metade.
 */
async function comRetentativa<T>(
  o_que: string,
  tarefa: () => Promise<{ error: { message: string } | null } & T>,
  tentativas = 4,
): Promise<{ error: { message: string } | null } & T> {
  let ultimo: Awaited<ReturnType<typeof tarefa>> | null = null;
  for (let n = 1; n <= tentativas; n++) {
    try {
      const r = await tarefa();
      if (!r.error) return r;
      ultimo = r;
    } catch (e) {
      ultimo = { error: { message: String((e as Error).message) } } as Awaited<
        ReturnType<typeof tarefa>
      >;
    }
    if (n < tentativas) await espera(500 * 2 ** (n - 1));
  }
  console.log(`      ${o_que}: desistiu após ${tentativas} tentativas — ${ultimo?.error?.message}`);
  return ultimo!;
}

/** Só o dia, no fuso de São Paulo — o retrato é diário. */
const hoje = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const agora = new Date().toISOString();

console.log("Lendo os grupos da instância…");
const grupos = await listarGrupos(c);
console.log(`${grupos.length} grupos.\n`);

let totalMembros = 0;
let totalComTelefone = 0;
let totalSairam = 0;
const falhas: string[] = [];

for (const [i, g] of grupos.entries()) {
  const prefixo = `[${String(i + 1).padStart(2)}/${grupos.length}] ${g.name ?? g.groupId}`;

  let m: Awaited<ReturnType<typeof metadados>>;
  try {
    m = await metadados(c, g.groupId);
  } catch (e) {
    console.log(`${prefixo}: falhou — ${(e as Error).message}`);
    falhas.push(g.groupId);
    continue;
  }

  const { error: erroGrupo } = await comRetentativa("grupo", () =>
    db.from("whatsapp_groups").upsert(
      {
        group_id: g.groupId,
        name: m.name ?? g.name,
        community_id: m.communityId ?? g.communityId,
        is_announcement: m.isAnnouncement,
        invitation_link: m.invitationLink,
        members_count: m.participantes.length,
        members_synced_at: agora,
        last_event_at: agora,
      },
      { onConflict: "group_id" },
    ),
  );
  if (erroGrupo) {
    console.log(`${prefixo}: erro ao gravar o grupo — ${erroGrupo.message}`);
    falhas.push(g.groupId);
    continue;
  }

  /* Palpite de identificação a partir do nome, só onde ninguém conferiu ainda.
     `confirmado_em` preenchido significa que uma pessoa decidiu na tela de
     Comunidades — e a carga não desfaz decisão de gente. */
  const sugestao = inferir(m.name ?? g.name);
  if (sugestao.numero != null) {
    await comRetentativa("identificação", () =>
      db
        .from("whatsapp_groups")
        .update({ numero: sugestao.numero, praca: sugestao.praca })
        .eq("group_id", g.groupId)
        .is("confirmado_em", null),
    );
  }

  // Quem já estava no banco antes desta leitura — para descobrir quem saiu.
  const antes = new Set<string>();
  for (let de = 0; ; de += 1000) {
    const { data } = await db
      .from("whatsapp_members")
      .select("member_key")
      .eq("group_id", g.groupId)
      .eq("status", "dentro")
      .range(de, de + 999);
    for (const r of data ?? []) antes.add(r.member_key as string);
    if (!data || data.length < 1000) break;
  }

  const linhas = m.participantes.map((p) => ({
    group_id: g.groupId,
    member_key: p.key,
    phone: p.phone,
    lid: p.lid,
    status: "dentro",
    // A carga não sabe quando a pessoa entrou nem quantas vezes: `entradas`
    // fica em zero de propósito, para não inventar histórico que não temos.
    source: "carga",
    updated_at: agora,
  }));

  let gravouTudo = true;
  for (let de = 0; de < linhas.length; de += 500) {
    const fatia = linhas.slice(de, de + 500);
    const { error } = await comRetentativa("membros", () =>
      db
        .from("whatsapp_members")
        .upsert(fatia, { onConflict: "group_id,member_key", ignoreDuplicates: false }),
    );
    if (error) {
      console.log(`${prefixo}: erro nos membros — ${error.message}`);
      gravouTudo = false;
      break;
    }
  }
  if (!gravouTudo) {
    // Lista incompleta no banco: reconciliar aqui marcaria como fora quem
    // apenas não chegou a ser gravado.
    falhas.push(g.groupId);
    console.log(`${prefixo}: gravação incompleta, grupo pulado`);
    continue;
  }

  // Reconciliação: quem estava dentro e não apareceu mais saiu do grupo.
  //
  // Só roda se a leitura veio íntegra. Uma resposta truncada da Z-API marcaria
  // o grupo inteiro como fora — o retrato erraria para menos e a tela mostraria
  // uma debandada que não houve.
  let sairam = 0;
  const confiavel = m.participantes.length > 0 && m.participantes.length >= antes.size * 0.5;
  if (confiavel && antes.size) {
    const agoraDentro = new Set(m.participantes.map((p) => p.key));
    const foram = [...antes].filter((k) => !agoraDentro.has(k));
    for (let de = 0; de < foram.length; de += 200) {
      const fatia = foram.slice(de, de + 200);
      await comRetentativa("saídas", () =>
        db
          .from("whatsapp_members")
          .update({ status: "fora", left_at: agora, updated_at: agora })
          .eq("group_id", g.groupId)
          .in("member_key", fatia),
      );
    }
    sairam = foram.length;
    totalSairam += sairam;
  } else if (!confiavel && antes.size) {
    console.log(
      `${prefixo}: leitura suspeita (${m.participantes.length} agora contra ${antes.size} antes) — saídas não aplicadas`,
    );
  }

  await comRetentativa("retrato", () =>
    db.from("whatsapp_group_snapshots").upsert(
      {
        group_id: g.groupId,
        taken_on: hoje,
        members: m.participantes.length,
        admins: m.participantes.filter((p) => p.isAdmin).length,
        taken_at: agora,
      },
      { onConflict: "group_id,taken_on" },
    ),
  );

  const comTelefone = m.participantes.filter((p) => p.phone).length;
  totalMembros += m.participantes.length;
  totalComTelefone += comTelefone;

  console.log(
    `${prefixo}: ${m.participantes.length} membros` +
      ` (${comTelefone} com telefone)` +
      (sairam ? ` · ${sairam} saíram desde a última leitura` : ""),
  );
}

const pct = totalMembros ? ((totalComTelefone / totalMembros) * 100).toFixed(1) : "0";
console.log(`\n${grupos.length - falhas.length} grupos gravados, ${totalMembros} membros.`);
console.log(`Com telefone identificado: ${totalComTelefone} (${pct}%).`);
if (totalSairam) console.log(`Marcados como fora: ${totalSairam}.`);
if (falhas.length) console.log(`Falharam: ${falhas.length} — ${falhas.join(", ")}`);
