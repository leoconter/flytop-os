/**
 * Interesses registrados no CRM.
 *
 * Antes disto o registro só existia enquanto a aba ficava aberta — o lead
 * aparecia na lista e sumia no F5. Agora vai ao banco, o que é o que permite
 * responder qual destino é o mais pedido.
 */
import { db } from "@/lib/supabase";
import { normalizeCity } from "@/lib/crm-data";

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  destino: string;
  meses: string[];
  criadoEm: string;
}

export type Listagem = { leads: Lead[] } | { erro: "sem-tabela" | "falhou" };

const SEM_TABELA = new Set(["42P01", "PGRST205"]);

const CAMPOS = "id, nome, telefone, origem, destino, meses, created_at";

/** "hoje · 10:22", "ontem · 18:40" ou "28/06 · 14:03". */
function quando(iso: string): string {
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...opts }).format(
      new Date(iso),
    );

  const dia = fmt({ day: "2-digit", month: "2-digit" });
  const hora = fmt({ hour: "2-digit", minute: "2-digit" });

  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const agora = hoje.format(new Date());
  const desteDia = hoje.format(new Date(iso));

  if (desteDia === agora) return `hoje · ${hora}`;

  const ontem = hoje.format(new Date(Date.now() - 86_400_000));
  if (desteDia === ontem) return `ontem · ${hora}`;

  return `${dia} · ${hora}`;
}

function paraLead(r: Record<string, unknown>): Lead {
  return {
    id: r.id as string,
    nome: r.nome as string,
    telefone: r.telefone as string,
    origem: r.origem as string,
    destino: r.destino as string,
    meses: ((r.meses as string[]) ?? []).slice().sort(),
    criadoEm: quando(r.created_at as string),
  };
}

export async function listarLeads(limite = 200): Promise<Listagem> {
  const sb = db();
  if (!sb) return { erro: "falhou" };

  const { data, error } = await sb
    .from("crm_leads")
    .select(CAMPOS)
    .order("created_at", { ascending: false })
    .limit(limite);

  if (error) {
    console.error("[crm] leads:", error.message);
    return { erro: SEM_TABELA.has(error.code ?? "") ? "sem-tabela" : "falhou" };
  }

  return { leads: (data ?? []).map(paraLead) };
}

export interface NovoLead {
  nome: string;
  telefone: string;
  origem: string;
  destino: string;
  meses: string[];
}

export async function criarLead(l: NovoLead, userId: string | null): Promise<string | null> {
  const sb = db();
  if (!sb) return "Banco não configurado.";

  const { error } = await sb.from("crm_leads").insert({
    nome: l.nome,
    telefone: l.telefone,
    origem: l.origem,
    destino: l.destino,
    destino_key: normalizeCity(l.destino),
    meses: l.meses,
    created_by: userId,
  });

  if (error) return error.message;
  return null;
}

export async function excluirLead(id: string): Promise<string | null> {
  const sb = db();
  if (!sb) return "Banco não configurado.";
  const { error } = await sb.from("crm_leads").delete().eq("id", id);
  return error ? error.message : null;
}

export interface DestinoPedido {
  destino: string;
  pedidos: number;
}

/**
 * Ranking dos destinos mais pedidos.
 *
 * Agrupa pela forma normalizada ("orlando") mas devolve a grafia mais usada
 * ("Orlando"), porque é essa que a operação reconhece na tela.
 */
export async function destinosMaisPedidos(limite = 5): Promise<DestinoPedido[] | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb.from("crm_leads").select("destino, destino_key");
  if (error) {
    console.error("[crm] destinos:", error.message);
    return null;
  }

  const grupos = new Map<string, { total: number; grafias: Map<string, number> }>();
  for (const r of data ?? []) {
    const chave = (r.destino_key as string) ?? normalizeCity(r.destino as string);
    if (!chave) continue;
    const g = grupos.get(chave) ?? { total: 0, grafias: new Map<string, number>() };
    g.total += 1;
    const grafia = (r.destino as string).trim();
    g.grafias.set(grafia, (g.grafias.get(grafia) ?? 0) + 1);
    grupos.set(chave, g);
  }

  return [...grupos.values()]
    .map((g) => ({
      destino: [...g.grafias.entries()].sort((a, b) => b[1] - a[1])[0][0],
      pedidos: g.total,
    }))
    .sort((a, b) => b.pedidos - a.pedidos)
    .slice(0, limite);
}
