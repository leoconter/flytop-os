"use server";

import { revalidatePath } from "next/cache";
import { monthKey } from "@/lib/monde/goals";
import { db } from "@/lib/supabase";

/**
 * Grava a meta da agência ou de um vendedor.
 *
 * Server Action: a escrita acontece no servidor, com a service_role — a chave
 * nunca chega ao navegador. Valor vazio apaga a meta.
 */
export async function saveGoal(formData: FormData): Promise<void> {
  const sb = db();
  if (!sb) throw new Error("Banco não configurado");

  const month = monthKey(String(formData.get("month") ?? ""));
  const sellerId = String(formData.get("sellerId") ?? "").trim();
  const raw = String(formData.get("amount") ?? "").trim();
  const scope = sellerId ? "seller" : "agency";

  // Aceita "3.500.000,00" e "3500000" — o campo é digitado por pessoas.
  const amount = raw
    ? Number(raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""))
    : null;

  if (raw && (amount === null || Number.isNaN(amount) || amount < 0)) {
    throw new Error("Valor inválido");
  }

  if (amount === null) {
    const q = sb.from("sales_goals").delete().eq("month", month).eq("scope", scope);
    const { error } = sellerId ? await q.eq("seller_id", sellerId) : await q;
    if (error) throw new Error(error.message);
    revalidatePath("/metas");
    revalidatePath("/");
    return;
  }

  // Sem upsert de propósito: os índices únicos da tabela são parciais
  // (`where scope = ...`), e o Postgres não aceita índice parcial como alvo de
  // ON CONFLICT. Eles seguem garantindo a unicidade — só não servem de âncora.
  const find = sb.from("sales_goals").select("id").eq("month", month).eq("scope", scope);
  const { data: existing, error: findErr } = sellerId
    ? await find.eq("seller_id", sellerId).maybeSingle()
    : await find.is("seller_id", null).maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (existing) {
    const { error } = await sb
      .from("sales_goals")
      .update({ amount, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("sales_goals").insert({
      month,
      scope,
      seller_id: sellerId || null,
      amount,
    });
    if (error) throw new Error(error.message);
  }

  // A meta alimenta o Dashboard Geral: os dois precisam refletir na hora.
  revalidatePath("/metas");
  revalidatePath("/");
}
