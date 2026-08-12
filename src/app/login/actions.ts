"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth/session";

export interface LoginState {
  erro?: string;
}

export async function entrar(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const destino = String(formData.get("de") ?? "") || "/";

  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const erro = await signIn(email, senha);
  if (erro) return { erro };

  // Só caminho interno: `?de=` vem da URL e não pode virar redirecionamento
  // para fora do site.
  redirect(destino.startsWith("/") && !destino.startsWith("//") ? destino : "/");
}

export async function sair(): Promise<void> {
  await signOut();
  redirect("/login");
}
