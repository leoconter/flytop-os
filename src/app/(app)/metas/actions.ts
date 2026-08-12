"use server";

import { revalidatePath } from "next/cache";
import { monthKey } from "@/lib/monde/goals";
import { db } from "@/lib/supabase";

/** Aceita "3.500.000,00" e "3500000" — o campo é digitado por pessoas. */
function parseAmount(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  if (Number.isNaN(n) || n < 0) throw new Error(`Valor inválido: "${raw}"`);
  return n;
}

/**
 * Grava a planilha de metas de um ano inteiro.
 *
 * Os campos chegam como `c:<agency|sellerId>:<AAAA-MM-01>`. Em vez de uma
 * escrita por célula (seriam ~160), lê o que já existe no ano e aplica só a
 * diferença: um delete e um insert, no máximo.
 */
export async function saveGoalsYear(formData: FormData): Promise<void> {
  const sb = db();
  if (!sb) throw new Error("Banco não configurado");

  const year = Number(formData.get("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Ano inválido");
  }

  // Célula preenchida → meta desejada; vazia → sem meta.
  const desired = new Map<string, number>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("c:")) continue;
    const [, who, month] = key.split(":");
    if (!month?.startsWith(String(year))) continue;
    const amount = parseAmount(String(value));
    if (amount !== null) desired.set(`${who}|${month}`, amount);
  }

  const { data: existing, error: readErr } = await sb
    .from("sales_goals")
    .select("id, scope, seller_id, month, amount")
    .gte("month", `${year}-01-01`)
    .lte("month", `${year}-12-01`);
  if (readErr) throw new Error(readErr.message);

  const stale: string[] = [];
  for (const row of existing ?? []) {
    const who = row.scope === "agency" ? "agency" : String(row.seller_id);
    const k = `${who}|${monthKey(String(row.month))}`;
    const want = desired.get(k);
    // Some ou mudou de valor: nos dois casos a linha antiga sai.
    if (want === undefined || want !== Number(row.amount)) stale.push(row.id as string);
    if (want !== undefined && want === Number(row.amount)) desired.delete(k);
  }

  if (stale.length) {
    const { error } = await sb.from("sales_goals").delete().in("id", stale);
    if (error) throw new Error(error.message);
  }

  const inserts = [...desired].map(([k, amount]) => {
    const [who, month] = k.split("|");
    return {
      month,
      scope: who === "agency" ? "agency" : "seller",
      seller_id: who === "agency" ? null : who,
      amount,
    };
  });
  if (inserts.length) {
    const { error } = await sb.from("sales_goals").insert(inserts);
    if (error) throw new Error(error.message);
  }

  // A meta alimenta o Dashboard Geral: os dois precisam refletir na hora.
  revalidatePath("/metas");
  revalidatePath("/");
}
