"use server";

import { revalidatePath } from "next/cache";
import type { AcaoState } from "@/components/form-acao";
import { currentUser } from "@/lib/auth/session";
import { criarLead, excluirLead } from "@/lib/crm/store";

function revalidar() {
  revalidatePath("/crm");
  // O cartão "Destino mais pedido" da tela de Alertas lê daqui.
  revalidatePath("/alertas");
}

export async function registrarInteresse(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };

  const texto = (k: string) => String(formData.get(k) ?? "").trim();

  const nome = texto("nome");
  const telefone = texto("telefone");
  const origem = texto("origem");
  const destino = texto("destino");
  // Os meses chegam como uma lista de campos com o mesmo nome.
  const meses = formData
    .getAll("meses")
    .map((m) => String(m))
    .filter((m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m))
    .sort();

  if (!nome) return { erro: "Informe o nome do lead." };
  if (!telefone) return { erro: "Informe o telefone." };
  if (!origem) return { erro: "Informe a origem." };
  if (!destino) return { erro: "Informe o destino de interesse." };
  if (!meses.length) return { erro: "Escolha ao menos um mês de interesse." };

  const erro = await criarLead({ nome, telefone, origem, destino, meses }, user.userId);
  if (erro) return { erro };

  revalidar();
  return { ok: `Interesse de ${nome} registrado.` };
}

export async function removerInteresse(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada." };

  const erro = await excluirLead(String(formData.get("id") ?? ""));
  if (erro) return { erro };

  revalidar();
  return { ok: "Interesse removido." };
}
