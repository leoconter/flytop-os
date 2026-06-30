import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase opcional.
 *
 * Lê as credenciais de NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Se elas não estiverem definidas (ex.: build sem .env.local), `supabase` é
 * `null` em vez de lançar erro — assim o projeto compila e roda sem credenciais.
 * Nenhuma migration/tabela é assumida aqui; isto é só o conector.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = Boolean(url && anonKey);
