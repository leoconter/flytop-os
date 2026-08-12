"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createUser, deleteUser, setPassword, updateUser } from "@/lib/auth/users";

export interface FormState {
  erro?: string;
  ok?: string;
}

const SENHA_MIN = 8;

/** Cria a conta e, se escolhido, já a vincula ao vendedor do Monde. */
export async function criarUsuario(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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

/** Vincula (ou desvincula) a conta a um vendedor do Monde, e ajusta o papel. */
export async function salvarVinculo(formData: FormData): Promise<void> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const sellerId = String(formData.get("sellerId") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "vendedor") === "admin" ? "admin" : "vendedor";

  const erro = await updateUser(userId, { sellerId, role });
  if (erro) throw new Error(erro);

  revalidatePath("/configuracoes/usuarios");
  revalidatePath("/vendedor");
}

export async function alternarAtivo(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const ativar = String(formData.get("ativar") ?? "") === "1";

  // Desativar a própria conta tiraria o último administrador da sala.
  if (userId === admin.userId && !ativar) {
    throw new Error("Você não pode desativar a própria conta.");
  }

  const erro = await updateUser(userId, { active: ativar });
  if (erro) throw new Error(erro);
  revalidatePath("/configuracoes/usuarios");
}

/** Define uma nova senha. Serve para o admin trocar a própria e a dos outros. */
export async function trocarSenha(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < SENHA_MIN) {
    throw new Error(`A senha precisa de pelo menos ${SENHA_MIN} caracteres.`);
  }
  const erro = await setPassword(userId, password);
  if (erro) throw new Error(erro);
  revalidatePath("/configuracoes/usuarios");
}

export async function removerUsuario(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (userId === admin.userId) throw new Error("Você não pode remover a própria conta.");

  const erro = await deleteUser(userId);
  if (erro) throw new Error(erro);
  revalidatePath("/configuracoes/usuarios");
}
