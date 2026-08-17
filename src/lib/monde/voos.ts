/**
 * Embarques e retornos das próximas e últimas 48 horas.
 *
 * Três perguntas da operação, uma fonte só (`v_voos_etapas`, o primeiro e o
 * último trecho de cada bilhete):
 *
 *   embarques   — quem parte nas próximas 48h
 *   retornos    — quem volta nas próximas 48h
 *   retornaram  — quem já desembarcou de volta nas últimas 48h
 *
 * A terceira é a única que olha para trás, e por isso usa a **chegada** e não a
 * partida: quem decolou de Lisboa há 3 horas ainda está no ar, e ligar para
 * essa pessoa como se já tivesse voltado é constrangedor.
 *
 * Quem conta como retorno é decidido na view (`retorno_para_casa`), e não pelo
 * formato do bilhete: GIG→MIA→PHL→TPA tem vários trechos mas termina em Tampa,
 * e essa pessoa não voltou.
 */
import { db } from "@/lib/supabase";

export type TipoVoo = "embarques" | "retornos" | "retornaram";

export const TIPOS: TipoVoo[] = ["embarques", "retornos", "retornaram"];

export interface Voo {
  id: string;
  cliente: string | null;
  telefone: string | null;
  trecho: string;
  companhia: string | null;
  localizador: string | null;
  vendedor: string | null;
  /** Momento que importa: partida nas listas futuras, chegada na de retorno. */
  quandoISO: string;
  /** Distância em horas — negativa no passado. */
  horas: number;
  /** "em 6h", "há 12h", "em 2 dias". */
  quando: string;
}

export type Contagens = Record<TipoVoo, number>;

const JANELA_MS = 48 * 3_600_000;

const CAMPOS =
  "segment_id, origin, destination, departure_at, arrival_at, locator, airline_name, vendedor, customer_name, customer_mobile";

interface Linha {
  segment_id: string;
  origin: string | null;
  destination: string | null;
  departure_at: string | null;
  arrival_at: string | null;
  locator: string | null;
  airline_name: string | null;
  vendedor: string | null;
  customer_name: string | null;
  customer_mobile: string | null;
}

/** "em 6h" / "há 12h" — o texto que a linha mostra. */
function texto(horas: number): string {
  const abs = Math.abs(horas);
  const futuro = horas >= 0;

  if (abs < 1) return futuro ? "em menos de 1h" : "há menos de 1h";
  if (abs < 24) {
    const h = Math.round(abs);
    return futuro ? `em ${h}h` : `há ${h}h`;
  }
  const d = Math.floor(abs / 24);
  const resto = Math.round(abs % 24);
  const dias = `${d} ${d === 1 ? "dia" : "dias"}`;
  const cauda = resto > 0 ? ` e ${resto}h` : "";
  return futuro ? `em ${dias}${cauda}` : `há ${dias}${cauda}`;
}

function paraVoo(r: Linha, momento: string | null, agora: number): Voo | null {
  if (!momento) return null;
  const horas = (new Date(momento).getTime() - agora) / 3_600_000;

  return {
    id: r.segment_id,
    cliente: r.customer_name,
    telefone: r.customer_mobile,
    trecho: [r.origin, r.destination].filter(Boolean).join("-") || "—",
    companhia: r.airline_name,
    localizador: r.locator,
    vendedor: r.vendedor,
    quandoISO: momento,
    horas,
    quando: texto(horas),
  };
}

/**
 * A consulta de cada lista.
 *
 * Fica num lugar só porque as três telas e a contagem das abas precisam
 * exatamente do mesmo recorte — se divergirem, a aba diz um número e a tabela
 * mostra outro.
 */
function consulta(sb: NonNullable<ReturnType<typeof db>>, tipo: TipoVoo, agora: number) {
  const inicio = new Date(agora).toISOString();
  const ate = new Date(agora + JANELA_MS).toISOString();
  const de = new Date(agora - JANELA_MS).toISOString();

  if (tipo === "embarques") {
    return sb
      .from("v_voos_etapas")
      .select(CAMPOS, { count: "exact" })
      .eq("etapa", "ida")
      .gte("departure_at", inicio)
      .lte("departure_at", ate)
      .order("departure_at");
  }

  if (tipo === "retornos") {
    return sb
      .from("v_voos_etapas")
      .select(CAMPOS, { count: "exact" })
      .eq("retorno_para_casa", true)
      .gte("departure_at", inicio)
      .lte("departure_at", ate)
      .order("departure_at");
  }

  return sb
    .from("v_voos_etapas")
    .select(CAMPOS, { count: "exact" })
    .eq("retorno_para_casa", true)
    .gte("arrival_at", de)
    .lte("arrival_at", inicio)
    // Quem chegou por último aparece primeiro: é quem acabou de voltar, e o
    // contato mais quente da lista.
    .order("arrival_at", { ascending: false });
}

export interface Listagem {
  voos: Voo[];
  contagens: Contagens;
}

/**
 * A lista pedida, mais a contagem das outras duas.
 *
 * As abas mostram quantos há em cada tela, então toda visita precisa dos três
 * números — mas só de uma lista inteira. As outras duas vêm com `head: true`,
 * que devolve a contagem sem trazer linha nenhuma.
 */
export async function listarVoos(
  tipo: TipoVoo,
  agora: number = Date.now(),
): Promise<Listagem | null> {
  const sb = db();
  if (!sb) return null;

  const outros = TIPOS.filter((t) => t !== tipo);

  const [principal, ...resto] = await Promise.all([
    consulta(sb, tipo, agora),
    ...outros.map((t) => consulta(sb, t, agora).limit(1)),
  ]);

  if (principal.error) {
    console.error("[monde/voos]", principal.error.message);
    return null;
  }

  const campo = tipo === "retornaram" ? "arrival_at" : "departure_at";
  const voos = ((principal.data ?? []) as Linha[])
    .map((r) => paraVoo(r, r[campo], agora))
    .filter((v): v is Voo => v !== null);

  const contagens = { embarques: 0, retornos: 0, retornaram: 0 } as Contagens;
  contagens[tipo] = principal.count ?? voos.length;
  outros.forEach((t, i) => {
    contagens[t] = resto[i]?.count ?? 0;
  });

  return { voos, contagens };
}
