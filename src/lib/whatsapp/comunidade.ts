/**
 * As três leituras da comunidade.
 *
 * O número de membros sai do que o webhook registrou — não de um retrato da
 * Z-API, que depende de a API estar acessível e envelhece em silêncio entre uma
 * leitura e outra.
 *
 * Entrada e saída são fatos separados: quem entrou e saiu aparece duas vezes no
 * movimento. Na lista de pessoas aparece uma vez só, com o estado de agora.
 */
import { db } from "@/lib/supabase";

export interface Comunidade {
  groupId: string;
  etiqueta: string;
  nome: string | null;
  numero: number | null;
  praca: string | null;
  ativo: boolean;
  membros: number;
  jaPassaram: number;
  entradas: number;
  saidas: number;
  ultimoEvento: string | null;
}

export interface Movimento {
  dia: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface Pessoa {
  chave: string;
  telefone: string | null;
  lid: string | null;
  nome: string | null;
  status: "dentro" | "fora";
  comunidadesDentro: number;
  comunidadesJaPassou: number;
  entradas: number;
  saidas: number;
  primeiraEntrada: string | null;
  ultimaSaida: string | null;
  ultimaMovimentacao: string | null;
  /** Veio só da carga: nunca foi visto entrar, apenas estava lá. */
  soDaCarga: boolean;
}

export type Erro = "sem-tabela" | "falhou";
const SEM_TABELA = new Set(["42P01", "PGRST205"]);

function classificar(code?: string): Erro {
  return SEM_TABELA.has(code ?? "") ? "sem-tabela" : "falhou";
}

export async function listarComunidades(): Promise<Comunidade[] | Erro> {
  const sb = db();
  if (!sb) return "falhou";

  const { data, error } = await sb
    .from("v_whatsapp_comunidades")
    .select("*")
    .eq("ativo", true);

  if (error) {
    console.error("[comunidade]", error.message);
    return classificar(error.code);
  }

  return (data ?? [])
    .map((c) => ({
      groupId: c.group_id as string,
      etiqueta: c.etiqueta as string,
      nome: (c.name as string) ?? null,
      numero: (c.numero as number) ?? null,
      praca: (c.praca as string) ?? null,
      ativo: c.ativo !== false,
      membros: Number(c.membros ?? 0),
      jaPassaram: Number(c.ja_passaram ?? 0),
      entradas: Number(c.entradas ?? 0),
      saidas: Number(c.saidas ?? 0),
      ultimoEvento: (c.last_event_at as string) ?? null,
    }))
    .sort((a, b) => b.membros - a.membros);
}

/** Movimentação agregada de todas as comunidades, dia a dia. */
export async function movimentoPorDia(dias = 14): Promise<Movimento[]> {
  const sb = db();
  if (!sb) return [];

  const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("v_whatsapp_movimento")
    .select("dia, entradas, saidas")
    .gte("dia", desde)
    .order("dia");

  if (error) {
    console.error("[comunidade] movimento:", error.message);
    return [];
  }

  // A view devolve por grupo; aqui vira o total do dia.
  const porDia = new Map<string, { entradas: number; saidas: number }>();
  for (const r of data ?? []) {
    const dia = r.dia as string;
    const cur = porDia.get(dia) ?? { entradas: 0, saidas: 0 };
    cur.entradas += Number(r.entradas ?? 0);
    cur.saidas += Number(r.saidas ?? 0);
    porDia.set(dia, cur);
  }

  return [...porDia.entries()]
    .map(([dia, v]) => ({ ...v, dia, saldo: v.entradas - v.saidas }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

export interface FiltroPessoas {
  busca?: string;
  status?: "dentro" | "fora";
  pagina?: number;
  porPagina?: number;
}

export interface PaginaPessoas {
  pessoas: Pessoa[];
  total: number;
  pagina: number;
  paginas: number;
}

/**
 * A lista de quem já passou pelas comunidades.
 *
 * São 78 mil pessoas: vem paginada por necessidade, não por preferência —
 * trazer tudo derrubaria a tela e não caberia na memória do servidor.
 */
export async function listarPessoas(f: FiltroPessoas = {}): Promise<PaginaPessoas | Erro> {
  const sb = db();
  if (!sb) return "falhou";

  const porPagina = Math.min(Math.max(f.porPagina ?? 50, 10), 200);
  const pagina = Math.max(f.pagina ?? 1, 1);
  const de = (pagina - 1) * porPagina;

  let query = sb.from("v_whatsapp_pessoas").select("*", { count: "exact" });

  if (f.status) query = query.eq("status", f.status);

  const busca = f.busca?.trim();
  if (busca) {
    const digitos = busca.replace(/\D/g, "");
    // Quem digita número procura telefone; quem digita letra procura nome.
    query = digitos
      ? query.ilike("telefone", `%${digitos}%`)
      : query.ilike("nome", `%${busca}%`);
  }

  const { data, error, count } = await query
    // Quem se mexeu por último primeiro: é o que a operação quer ver.
    .order("ultima_movimentacao", { ascending: false, nullsFirst: false })
    .range(de, de + porPagina - 1);

  if (error) {
    console.error("[comunidade] pessoas:", error.message);
    return classificar(error.code);
  }

  const total = count ?? 0;
  return {
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / porPagina)),
    pessoas: (data ?? []).map((p) => ({
      chave: p.pessoa_key as string,
      telefone: (p.telefone as string) ?? null,
      lid: (p.lid as string) ?? null,
      nome: (p.nome as string) ?? null,
      status: p.status === "fora" ? "fora" : "dentro",
      comunidadesDentro: Number(p.comunidades_dentro ?? 0),
      comunidadesJaPassou: Number(p.comunidades_ja_passou ?? 0),
      entradas: Number(p.entradas ?? 0),
      saidas: Number(p.saidas ?? 0),
      primeiraEntrada: (p.primeira_entrada as string) ?? null,
      ultimaSaida: (p.ultima_saida as string) ?? null,
      ultimaMovimentacao: (p.ultima_movimentacao as string) ?? null,
      soDaCarga: p.so_da_carga === true,
    })),
  };
}

/** Os totais do topo da tela. */
export async function resumoPessoas(): Promise<{
  pessoas: number;
  dentro: number;
  fora: number;
  comTelefone: number;
} | null> {
  const sb = db();
  if (!sb) return null;

  const conta = async (filtro?: (q: ReturnType<typeof montar>) => typeof q) => {
    const base = montar();
    const { count } = await (filtro ? filtro(base) : base);
    return count ?? 0;
  };
  const montar = () => sb.from("v_whatsapp_pessoas").select("pessoa_key", { count: "exact", head: true });

  const [pessoas, dentro, fora, comTelefone] = await Promise.all([
    conta(),
    conta((q) => q.eq("status", "dentro")),
    conta((q) => q.eq("status", "fora")),
    conta((q) => q.not("telefone", "is", null)),
  ]);

  return { pessoas, dentro, fora, comTelefone };
}
