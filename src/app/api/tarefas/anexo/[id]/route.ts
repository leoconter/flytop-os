import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { urlDeLeitura } from "@/lib/tarefas/anexos";
import { db } from "@/lib/supabase";

/**
 * Baixar um anexo.
 *
 * O bucket é privado, então o arquivo não tem URL fixa. Aqui a sessão é
 * conferida e só então pedimos ao Supabase uma URL de leitura que expira em um
 * minuto — tempo de o navegador seguir o redirecionamento, e não mais que isso.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });

  const sb = db();
  if (!sb) return new Response(null, { status: 503 });

  const { id } = await ctx.params;
  const { data } = await sb
    .from("task_attachments")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!data) return new Response("Anexo não encontrado.", { status: 404 });

  const url = await urlDeLeitura(data.storage_path as string, 60);
  if (!url) return new Response("Não foi possível abrir o anexo.", { status: 500 });

  redirect(url);
}
