/**
 * Leitura dos grupos para a tela de Comunidades.
 */
import { db } from "@/lib/supabase";
import { inferir } from "./rotulo";

export interface GrupoLinha {
  groupId: string;
  name: string | null;
  etiqueta: string;
  numero: number | null;
  praca: string | null;
  apelido: string | null;
  ativo: boolean;
  confirmado: boolean;
  confirmadoEm: string | null;
  membros: number;
  eventos: number;
  sincronizadoEm: string | null;
  /** O que a leitura do nome sugere, para a tela oferecer sem gravar sozinha. */
  sugestao: { numero: number | null; praca: string | null };
}

export type Listagem = { grupos: GrupoLinha[] } | { erro: "sem-tabela" | "falhou" };

const SEM_TABELA = new Set(["42P01", "PGRST205"]);

export async function listarGrupos(): Promise<Listagem> {
  const sb = db();
  if (!sb) return { erro: "falhou" };

  const { data, error } = await sb
    .from("v_whatsapp_groups")
    .select(
      "group_id, name, etiqueta, numero, praca, apelido, ativo, confirmado_em, members_count, membros, eventos, members_synced_at",
    );

  if (error) {
    console.error("[whatsapp] grupos:", error.message);
    return { erro: SEM_TABELA.has(error.code ?? "") ? "sem-tabela" : "falhou" };
  }

  const grupos = (data ?? []).map((g): GrupoLinha => {
    const name = (g.name as string) ?? null;
    return {
      groupId: g.group_id as string,
      name,
      etiqueta: (g.etiqueta as string) ?? (g.group_id as string),
      numero: (g.numero as number) ?? null,
      praca: (g.praca as string) ?? null,
      apelido: (g.apelido as string) ?? null,
      ativo: g.ativo !== false,
      confirmado: Boolean(g.confirmado_em),
      confirmadoEm: (g.confirmado_em as string) ?? null,
      // `members_count` vem da Z-API e é o número de referência; `membros` conta
      // as linhas que temos. Divergem quando uma carga não terminou.
      membros: Number(g.members_count ?? g.membros ?? 0),
      eventos: Number(g.eventos ?? 0),
      sincronizadoEm: (g.members_synced_at as string) ?? null,
      sugestao: inferir(name),
    };
  });

  // Numeradas primeiro, em ordem; as sem número no fim, que é onde precisam de
  // atenção.
  grupos.sort((a, b) => {
    if ((a.numero == null) !== (b.numero == null)) return a.numero == null ? 1 : -1;
    if (a.praca !== b.praca) return (a.praca ?? "").localeCompare(b.praca ?? "");
    return (a.numero ?? 0) - (b.numero ?? 0);
  });

  return { grupos };
}

/**
 * Números usados por mais de um grupo.
 *
 * Existe porque acontece: dois grupos chamados "#23" na leitura do nome. A tela
 * marca os dois em vez de escolher um — a operação sabe qual é qual, o sistema
 * não.
 */
export function repetidos(grupos: GrupoLinha[]): Set<string> {
  const contagem = new Map<string, number>();
  for (const g of grupos) {
    if (g.numero == null) continue;
    const chave = `${g.praca ?? ""}#${g.numero}`;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return new Set([...contagem].filter(([, n]) => n > 1).map(([k]) => k));
}
