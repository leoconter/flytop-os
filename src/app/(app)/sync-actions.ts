"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";

export interface SyncState {
  ok?: string;
  erro?: string;
}

/**
 * Dispara a sincronização do Monde sob demanda.
 *
 * Chama a mesma Edge Function que o agendamento do banco usa às 00:01 — não há
 * uma segunda implementação para o botão. `daily` relê os últimos 15 dias e as
 * canceladas; `full` relê o histórico inteiro, o que leva cerca de um minuto.
 *
 * Só administrador chega aqui: `requireAdmin()` recusa o resto.
 */
export async function rodarSync(
  _prev: SyncState,
  formData: FormData,
): Promise<SyncState> {
  await requireAdmin();

  const modo = String(formData.get("modo") ?? "daily") === "full" ? "full" : "daily";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { erro: "Banco não configurado." };

  try {
    const res = await fetch(`${url}/functions/v1/monde-sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mode: modo }),
      cache: "no-store",
    });

    const corpo = await res.json().catch(() => null);
    if (!res.ok) {
      return { erro: String(corpo?.error ?? `A atualização falhou (HTTP ${res.status}).`) };
    }

    // Todas as telas leem do banco: precisam refletir o que acabou de entrar.
    revalidatePath("/", "layout");

    const novas = Number(corpo?.inserted ?? 0);
    const vistas = Number(corpo?.seen ?? 0);
    return {
      ok:
        novas > 0
          ? `${novas} ${novas === 1 ? "venda nova" : "vendas novas"} de ${vistas} lidas.`
          : `Nada novo — ${vistas} vendas conferidas.`,
    };
  } catch (err) {
    return { erro: err instanceof Error ? err.message : "A atualização falhou." };
  }
}
