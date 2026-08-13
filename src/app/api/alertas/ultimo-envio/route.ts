import { ultimoEnvio } from "@/lib/alertas/store";
import { currentUser } from "@/lib/auth/session";

/**
 * Qual foi o último alerta que saiu para os grupos.
 *
 * As telas abertas perguntam isso de tempos em tempos; quando o id muda, elas
 * passam o aviãozinho. Escolhi perguntar em vez de manter uma conexão aberta:
 * alerta sai poucas vezes por dia, e assim nenhuma chave do Supabase precisa
 * chegar ao navegador — que é a regra do resto da plataforma.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });

  return Response.json(
    { envio: await ultimoEnvio() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
