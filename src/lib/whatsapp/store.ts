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
        actor_phone: e.actorPhone,
        kind: e.kind,
        notification: e.notification,
        method: e.method,
        occurred_at: e.occurredAt,
        event_key: e.eventKey,
        payload: null,
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

  const { data: atual } = await sb
    .from("whatsapp_members")
    .select("id, entradas, saidas")
    .eq("group_id", e.groupId)
    .eq("phone", e.phone)
    .maybeSingle();

  // Só o carimbo do lado que mudou é escrito: sair não pode apagar a data em
  // que a pessoa entrou, nem voltar apagar a data em que saiu antes.
  const linha: Record<string, unknown> = {
    group_id: e.groupId,
    phone: e.phone,
    status,
    entradas: Number(atual?.entradas ?? 0) + (status === "dentro" ? 1 : 0),
    saidas: Number(atual?.saidas ?? 0) + (status === "fora" ? 1 : 0),
    updated_at: new Date().toISOString(),
  };
  if (status === "dentro") linha.joined_at = e.occurredAt;
  else linha.left_at = e.occurredAt;

  const { error } = await sb
    .from("whatsapp_members")
    .upsert(linha, { onConflict: "group_id,phone" });
  if (error) console.error("[zapi] membro:", error.message);
}
