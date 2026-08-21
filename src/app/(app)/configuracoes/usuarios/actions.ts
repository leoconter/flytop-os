"use server";

import { revalidatePath } from "next/cache";
import type { AcaoState } from "@/components/form-acao";
import { requireAdmin } from "@/lib/auth/session";
import { createUser, deleteUser, editUser, updateUser } from "@/lib/auth/users";
import { removerFatores } from "@/lib/auth/mfa";

/**
 * Todas devolvem estado em vez de lançar: e-mail repetido, senha curta ou
 * vendedor já vinculado são erros de uso normal, e `throw` numa Server Action
 * troca a tela inteira por "A server error occurred".
 */

const SENHA_MIN = 8;

/** Cria a conta e, se escolhido, já a vincula ao vendedor do Monde. */
export async function criarUsuario(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  await requireAdmin();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "vendedor") === "admin" ? "admin" : "vendedor";
  const sellerId = String(formData.get("sellerId") ?? "").trim() || null;

  if (!firstName || !lastName) return { erro: "Informe nome e sobrenome." };
  if (!email.includes("@")) return { erro: "E-mail inválido." };
  if (password.length < SENHA_MIN) {
    return { erro: `A senha precisa de pelo menos ${SENHA_MIN} caracteres.` };
  }

  const erro = await createUser({ firstName, lastName, email, password, role, sellerId });
  if (erro) return { erro };

  revalidatePath("/configuracoes/usuarios");
  return { ok: `Conta de ${firstName} ${lastName} criada.` };
}

/** Salva a conta inteira: nome, e-mail, papel, vínculo e — se preenchida — senha. */
export async function editarUsuario(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const emailAtual = String(formData.get("emailAtual") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "vendedor") === "admin" ? "admin" : "vendedor";
  const sellerId = String(formData.get("sellerId") ?? "").trim() || null;

  if (!firstName || !lastName) return { erro: "Informe nome e sobrenome." };
  if (!email.includes("@")) return { erro: "E-mail inválido." };
  if (password && password.length < SENHA_MIN) {
    return { erro: `A senha precisa de pelo menos ${SENHA_MIN} caracteres.` };
  }

  const erro = await editUser(userId, emailAtual, {
    firstName,
    lastName,
    email,
    role,
    sellerId,
    password: password || undefined,
  });
  if (erro) return { erro };

  revalidatePath("/configuracoes/usuarios");
  revalidatePath("/vendedor");
  return { ok: password ? "Conta e senha atualizadas." : "Conta atualizada." };
}

export async function alternarAtivo(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const ativar = String(formData.get("ativar") ?? "") === "1";

  // Desativar a própria conta tiraria o último administrador da sala.
  if (userId === admin.userId && !ativar) {
    return { erro: "Você não pode desativar a própria conta." };
  }

  const erro = await updateUser(userId, { active: ativar });
  if (erro) return { erro };

  revalidatePath("/configuracoes/usuarios");
  return { ok: ativar ? "Conta reativada." : "Conta desativada." };
}

export async function removerUsuario(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (userId === admin.userId) return { erro: "Você não pode remover a própria conta." };

  const erro = await deleteUser(userId);
  if (erro) return { erro };

  revalidatePath("/configuracoes/usuarios");
  return { ok: "Conta removida." };
}

/**
 * Tira o 2FA de uma conta.
 *
 * É o caminho de volta de quem perdeu o celular: sem isso, a pessoa fica
 * trancada do lado de fora para sempre, porque o segundo fator é obrigatório.
 * No próximo login ela cadastra um autenticador novo.
 */
export async function resetarMfa(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { erro: "Conta não informada." };

  const erro = await removerFatores(userId);
  if (erro) return { erro };

  revalidatePath("/configuracoes/usuarios");
  return { ok: "2FA removido. A pessoa vai configurar de novo no próximo login." };
}
