/**
 * Sessão da plataforma.
 *
 * Quem guarda e verifica senha é o Supabase Auth — nós nunca vemos, nem
 * armazenamos, credencial. O que fica aqui é o transporte da sessão.
 *
 * O token nunca chega ao JavaScript do navegador: vive em cookies `httpOnly`,
 * lidos só no servidor. Isso custa uma chamada de validação por requisição
 * (`GET /auth/v1/user`), e é o preço de não ter token exposto a XSS. Como o
 * JWT é assinado pelo Supabase (ECDSA), um cookie adulterado é recusado lá —
 * não dá para forjar sessão mexendo no cookie.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/supabase";

const COOKIE_ACCESS = "ft_at";
const COOKIE_REFRESH = "ft_rt";

export type Role = "admin" | "vendedor";

export interface SessionUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  /** Vendedor correspondente no Monde. Null = conta ainda não vinculada. */
  sellerId: string | null;
  sellerName: string | null;
  teamName: string | null;
}

function authUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1${path}`;
}

function serviceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function authConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Troca email+senha por uma sessão. Devolve a mensagem de erro, ou null. */
export async function signIn(email: string, password: string): Promise<string | null> {
  if (!authConfigured()) return "Autenticação não configurada.";

  const res = await fetch(authUrl("/token?grant_type=password"), {
    method: "POST",
    headers: { apikey: serviceKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    cache: "no-store",
  });

  if (!res.ok) {
    // Mensagem única de propósito: dizer "email não existe" entrega quem tem
    // conta a quem estiver tentando adivinhar.
    return "E-mail ou senha incorretos.";
  }

  const session = await res.json();
  await gravarSessao(session.access_token, session.refresh_token, session.expires_in);
  return null;
}

async function gravarSessao(access: string, refresh: string, expiresIn?: number) {
  const jar = await cookies();
  jar.set(COOKIE_ACCESS, access, { ...cookieOptions, maxAge: expiresIn ?? 3600 });
  jar.set(COOKIE_REFRESH, refresh, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const access = jar.get(COOKIE_ACCESS)?.value;
  jar.delete(COOKIE_ACCESS);
  jar.delete(COOKIE_REFRESH);

  // Revoga do lado do Supabase: apagar o cookie sozinho deixaria o token
  // válido até expirar.
  if (access) {
    await fetch(authUrl("/logout"), {
      method: "POST",
      headers: { apikey: serviceKey(), Authorization: `Bearer ${access}` },
      cache: "no-store",
    }).catch(() => {});
  }
}

/** Identidade do dono do token, validada pelo Supabase. */
async function validar(access: string): Promise<{ id: string; email: string } | null> {
  const res = await fetch(authUrl("/user"), {
    headers: { apikey: serviceKey(), Authorization: `Bearer ${access}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const u = await res.json();
  return u?.id ? { id: u.id, email: u.email ?? "" } : null;
}

/**
 * Quem é o dono do cookie, segundo o Supabase — antes de olhar o perfil.
 *
 * `cache()` do React garante uma validação por requisição, por mais telas e
 * componentes que perguntem quem está logado.
 */
export const authIdentity = cache(async (): Promise<{ id: string; email: string } | null> => {
  if (!authConfigured()) return null;

  const jar = await cookies();
  const access = jar.get(COOKIE_ACCESS)?.value;
  const auth = access ? await validar(access) : null;
  if (auth) return auth;

  // Access token expira em 1h; o refresh mantém a pessoa dentro por 30 dias.
  const refresh = jar.get(COOKIE_REFRESH)?.value;
  if (!refresh) return null;

  const res = await fetch(authUrl("/token?grant_type=refresh_token"), {
    method: "POST",
    headers: { apikey: serviceKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const s = await res.json();
  const renovado = await validar(s.access_token);
  if (!renovado) return null;

  try {
    await gravarSessao(s.access_token, s.refresh_token, s.expires_in);
  } catch {
    // Server Component não pode gravar cookie; a sessão vale para esta
    // requisição e a próxima navegação renova.
  }
  return renovado;
});

/** Por que uma credencial válida mesmo assim não entra. */
export type Bloqueio = "sem-perfil" | "desativado";

/**
 * Diagnóstico para a tela de login. Sem isto, quem foi desativado lê que "a
 * conta não tem perfil" e conclui que foi apagada.
 */
export const statusConta = cache(async (): Promise<Bloqueio | null> => {
  const auth = await authIdentity();
  if (!auth) return null;

  const sb = db();
  if (!sb) return null;

  const { data } = await sb
    .from("v_app_users")
    .select("active")
    .eq("user_id", auth.id)
    .maybeSingle();

  if (!data) return "sem-perfil";
  return data.active === false ? "desativado" : null;
});

/** Usuário da requisição: identidade validada + perfil da aplicação. */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const auth = await authIdentity();
  if (!auth) return null;
  return await perfil(auth.id, auth.email);
});

/** Junta a identidade do Auth com o perfil da aplicação. */
async function perfil(userId: string, email: string): Promise<SessionUser | null> {
  const sb = db();
  if (!sb) return null;

  const { data } = await sb
    .from("v_app_users")
    .select("user_id, first_name, last_name, full_name, email, role, active, seller_id, seller_name, team_name")
    .eq("user_id", userId)
    .maybeSingle();

  // Sem perfil, ou desativado, a conta não entra — mesmo com token válido.
  if (!data || data.active === false) return null;

  return {
    userId,
    email: (data.email as string) ?? email,
    firstName: data.first_name as string,
    lastName: data.last_name as string,
    fullName: data.full_name as string,
    role: (data.role as Role) ?? "vendedor",
    sellerId: (data.seller_id as string) ?? null,
    sellerName: (data.seller_name as string) ?? null,
    teamName: (data.team_name as string) ?? null,
  };
}

/** Para Server Actions administrativas. Lança se quem chamou não for admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u || u.role !== "admin") throw new Error("Acesso restrito a administradores");
  return u;
}

/**
 * Guarda de tela administrativa.
 *
 * Vale para todo o grupo "Administração" do menu. Esconder o item não protege
 * nada — a URL continua digitável —, então cada uma dessas rotas precisa da
 * checagem no servidor.
 */
export async function guardAdmin(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.role !== "admin") redirect("/");
  return u;
}
