"use server";

import { redirect } from "next/navigation";
import type { AcaoState } from "@/components/form-acao";
import { cancelarCadastro, sairDoMeioDoFluxo, verificarCodigo } from "@/lib/auth/mfa";

/** Confere o código do autenticador e libera a entrada. */
export async function confirmar(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const fatorId = String(formData.get("fatorId") ?? "");
  const codigo = String(formData.get("codigo") ?? "");
  if (!fatorId) return { erro: "Sessão expirada. Entre de novo." };

  const erro = await verificarCodigo(fatorId, codigo);
  if (erro) return { erro };

  // A sessão já subiu para aal2; daqui a guarda do app deixa passar.
  redirect(String(formData.get("de") || "/"));
}

/**
 * Desiste e volta ao login.
 *
 * Derruba a sessão pela metade — deixá-la de pé faria a próxima visita cair
 * de novo na tela de código, sem forma óbvia de sair. Se havia um cadastro em
 * andamento, o fator não confirmado some junto.
 */
export async function cancelar(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const fatorId = String(formData.get("fatorId") ?? "");
  if (fatorId) await cancelarCadastro(fatorId);
  await sairDoMeioDoFluxo();
  redirect("/login");
}
