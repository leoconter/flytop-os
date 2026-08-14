"use server";

import { revalidatePath } from "next/cache";
import type { AcaoState } from "@/components/form-acao";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/supabase";
import { inferir } from "@/lib/whatsapp/rotulo";

function revalidar() {
  revalidatePath("/configuracoes/comunidades");
  revalidatePath("/comunidade");
}

/**
 * Grava a identificação de um grupo.
 *
 * Salvar carimba `confirmado_em`: é isso que separa o que uma pessoa conferiu
 * do que o sistema chutou lendo o nome. A carga nunca mexe no que foi
 * confirmado.
 */
export async function salvarGrupo(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  await requireAdmin();
  const sb = db();
  if (!sb) return { erro: "Banco não configurado." };

  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return { erro: "Grupo não informado." };

  const cru = String(formData.get("numero") ?? "").trim();
  let numero: number | null = null;
  if (cru) {
    const n = Number(cru.replace(/[^\d]/g, ""));
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      return { erro: "O número da comunidade precisa estar entre 1 e 999." };
    }
    numero = n;
  }

  const praca = String(formData.get("praca") ?? "").trim().toUpperCase() || null;
  const apelido = String(formData.get("apelido") ?? "").trim() || null;

  const { error } = await sb
    .from("whatsapp_groups")
    .update({ numero, praca, apelido, confirmado_em: new Date().toISOString() })
    .eq("group_id", groupId);
  if (error) return { erro: error.message };

  revalidar();
  return { ok: "Identificação salva." };
}

/** Tira o grupo das telas sem apagar nada do histórico. */
export async function alternarAtivo(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  await requireAdmin();
  const sb = db();
  if (!sb) return { erro: "Banco não configurado." };

  const groupId = String(formData.get("groupId") ?? "");
  const ativo = String(formData.get("ativo") ?? "") === "1";

  const { error } = await sb
    .from("whatsapp_groups")
    .update({ ativo: !ativo })
    .eq("group_id", groupId);
  if (error) return { erro: error.message };

  revalidar();
  return { ok: ativo ? "Comunidade desativada." : "Comunidade reativada." };
}

/**
 * Aceita de uma vez o que a leitura do nome sugeriu.
 *
 * São 46 grupos com número no nome; conferir um a um seria trabalho sem
 * ganho. O que não tem sugestão continua pedindo alguém — de propósito.
 */
// Sem parâmetros de propósito: não lê nada do formulário, e declará-los só
// para ignorá-los faria o lint reclamar com razão.
export async function aceitarSugestoes(): Promise<AcaoState> {
  await requireAdmin();
  const sb = db();
  if (!sb) return { erro: "Banco não configurado." };

  const { data, error } = await sb
    .from("whatsapp_groups")
    .select("group_id, name, numero, praca, confirmado_em");
  if (error) return { erro: error.message };

  const agora = new Date().toISOString();
  let gravados = 0;

  for (const g of data ?? []) {
    // Não mexe no que já foi conferido: a tela existe justamente para corrigir
    // o que a leitura erra, e reaplicar o palpite desfaria a correção.
    if (g.confirmado_em) continue;

    const s = inferir(g.name as string | null);
    if (s.numero == null) continue;

    const { error: e } = await sb
      .from("whatsapp_groups")
      .update({ numero: s.numero, praca: s.praca, confirmado_em: agora })
      .eq("group_id", g.group_id as string);
    if (e) return { erro: e.message };
    gravados++;
  }

  revalidar();
  if (!gravados) return { ok: "Nada novo para aplicar." };
  return { ok: `${gravados} ${gravados === 1 ? "comunidade identificada" : "comunidades identificadas"}.` };
}
