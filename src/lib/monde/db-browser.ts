/**
 * Navegador de leitura do banco.
 *
 * O PostgREST descreve o próprio schema em `GET /rest/v1/` (OpenAPI): nomes,
 * colunas e tipos de tudo que está exposto. É daí que sai a lista — não há
 * SQL solto nem nome de tabela vindo da URL sem conferência. Só GET.
 */
import { cache } from "react";

export interface Coluna {
  nome: string;
  tipo: string;
  /** Descrição vinda do COMMENT ON COLUMN, quando existe. */
  nota: string | null;
}

export interface Tabela {
  nome: string;
  /** Views seguem o prefixo `v_` neste banco. */
  view: boolean;
  colunas: Coluna[];
  nota: string | null;
}

/** Guarda dados que não deveriam aparecer numa tela de navegação casual. */
export const SENSIVEIS = new Set(["monde_sales_raw"]);

function base(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

/** O schema muda só quando roda migração: uma leitura por requisição basta. */
export const listarTabelas = cache(async (): Promise<Tabela[] | null> => {
  const b = base();
  if (!b) return null;

  const res = await fetch(`${b.url}/rest/v1/`, {
    headers: { apikey: b.key, Authorization: `Bearer ${b.key}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const spec = await res.json();
  const defs: Record<string, { properties?: Record<string, { type?: string; format?: string; description?: string }>; description?: string }> =
    spec.definitions ?? spec.components?.schemas ?? {};

  return Object.entries(defs)
    .map(([nome, d]) => ({
      nome,
      view: nome.startsWith("v_"),
      nota: d.description?.split("\n")[0] ?? null,
      colunas: Object.entries(d.properties ?? {}).map(([c, p]) => ({
        nome: c,
        tipo: p.format ?? p.type ?? "?",
        nota: p.description?.split("\n")[0] ?? null,
      })),
    }))
    .sort((a, b2) => Number(a.view) - Number(b2.view) || a.nome.localeCompare(b2.nome));
});

export interface Pagina {
  linhas: Record<string, unknown>[];
  total: number | null;
  colunas: string[];
}

/**
 * Lê uma fatia de uma tabela.
 *
 * `tabela` e `ordem` são conferidos contra o que o schema declara antes de
 * entrar na URL — o nome nunca vai cru para o banco.
 */
export async function lerTabela(
  tabela: string,
  { pagina = 0, porPagina = 50, ordem, desc = true }: {
    pagina?: number;
    porPagina?: number;
    ordem?: string;
    desc?: boolean;
  } = {},
): Promise<Pagina | null> {
  const b = base();
  if (!b) return null;

  const tabelas = await listarTabelas();
  const alvo = tabelas?.find((t) => t.nome === tabela);
  if (!alvo) return null;

  const colValida = ordem && alvo.colunas.some((c) => c.nome === ordem) ? ordem : null;
  const de = pagina * porPagina;

  const url = new URL(`${b.url}/rest/v1/${alvo.nome}`);
  url.searchParams.set("select", "*");
  if (colValida) url.searchParams.set("order", `${colValida}.${desc ? "desc" : "asc"}`);

  const res = await fetch(url, {
    headers: {
      apikey: b.key,
      Authorization: `Bearer ${b.key}`,
      Range: `${de}-${de + porPagina - 1}`,
      Prefer: "count=exact",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const linhas = (await res.json()) as Record<string, unknown>[];
  // "0-49/2358" — o total vem depois da barra.
  const cr = res.headers.get("content-range");
  const total = cr?.includes("/") ? Number(cr.split("/")[1]) : null;

  return {
    linhas,
    total: Number.isFinite(total) ? total : null,
    colunas: alvo.colunas.map((c) => c.nome),
  };
}

/** Quantas linhas cada tabela tem. Uma requisição por tabela, em paralelo. */
export async function contarTudo(tabelas: Tabela[]): Promise<Map<string, number | null>> {
  const b = base();
  const out = new Map<string, number | null>();
  if (!b) return out;

  await Promise.all(
    tabelas.map(async (t) => {
      try {
        const res = await fetch(`${b.url}/rest/v1/${t.nome}?select=*`, {
          method: "HEAD",
          headers: {
            apikey: b.key,
            Authorization: `Bearer ${b.key}`,
            Range: "0-0",
            Prefer: "count=exact",
          },
          cache: "no-store",
        });
        const cr = res.headers.get("content-range");
        const n = cr?.includes("/") ? Number(cr.split("/")[1]) : null;
        out.set(t.nome, Number.isFinite(n) ? n : null);
      } catch {
        out.set(t.nome, null);
      }
    }),
  );

  return out;
}
