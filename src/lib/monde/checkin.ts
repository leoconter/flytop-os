/**
 * Check-in dos embarques e retornos.
 *
 * O estado é por **trecho**, não por venda: uma ida e volta tem dois check-ins,
 * em datas diferentes, e é comum um estar feito e o outro não.
 *
 * Quem não tem registro nenhum está simplesmente "a fazer" — a ausência é um
 * estado legítimo, e não um dado faltando.
 */
import { db } from "@/lib/supabase";

export type StatusCheckin = "feito" | "pendente" | "a-fazer";

export interface Motivo {
  id: string;
  label: string;
}

export interface Checkin {
  status: Exclude<StatusCheckin, "a-fazer">;
  motivoId: string | null;
  motivo: string | null;
  nota: string | null;
  quem: string | null;
  quando: string;
}

export async function listarMotivos(incluirInativos = false): Promise<Motivo[]> {
  const sb = db();
  if (!sb) return [];

  let query = sb.from("checkin_reasons").select("id, label, ativo").order("label");
  if (!incluirInativos) query = query.eq("ativo", true);

  const { data, error } = await query;
  if (error) {
    console.error("[checkin] motivos:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ id: r.id as string, label: r.label as string }));
}

/**
 * Os check-ins de um conjunto de trechos.
 *
 * Recebe os ids em vez de varrer a tabela inteira: a tela mostra 30 ou 40
 * voos, e trazer o histórico completo para exibir isso seria desperdício que
 * cresce sozinho com o tempo.
 */
export async function checkinsDe(segmentIds: string[]): Promise<Map<string, Checkin>> {
  const mapa = new Map<string, Checkin>();
  if (!segmentIds.length) return mapa;

  const sb = db();
  if (!sb) return mapa;

  for (let i = 0; i < segmentIds.length; i += 200) {
    const fatia = segmentIds.slice(i, i + 200);
    const { data, error } = await sb
      .from("flight_checkins")
      .select(
        "segment_id, status, reason_id, nota, marked_at, checkin_reasons(label), app_users(first_name, last_name)",
      )
      .in("segment_id", fatia);

    if (error) {
      console.error("[checkin] leitura:", error.message);
      return mapa;
    }

    for (const r of data ?? []) {
      const motivo = r.checkin_reasons as { label?: string } | null;
      const quem = r.app_users as { first_name?: string; last_name?: string } | null;
      mapa.set(r.segment_id as string, {
        status: r.status as "feito" | "pendente",
        motivoId: (r.reason_id as string) ?? null,
        motivo: motivo?.label ?? null,
        nota: (r.nota as string) ?? null,
        quem: quem ? `${quem.first_name ?? ""} ${quem.last_name ?? ""}`.trim() || null : null,
        quando: r.marked_at as string,
      });
    }
  }

  return mapa;
}

export async function marcarFeito(
  segmentId: string,
  userId: string | null,
): Promise<string | null> {
  const sb = db();
  if (!sb) return "Banco não configurado.";

  const { error } = await sb.from("flight_checkins").upsert(
    {
      segment_id: segmentId,
      status: "feito",
      // Marcar como feito limpa o motivo: os dois juntos se contradizem.
      reason_id: null,
      nota: null,
      marked_by: userId,
      marked_at: new Date().toISOString(),
    },
    { onConflict: "segment_id" },
  );
  return error ? error.message : null;
}

export async function marcarPendente(
  segmentId: string,
  reasonId: string,
  nota: string | null,
  userId: string | null,
): Promise<string | null> {
  const sb = db();
  if (!sb) return "Banco não configurado.";

  const { error } = await sb.from("flight_checkins").upsert(
    {
      segment_id: segmentId,
      status: "pendente",
      reason_id: reasonId,
      nota,
      marked_by: userId,
      marked_at: new Date().toISOString(),
    },
    { onConflict: "segment_id" },
  );
  return error ? error.message : null;
}

/** Volta ao estado "a fazer" — desfaz uma marcação errada. */
export async function limpar(segmentId: string): Promise<string | null> {
  const sb = db();
  if (!sb) return "Banco não configurado.";
  const { error } = await sb.from("flight_checkins").delete().eq("segment_id", segmentId);
  return error ? error.message : null;
}

export async function criarMotivo(label: string): Promise<{ erro?: string; id?: string }> {
  const sb = db();
  if (!sb) return { erro: "Banco não configurado." };

  const { data, error } = await sb
    .from("checkin_reasons")
    .insert({ label })
    .select("id")
    .single();

  if (error) {
    // Motivo repetido não é erro do usuário: reaproveita o que já existe, e
    // reativa se estava desativado.
    if (error.code === "23505") {
      const { data: existente } = await sb
        .from("checkin_reasons")
        .select("id")
        .eq("label", label)
        .single();
      if (existente) {
        await sb.from("checkin_reasons").update({ ativo: true }).eq("id", existente.id);
        return { id: existente.id as string };
      }
    }
    return { erro: error.message };
  }

  return { id: data.id as string };
}
