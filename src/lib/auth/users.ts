/**
 * Usuários da plataforma.
 *
 * A credencial vive no Supabase Auth e é criada pela Admin API — a senha passa
 * uma vez pelo servidor e nunca é gravada em tabela nossa. `app_users` guarda
 * só o perfil: nome, papel e o vendedor do Monde correspondente.
 */
import { db } from "@/lib/supabase";
import type { Role } from "./session";

export interface AppUser {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  sellerId: string | null;
  sellerName: string | null;
  teamName: string | null;
}

export interface SellerOption {
  sellerId: string;
  name: string;
  active: boolean | null;
  /** Nome de quem já usa este vendedor, se alguém usa. */
  takenBy: string | null;
}

function adminUrl(path = ""): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users${path}`;
}

function adminHeaders(): HeadersInit {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function listUsers(): Promise<AppUser[] | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("v_app_users")
    .select("user_id, first_name, last_name, full_name, email, role, active, seller_id, seller_name, team_name")
    .order("first_name");

  if (error) {
    console.error("[auth/users]", error.message);
    return null;
  }

  return (data ?? []).map((u) => ({
    userId: u.user_id as string,
    firstName: u.first_name as string,
    lastName: u.last_name as string,
    fullName: u.full_name as string,
    email: u.email as string,
    role: (u.role as Role) ?? "vendedor",
    active: u.active !== false,
    sellerId: (u.seller_id as string) ?? null,
    sellerName: (u.seller_name as string) ?? null,
    teamName: (u.team_name as string) ?? null,
  }));
}

/** Vendedores do Monde disponíveis para vínculo, marcando os já usados. */
export async function listSellerOptions(): Promise<SellerOption[] | null> {
  const sb = db();
  if (!sb) return null;

  const [sellersRes, usersRes] = await Promise.all([
    sb.from("monde_sellers").select("seller_id, name, active").order("name"),
    sb.from("v_app_users").select("seller_id, full_name").not("seller_id", "is", null),
  ]);

  if (sellersRes.error) return null;

  const usado = new Map<string, string>();
  for (const u of usersRes.data ?? []) usado.set(u.seller_id as string, u.full_name as string);

  return (sellersRes.data ?? []).map((s) => ({
    sellerId: s.seller_id as string,
    name: s.name as string,
    active: s.active as boolean | null,
    takenBy: usado.get(s.seller_id as string) ?? null,
  }));
}

export interface NovoUsuario {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  sellerId: string | null;
}

/**
 * Cria a credencial e o perfil.
 *
 * São dois sistemas; se o perfil falhar, a credencial órfã é desfeita — senão
 * sobraria uma conta que entra e não existe para a aplicação.
 */
export async function createUser(u: NovoUsuario): Promise<string | null> {
  const sb = db();
  if (!sb) return "Banco não configurado";

  const res = await fetch(adminUrl(), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { first_name: u.firstName, last_name: u.lastName },
    }),
    cache: "no-store",
  });

  const criado = await res.json().catch(() => null);
  if (!res.ok || !criado?.id) {
    const msg = String(criado?.msg ?? criado?.error_description ?? criado?.message ?? "");
    if (/already|registered|exists/i.test(msg)) return "Já existe uma conta com esse e-mail.";
    if (/password/i.test(msg)) return "Senha recusada pelo Supabase: use ao menos 8 caracteres.";
    return msg || "Não foi possível criar a conta.";
  }

  const { error } = await sb.from("app_users").insert({
    user_id: criado.id,
    first_name: u.firstName,
    last_name: u.lastName,
    email: u.email,
    role: u.role,
    seller_id: u.sellerId,
  });

  if (error) {
    await fetch(adminUrl(`/${criado.id}`), { method: "DELETE", headers: adminHeaders() }).catch(() => {});
    if (error.code === "23505") return "Esse vendedor já está vinculado a outra conta.";
    return error.message;
  }

  return null;
}

export async function updateUser(
  userId: string,
  campos: { role?: Role; sellerId?: string | null; active?: boolean },
): Promise<string | null> {
  const sb = db();
  if (!sb) return "Banco não configurado";

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (campos.role !== undefined) patch.role = campos.role;
  if (campos.sellerId !== undefined) patch.seller_id = campos.sellerId;
  if (campos.active !== undefined) patch.active = campos.active;

  const { error } = await sb.from("app_users").update(patch).eq("user_id", userId);
  if (error) {
    if (error.code === "23505") return "Esse vendedor já está vinculado a outra conta.";
    return error.message;
  }
  return null;
}

/** Troca a senha de alguém. Só admin chama isto. */
export async function setPassword(userId: string, password: string): Promise<string | null> {
  const res = await fetch(adminUrl(`/${userId}`), {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  if (!res.ok) {
    const b = await res.json().catch(() => null);
    return String(b?.msg ?? "Não foi possível trocar a senha.");
  }
  return null;
}

/** Remove credencial e perfil. O perfil sai junto pelo `on delete cascade`. */
export async function deleteUser(userId: string): Promise<string | null> {
  const res = await fetch(adminUrl(`/${userId}`), { method: "DELETE", headers: adminHeaders() });
  if (!res.ok) return "Não foi possível remover a conta.";
  return null;
}
