"use server";

import { revalidatePath } from "next/cache";
import type { AcaoState } from "@/components/form-acao";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/supabase";

/**
 * Cria ou atualiza uma regra de classe tarifária.
 *
 * Companhia vazia grava a regra padrão, usada quando a companhia não tem
 * regra própria. Cabine vazia apaga a regra.
 *
 * Devolve estado em vez de lançar: erro esperado tem que virar recado na
 * tela, não trocar a página inteira pela tela de erro do Next.
 */
export async function saveFareRule(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  await requireAdmin();

  const sb = db();
  if (!sb) return { erro: "Banco não configurado." };

  const airline = String(formData.get("airlineCode") ?? "").trim().toUpperCase();
  const fareClass = String(formData.get("fareClass") ?? "").trim().toUpperCase();
  const cabin = String(formData.get("cabin") ?? "").trim();
  const confirmed = formData.get("confirmed") === "on";

  if (!fareClass) return { erro: "Informe a classe tarifária." };

  const onde = airline ? `${airline} / ${fareClass}` : `padrão ${fareClass}`;

  // Busca antes de gravar: o índice único é NULLS NOT DISTINCT, mas o
  // PostgREST não sabe apontar para ele em ON CONFLICT.
  const find = sb.from("fare_class_map").select("id").eq("fare_class", fareClass);
  const { data: existing, error: findErr } = airline
    ? await find.eq("airline_code", airline).maybeSingle()
    : await find.is("airline_code", null).maybeSingle();
  if (findErr) return { erro: findErr.message };

  if (!cabin) {
    if (!existing) return { ok: "Nada a remover." };
    const { error } = await sb.from("fare_class_map").delete().eq("id", existing.id);
    if (error) return { erro: error.message };
  } else if (existing) {
    const { error } = await sb
      .from("fare_class_map")
      .update({ cabin, confirmed, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { erro: error.message };
  } else {
    const { error } = await sb.from("fare_class_map").insert({
      airline_code: airline || null,
      fare_class: fareClass,
      cabin,
      confirmed,
    });
    if (error) {
      if (error.code === "23505") return { erro: `Já existe regra para ${onde}.` };
      return { erro: error.message };
    }
  }

  // A cabine aparece no Geral e no Interno: os três precisam refletir juntos.
  revalidatePath("/configuracoes");
  revalidatePath("/interno");
  revalidatePath("/");

  return { ok: cabin ? `${onde} → ${cabin}` : `Regra de ${onde} removida.` };
}
