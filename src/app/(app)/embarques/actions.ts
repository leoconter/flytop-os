"use server";

import { revalidatePath } from "next/cache";
import type { AcaoState } from "@/components/form-acao";
import { currentUser } from "@/lib/auth/session";
import { criarMotivo, limpar, marcarFeito, marcarPendente } from "@/lib/monde/checkin";

function revalidar() {
  revalidatePath("/embarques");
  revalidatePath("/embarques/retornos");
  revalidatePath("/embarques/retornaram");
}

export async function checkinFeito(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };

  const segmentId = String(formData.get("segmentId") ?? "");
  if (!segmentId) return { erro: "Voo não informado." };

  const erro = await marcarFeito(segmentId, user.userId);
  if (erro) return { erro };

  revalidar();
  return { ok: "Check-in marcado." };
}

/**
 * Justifica o check-in não feito.
 *
 * Aceita um motivo novo digitado na hora (`novoMotivo`): a operação descobre
 * razões que ninguém previu, e obrigá-la a sair da tela para cadastrar faria a
 * justificativa não ser registrada.
 */
export async function checkinPendente(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };

  const segmentId = String(formData.get("segmentId") ?? "");
  if (!segmentId) return { erro: "Voo não informado." };

  const novo = String(formData.get("novoMotivo") ?? "").trim();
  let reasonId = String(formData.get("reasonId") ?? "");

  if (novo) {
    const r = await criarMotivo(novo);
    if (r.erro) return { erro: r.erro };
    reasonId = r.id!;
  }

  if (!reasonId) return { erro: "Escolha ou escreva uma justificativa." };

  const nota = String(formData.get("nota") ?? "").trim() || null;
  const erro = await marcarPendente(segmentId, reasonId, nota, user.userId);
  if (erro) return { erro };

  revalidar();
  return { ok: "Justificativa registrada." };
}

/** Desfaz a marcação e devolve o voo para "a fazer". */
export async function checkinLimpar(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };

  const erro = await limpar(String(formData.get("segmentId") ?? ""));
  if (erro) return { erro };

  revalidar();
  return { ok: "Marcação desfeita." };
}
