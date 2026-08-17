/**
 * Embarques e retornos das próximas e últimas 48 horas.
 *
 * Três perguntas da operação, uma fonte só (`v_voos_etapas`, o primeiro e o
 * último trecho de cada bilhete):
 *
 *   parte    — quem embarca nas próximas 48h
 *   volta    — quem retorna nas próximas 48h
 *   voltou   — quem já desembarcou de volta nas últimas 48h
 *
 * O terceiro é o único que olha para trás, e por isso usa a **chegada** e não a
 * partida: quem decolou de Lisboa há 3 horas ainda está no ar, e ligar para
 * essa pessoa como se já tivesse voltado é constrangedor.
 *
 * Quem conta como retorno é decidido na view (`retorno_para_casa`), e não pelo
 * formato do bilhete: GIG→MIA→PHL→TPA tem vários trechos mas termina em Tampa,
 * e essa pessoa não voltou.
 */
import { db } from "@/lib/supabase";

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

export interface Voos48h {
  embarques: Voo[];
  retornos: Voo[];
  retornaram: Voo[];
}

const JANELA_MS = 48 * 3_600_000;

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

export async function getVoos48h(agora: number = Date.now()): Promise<Voos48h | null> {
  const sb = db();
  if (!sb) return null;

  const de = new Date(agora - JANELA_MS).toISOString();
  const ate = new Date(agora + JANELA_MS).toISOString();

  const campos =
    "segment_id, origin, destination, departure_at, arrival_at, locator, airline_name, vendedor, customer_name, customer_mobile";

  const [ida, volta, voltou] = await Promise.all([
    sb
      .from("v_voos_etapas")
      .select(campos)
      .eq("etapa", "ida")
      .gte("departure_at", new Date(agora).toISOString())
      .lte("departure_at", ate)
      .order("departure_at"),
    sb
      .from("v_voos_etapas")
      .select(campos)
      .eq("retorno_para_casa", true)
      .gte("departure_at", new Date(agora).toISOString())
      .lte("departure_at", ate)
      .order("departure_at"),
    sb
      .from("v_voos_etapas")
      .select(campos)
      .eq("retorno_para_casa", true)
      .gte("arrival_at", de)
      .lte("arrival_at", new Date(agora).toISOString())
      // Quem chegou por último aparece primeiro: é quem acabou de voltar, e
      // o contato mais quente da lista.
      .order("arrival_at", { ascending: false }),
  ]);

  const erro = ida.error ?? volta.error ?? voltou.error;
  if (erro) {
    console.error("[monde/voos]", erro.message);
    return null;
  }

  const monta = (linhas: Linha[] | null, campo: "departure_at" | "arrival_at") =>
    (linhas ?? [])
      .map((r) => paraVoo(r, r[campo], agora))
      .filter((v): v is Voo => v !== null);

  return {
    embarques: monta(ida.data as Linha[] | null, "departure_at"),
    retornos: monta(volta.data as Linha[] | null, "departure_at"),
    retornaram: monta(voltou.data as Linha[] | null, "arrival_at"),
  };
}
