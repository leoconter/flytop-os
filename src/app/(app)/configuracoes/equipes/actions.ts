"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/supabase";

function revalidar() {
  revalidatePath("/configuracoes/equipes");
  revalidatePath("/configuracoes/usuarios");
  revalidatePath("/vendedor");
}

export async function criarEquipe(formData: FormData): Promise<void> {
  await requireAdmin();
  const sb = db();
  if (!sb) throw new Error("Banco não configurado");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe o nome da equipe");

  const { error } = await sb.from("teams").insert({ name });
  if (error) {
    if (error.code === "23505") throw new Error(`Já existe uma equipe chamada "${name}"`);
    throw new Error(error.message);
  }
  revalidar();
}

export async function renomearEquipe(formData: FormData): Promise<void> {
  await requireAdmin();
  const sb = db();
  if (!sb) throw new Error("Banco não configurado");

  const id = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe o nome da equipe");

  const { error } = await sb.from("teams").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

/**
 * Apaga a equipe. Os vendedores não são apagados: o `on delete set null` da
 * coluna devolve todos para "sem equipe".
 */
export async function removerEquipe(formData: FormData): Promise<void> {
  await requireAdmin();
  const sb = db();
  if (!sb) throw new Error("Banco não configurado");

  const { error } = await sb.from("teams").delete().eq("id", String(formData.get("teamId") ?? ""));
  if (error) throw new Error(error.message);
  revalidar();
}

/**
 * Grava a equipe de cada vendedor de uma vez.
 *
 * Os campos chegam como `s:<sellerId>` com o id da equipe (ou vazio). Só as
 * mudanças viram escrita — agrupadas por equipe de destino, para não fazer uma
 * consulta por vendedor.
 */
export async function salvarIntegrantes(formData: FormData): Promise<void> {
  await requireAdmin();
  const sb = db();
  if (!sb) throw new Error("Banco não configurado");

  const desejado = new Map<string, string | null>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("s:")) continue;
    desejado.set(key.slice(2), String(value) || null);
  }
  if (!desejado.size) return;

  const { data: atuais, error } = await sb
    .from("monde_sellers")
    .select("seller_id, team_id")
    .in("seller_id", [...desejado.keys()]);
  if (error) throw new Error(error.message);

  const porDestino = new Map<string, string[]>();
  for (const linha of atuais ?? []) {
    const id = linha.seller_id as string;
    const antes = (linha.team_id as string) ?? null;
    const depois = desejado.get(id) ?? null;
    if (antes === depois) continue;
    const chave = depois ?? "";
    porDestino.set(chave, [...(porDestino.get(chave) ?? []), id]);
  }

  for (const [destino, ids] of porDestino) {
    const { error: e } = await sb
      .from("monde_sellers")
      .update({ team_id: destino || null })
      .in("seller_id", ids);
    if (e) throw new Error(e.message);
  }

  revalidar();
}
