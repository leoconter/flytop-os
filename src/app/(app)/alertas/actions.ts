"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AcaoState } from "@/components/form-acao";
import type { AlertFields } from "@/lib/alert-message";
import {
  atualizarAlerta,
  criarAlerta,
  excluirAlerta,
  marcarEnvio,
} from "@/lib/alertas/store";
import { currentUser } from "@/lib/auth/session";

/**
 * Erros aqui viram estado, não exceção: um alerta sem título ou sem mensagem é
 * uso normal do formulário, e `throw` numa Server Action troca a tela inteira
 * por uma página de erro.
 */

/** As datas viajam como JSON num campo escondido — são listas, não um valor. */
function datas(fd: FormData, campo: string): string[] {
  try {
    const v = JSON.parse(String(fd.get(campo) ?? "[]"));
    return Array.isArray(v) ? v.filter((d): d is string => typeof d === "string") : [];
  } catch {
    return [];
  }
}

function lerCampos(fd: FormData): AlertFields {
  return {
    titulo: String(fd.get("titulo") ?? "").trim(),
    origem: String(fd.get("origem") ?? "").trim(),
    destino: String(fd.get("destino") ?? "").trim(),
    cabine: String(fd.get("cabine") ?? "").trim(),
    companhia: String(fd.get("companhia") ?? "").trim(),
    de: String(fd.get("de") ?? "").trim(),
    por: String(fd.get("por") ?? "").trim(),
    xjuros: String(fd.get("xjuros") ?? "").trim(),
    idaDates: datas(fd, "idaDates"),
    voltaDates: datas(fd, "voltaDates"),
  };
}

/**
 * Guarda o alerta no banco. Não dispara nada: quem envia é uma pessoa, com o
 * texto copiado da lista.
 */
export async function salvarAlerta(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const id = String(formData.get("id") ?? "").trim();
  const fields = lerCampos(formData);
  const mensagem = String(formData.get("mensagem") ?? "").trim();

  if (!fields.titulo) return { erro: "Informe o título do alerta." };
  if (!fields.destino) return { erro: "Informe o destino." };
  if (!mensagem) return { erro: "Gere a mensagem antes de salvar." };

  const user = await currentUser();
  const erro = id
    ? await atualizarAlerta(id, fields, mensagem)
    : await criarAlerta(fields, mensagem, user?.userId ?? null);
  if (erro) return { erro };

  revalidatePath("/alertas");
  revalidatePath("/alertas/dados");
  // Fora do try: `redirect` sinaliza por exceção e precisa chegar ao framework.
  redirect("/alertas");
}

/** Registra que o alerta foi (ou não foi) colado nos grupos. */
export async function alternarEnvio(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const id = String(formData.get("id") ?? "");
  const enviado = String(formData.get("enviado") ?? "") === "1";
  if (!id) return { erro: "Alerta não encontrado." };

  const erro = await marcarEnvio(id, enviado);
  if (erro) return { erro };

  revalidatePath("/alertas");
  revalidatePath("/alertas/dados");
  return { ok: enviado ? "Marcado como enviado." : "Devolvido para a fila." };
}

export async function removerAlerta(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { erro: "Alerta não encontrado." };

  const erro = await excluirAlerta(id);
  if (erro) return { erro };

  revalidatePath("/alertas");
  revalidatePath("/alertas/dados");
  return { ok: "Alerta excluído." };
}
