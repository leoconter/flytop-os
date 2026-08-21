/**
 * Segundo fator (TOTP) no login.
 *
 * O Supabase guarda o segredo e valida o código; nós orquestramos as três
 * chamadas e o transporte da sessão. O fluxo tem dois momentos:
 *
 *   cadastro   enroll → challenge → verify   (uma vez, por pessoa)
 *   login      challenge → verify            (a cada entrada)
 *
 * O que muda de verdade é o **nível da sessão**: senha sozinha dá `aal1`, e o
 * código correto devolve um token novo em `aal2`. É esse nível que a guarda do
 * app olha — não uma marca nossa no banco, que poderia divergir do que o
 * Supabase realmente reconhece.
 */
import { cookies } from "next/headers";
import { accessToken, authUrl, gravarSessao, serviceKey } from "./session";

export type Aal = "aal1" | "aal2";

export interface StatusMfa {
  /** Nível da sessão atual. */
  aal: Aal;
  /** Já tem um autenticador cadastrado e confirmado. */
  temFator: boolean;
  fatorId: string | null;
}

export interface Fator {
  id: string;
  nome: string;
  status: "verified" | "unverified";
  criadoEm: string;
}

function authHeaders(token: string) {
  return {
    apikey: serviceKey(),
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * O `aal` do token, lido do próprio JWT.
 *
 * Ler o claim sem conferir a assinatura seria suficiente para enganar a guarda
 * com um cookie forjado — por isso quem chama aqui já passou por
 * `authIdentity()`, que valida o token no Supabase. Este payload é do mesmo
 * token que acabou de ser aceito.
 */
function aalDoToken(token: string): Aal {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    return payload?.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return "aal1";
  }
}

/** Onde a pessoa está no fluxo: sem fator, com fator pendente de código, ou pronta. */
export async function statusMfa(): Promise<StatusMfa | null> {
  const token = await accessToken();
  if (!token) return null;

  const res = await fetch(authUrl("/user"), {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const u = await res.json();
  const fatores = (u.factors ?? []) as { id: string; status: string; factor_type: string }[];
  const verificado = fatores.find((f) => f.status === "verified" && f.factor_type === "totp");

  return {
    aal: aalDoToken(token),
    temFator: Boolean(verificado),
    fatorId: verificado?.id ?? null,
  };
}

export interface Cadastro {
  fatorId: string;
  /** SVG do QR já embutido como data URI — pronto para o `src` de uma imagem. */
  qr: string;
  /** O mesmo segredo do QR, para quem digita à mão. */
  segredo: string;
}

/**
 * Começa o cadastro de um autenticador.
 *
 * Antes de criar, apaga os fatores que ficaram pela metade: cada visita à tela
 * gera um novo, e quem abriu e desistiu três vezes acumularia três fatores
 * fantasma até bater no limite da conta.
 */
export async function iniciarCadastro(nome = "Autenticador"): Promise<Cadastro | string> {
  const token = await accessToken();
  if (!token) return "Sessão expirada.";

  const atual = await fetch(authUrl("/user"), { headers: authHeaders(token), cache: "no-store" });
  if (atual.ok) {
    const u = await atual.json();
    for (const f of (u.factors ?? []) as { id: string; status: string }[]) {
      if (f.status !== "verified") {
        await fetch(authUrl(`/factors/${f.id}`), {
          method: "DELETE",
          headers: authHeaders(token),
        }).catch(() => {});
      }
    }
  }

  const res = await fetch(authUrl("/factors"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ factor_type: "totp", friendly_name: nome }),
    cache: "no-store",
  });

  const corpo = await res.json().catch(() => null);
  if (!res.ok) {
    if (corpo?.error_code === "mfa_totp_enroll_not_enabled") {
      return "O TOTP está desativado no projeto do Supabase.";
    }
    return corpo?.msg ?? "Não foi possível iniciar o cadastro.";
  }

  const svg: string = corpo?.totp?.qr_code ?? "";
  return {
    fatorId: corpo.id as string,
    // Data URI em vez de injetar o SVG na página: o desenho vem de fora e não
    // precisa de acesso ao DOM para cumprir seu papel.
    qr: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
    segredo: (corpo?.totp?.secret as string) ?? "",
  };
}

/**
 * Confere um código e eleva a sessão para `aal2`.
 *
 * Serve tanto para confirmar o cadastro quanto para o login do dia a dia — a
 * diferença é só qual fator está sendo desafiado, e isso o Supabase resolve
 * pelo id.
 */
export async function verificarCodigo(fatorId: string, codigo: string): Promise<string | null> {
  const token = await accessToken();
  if (!token) return "Sessão expirada.";

  const limpo = codigo.replace(/\D/g, "");
  if (limpo.length !== 6) return "O código tem 6 dígitos.";

  const ch = await fetch(authUrl(`/factors/${fatorId}/challenge`), {
    method: "POST",
    headers: authHeaders(token),
    body: "{}",
    cache: "no-store",
  });
  const desafio = await ch.json().catch(() => null);
  if (!ch.ok || !desafio?.id) return desafio?.msg ?? "Não foi possível pedir o código.";

  const vr = await fetch(authUrl(`/factors/${fatorId}/verify`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ challenge_id: desafio.id, code: limpo }),
    cache: "no-store",
  });
  const sessao = await vr.json().catch(() => null);

  if (!vr.ok) {
    if (sessao?.error_code === "mfa_verification_failed") {
      return "Código incorreto. Confira o app e tente de novo.";
    }
    return sessao?.msg ?? "Não foi possível confirmar o código.";
  }

  // O verify devolve uma sessão nova, já em aal2. Sem gravá-la, a pessoa
  // continuaria com o token antigo e a guarda a mandaria de volta para cá.
  await gravarSessao(sessao.access_token, sessao.refresh_token, sessao.expires_in);
  return null;
}

