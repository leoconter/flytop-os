/**
 * Quando os dados do Monde foram atualizados pela última vez.
 *
 * O cabeçalho dizia "Sincronizado" o tempo todo, inclusive quando a última
 * carga tinha falhado — um selo que nunca muda não informa nada. Aqui a data
 * real é lida de `sync_runs`.
 */
import { db } from "@/lib/supabase";

export interface UltimaSync {
  /** "12/08 às 20:23", já no fuso de São Paulo. */
  quando: string;
  ok: boolean;
  /** Só quando falhou. */
  erro: string | null;
}

const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Formata no servidor: enviar texto pronto evita divergência na hidratação. */
function formatar(iso: string): string {
  const p = fmt.formatToParts(new Date(iso));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("day")}/${get("month")} às ${get("hour")}:${get("minute")}`;
}

export async function getUltimaSync(): Promise<UltimaSync | null> {
  const sb = db();
  if (!sb) return null;

  const { data } = await sb
    .from("sync_runs")
    .select("status, error_message, finished_at, started_at")
    .eq("source", "monde")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    quando: formatar((data.finished_at as string) ?? (data.started_at as string)),
    ok: data.status === "success",
    erro: data.status === "success" ? null : ((data.error_message as string) ?? "falha na atualização"),
  };
}
