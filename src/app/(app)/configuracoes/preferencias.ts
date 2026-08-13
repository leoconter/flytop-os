"use server";

import { revalidatePath } from "next/cache";
import type { AcaoState } from "@/components/form-acao";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/supabase";

/**
 * Preferências da própria conta.
 *
 * Grava sempre para quem está logado, nunca para um id vindo do formulário —
 * senão bastaria trocar um campo escondido para mexer na conta alheia.
 */
export async function salvarPreferencias(
  _prev: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const user = await currentUser();
  if (!user) return { erro: "Sessão expirada. Entre de novo." };

  const sb = db();
  if (!sb) return { erro: "O banco não está configurado." };

  // Checkbox desmarcado não é enviado pelo navegador: ausência = desligado.
  const alertFlyby = formData.get("alertFlyby") !== null;

  const { error } = await sb
    .from("app_users")
    .update({ alert_flyby: alertFlyby })
    .eq("user_id", user.userId);

  if (error) {
    console.error("[preferencias]", error.message);
    return { erro: "Não foi possível salvar a preferência." };
  }

  // O aviso vive no layout, então a plataforma inteira precisa reler o perfil.
  revalidatePath("/", "layout");
  return { ok: alertFlyby ? "Aviso de alerta ligado." : "Aviso de alerta desligado." };
}