/** Desiste do cadastro em andamento, sem deixar fator pela metade. */
export async function cancelarCadastro(fatorId: string): Promise<void> {
  const token = await accessToken();
  if (!token) return;
  await fetch(authUrl(`/factors/${fatorId}`), {
    method: "DELETE",
    headers: authHeaders(token),
  }).catch(() => {});
}

/* ------------------------- administração de contas ------------------------ */

function adminHeaders() {
  return {
    apikey: serviceKey(),
    Authorization: `Bearer ${serviceKey()}`,
    "Content-Type": "application/json",
  };
}

/** Os autenticadores de uma conta — para a tela de Usuários. */
export async function fatoresDe(userId: string): Promise<Fator[]> {
  const res = await fetch(authUrl(`/admin/users/${userId}`), {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const u = await res.json();
  return ((u.factors ?? []) as Record<string, string>[]).map((f) => ({
    id: f.id,
    nome: f.friendly_name || "Autenticador",
    status: f.status === "verified" ? "verified" : "unverified",
    criadoEm: f.created_at,
  }));
}

/**
 * Tira o 2FA de uma conta.
 *
 * É o caminho de volta de quem perdeu o celular: sem isso, a pessoa ficaria
 * trancada para sempre. Some com todos os fatores, inclusive os pela metade —
 * deixar um para trás faria o login continuar pedindo código.
 */
export async function removerFatores(userId: string): Promise<string | null> {
  const fatores = await fatoresDe(userId);
  if (!fatores.length) return null;

  for (const f of fatores) {
    const res = await fetch(authUrl(`/admin/users/${userId}/factors/${f.id}`), {
      method: "DELETE",
      headers: adminHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const e = await res.json().catch(() => null);
      return e?.msg ?? "Não foi possível remover o autenticador.";
    }
  }
  return null;
}

/** Quantas contas ainda não configuraram — para o aviso na tela de Usuários. */
export async function contasSemMfa(userIds: string[]): Promise<Set<string>> {
  const sem = new Set<string>();
  for (const id of userIds) {
    const fatores = await fatoresDe(id);
    if (!fatores.some((f) => f.status === "verified")) sem.add(id);
  }
  return sem;
}

/** Esquece a sessão pela metade quando a pessoa desiste no meio do 2FA. */
export async function sairDoMeioDoFluxo(): Promise<void> {
  const jar = await cookies();
  jar.delete("ft_at");
  jar.delete("ft_rt");
}
