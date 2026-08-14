/**
 * Gravação dos eventos de grupo.
 *
 * O log é a fonte da verdade e nunca é reescrito; `whatsapp_members` é a
 * leitura rápida derivada dele. Se um dia as duas divergirem, o log ganha — e
 * dá para recontar a partir dele.
 */
import { db } from "@/lib/supabase";
import { type EventoGrupo, mudaEstado } from "./eventos";

export interface Resultado {
  gravados: number;
  repetidos: number;
  erro?: string;
}

/**
 * Grava os eventos e atualiza o estado de quem entrou ou saiu.
 *
 * A idempotência é do banco, não daqui: `event_key` é único, e o aviso
 * reenviado pela Z-API bate na restrição em vez de virar uma segunda entrada.
 */
export async function gravarEventos(eventos: EventoGrupo[]): Promise<Resultado> {
  if (!eventos.length) return { gravados: 0, repetidos: 0 };

  const sb = db();
  if (!sb) return { gravados: 0, repetidos: 0, erro: "banco não configurado" };

  // O grupo precisa existir antes dos eventos — e é aqui que ele é descoberto,
  // sem cadastro manual. O nome é atualizado a cada aviso: grupo renomeado
  // passa a aparecer com o nome novo.
  const grupos = new Map<string, string | null>();
  for (const e of eventos) if (!grupos.has(e.groupId)) grupos.set(e.groupId, e.groupName);

  for (const [groupId, name] of grupos) {
    const { error } = await sb.from("whatsapp_groups").upsert(
      {
        group_id: groupId,
        ...(name ? { name } : {}),
        last_event_at: new Date().toISOString(),
      },
      { onConflict: "group_id" },
    );
    if (error) console.error("[zapi] grupo:", error.message);
  }

  const { data, error } = await sb
    .from("whatsapp_group_events")
    .upsert(
      eventos.map((e) => ({
        group_id: e.groupId,
        group_name: e.groupName,
        phone: e.phone,
        lid: e.lid,
        member_key: e.memberKey,
        actor_phone: e.actorPhone,
        actor_lid: e.actorLid,
        kind: e.kind,
        notification: e.notification,
        method: e.method,
        occurred_at: e.occurredAt,
        event_key: e.eventKey,
        // O aviso cru fica guardado. Custa pouco (dezenas por dia) e é o que
        // permite responder depois "em que formato isso chegou?" — pergunta
        // que já apareceu quando o LID veio sem o sufixo e não havia como
        // conferir sem esperar o próximo evento.
        payload: e.bruto ?? null,
      })),
      { onConflict: "event_key", ignoreDuplicates: true },
    )
    .select("event_key");

  if (error) {
    console.error("[zapi] eventos:", error.message);
    return { gravados: 0, repetidos: 0, erro: error.message };
  }

  const gravadas = new Set((data ?? []).map((r) => r.event_key as string));
  const novos = eventos.filter((e) => gravadas.has(e.eventKey));

  // Só o que é inédito mexe no estado: reprocessar um aviso repetido não pode
  // somar mais uma entrada para a mesma pessoa.
  for (const e of novos) await aplicarNoMembro(e);

  return { gravados: novos.length, repetidos: eventos.length - novos.length };
}

async function aplicarNoMembro(e: EventoGrupo): Promise<void> {
  const status = mudaEstado(e.kind);
  if (!status) return;

  const sb = db();
  if (!sb) return;

  /* A mesma pessoa pode estar gravada sob outra identidade: a carga inicial lê
     grupo comum pelo telefone e grupo de comunidade pelo LID, enquanto o aviso
     do webhook vem sempre pelo LID. Procurar só pela chave criaria uma segunda
     linha para quem já está lá, e o grupo pareceria ganhar um membro no dia em
     que perdeu um. Por isso a busca aceita qualquer uma das três formas. */
  const formas = [`member_key.eq.${e.memberKey}`];
  if (e.lid) formas.push(`lid.eq.${e.lid}`);
  if (e.phone) formas.push(`phone.eq.${e.phone}`);

  const { data: achados } = await sb
    .from("whatsapp_members")
    .select("id, entradas, saidas, source, member_key")
    .eq("group_id", e.groupId)
    .or(formas.join(","))
    .limit(1);

  const atual = achados?.[0] ?? null;
  // Se já existe, a chave dela manda — trocar geraria uma linha órfã.
  const memberKey = (atual?.member_key as string | undefined) ?? e.memberKey;

  // Só o carimbo do lado que mudou é escrito: sair não pode apagar a data em
  // que a pessoa entrou, nem voltar apagar a data em que saiu antes.
  const linha: Record<string, unknown> = {
    group_id: e.groupId,
    member_key: memberKey,
    // Só preenche o que o aviso trouxe: o LID do evento não pode apagar o
    // telefone que a carga inicial conseguiu descobrir.
    ...(e.phone ? { phone: e.phone } : {}),
    ...(e.lid ? { lid: e.lid } : {}),
    status,
    entradas: Number(atual?.entradas ?? 0) + (status === "dentro" ? 1 : 0),
    saidas: Number(atual?.saidas ?? 0) + (status === "fora" ? 1 : 0),
    updated_at: new Date().toISOString(),
  };
  if (status === "dentro") linha.joined_at = e.occurredAt;
  else linha.left_at = e.occurredAt;
  // Quem veio da carga inicial e agora se mexeu passa a ser observado de fato.
  if (atual?.source === "carga") linha.source = "webhook";

  const { error } = await sb
    .from("whatsapp_members")
    .upsert(linha, { onConflict: "group_id,member_key" });
  if (error) console.error("[zapi] membro:", error.message);
}
