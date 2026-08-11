/**
 * Cliente Supabase para uso **no servidor**.
 *
 * Usa a service_role, que ignora a RLS — por isso nunca pode ser importado
 * por um client component. Todas as telas que leem o banco são Server
 * Components, então a chave não chega ao navegador.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** null quando as credenciais faltam — as telas caem nos dados ilustrativos. */
export function db(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return client;
}
