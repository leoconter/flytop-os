"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

/**
 * Cria ou atualiza uma regra de classe tarifária.
 *
 * Companhia vazia grava a regra padrão, usada quando a companhia não tem
 * regra própria. Cabine vazia apaga a regra.
 */
export async function saveFareRule(formData: FormData): Promise<void> {
  const sb = db();
  if (!sb) throw new Error("Banco não configurado");

  const airline = String(formData.get("airlineCode") ?? "").trim().toUpperCase();
  const fareClass = String(formData.get("fareClass") ?? "").trim().toUpperCase();
  const cabin = String(formData.get("cabin") ?? "").trim();
  const confirmed = formData.get("confirmed") === "on";

  if (!fareClass) throw new Error("Informe a classe tarifária");

  // Busca antes de gravar: o índice único é NULLS NOT DISTINCT, mas o
  // PostgREST não sabe apontar para ele em ON CONFLICT.
  const find = sb.from("fare_class_map").select("id").eq("fare_class", fareClass);
  const { data: existing, error: findErr } = airline
    ? await find.eq("airline_code", airline).maybeSingle()
    : await find.is("airline_code", null).maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (!cabin) {
    if (existing) {
      const { error } = await sb.from("fare_class_map").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
    }
  } else if (existing) {
    const { error } = await sb
      .from("fare_class_map")
      .update({ cabin, confirmed, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("fare_class_map").insert({
      airline_code: airline || null,
      fare_class: fareClass,
      cabin,
      confirmed,
    });
    if (error) throw new Error(error.message);
  }

  // A cabine aparece no Geral e no Interno: os três precisam refletir juntos.
  revalidatePath("/configuracoes");
  revalidatePath("/interno");
  revalidatePath("/");
}
