/**
 * Mapa de classe tarifária → cabine comercial.
 *
 * A API do Monde entrega a letra do RBD ("J", "T") e cada companhia usa a sua
 * própria convenção — "P" é Executiva numa e Premium Economy noutra. Por isso
 * a regra pode ser específica por companhia, com um padrão de fallback.
 */
import { db } from "@/lib/supabase";

export const CABINS = ["Econômica", "Premium Economy", "Executiva", "First"] as const;
export type Cabin = (typeof CABINS)[number];

export interface FareRule {
  id: string;
  airlineCode: string | null; // null = regra padrão
  fareClass: string;
  cabin: string;
  confirmed: boolean;
  observations: string | null;
}

export interface FareUsage {
  airlineCode: string | null;
  fareClass: string | null;
  legs: number;
  salesCount: number;
  cabin: string | null;
  /** especifica | padrao | nao mapeada */
  source: string;
  confirmed: boolean;
  ruleId: string | null;
}

/** Regras padrão (sem companhia), ordenadas pela letra. */
export async function getDefaultRules(): Promise<FareRule[] | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("fare_class_map")
    .select("id, airline_code, fare_class, cabin, confirmed, observations")
    .is("airline_code", null)
    .order("fare_class");

  if (error) {
    console.error("[fare-classes] padrão:", error.message);
    return null;
  }
  return (data ?? []).map(toRule);
}

/** Regras específicas de companhia. */
export async function getAirlineRules(): Promise<FareRule[] | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("fare_class_map")
    .select("id, airline_code, fare_class, cabin, confirmed, observations")
    .not("airline_code", "is", null)
    .order("airline_code")
    .order("fare_class");

  if (error) return null;
  return (data ?? []).map(toRule);
}

function toRule(r: Record<string, unknown>): FareRule {
  return {
    id: r.id as string,
    airlineCode: (r.airline_code as string) ?? null,
    fareClass: r.fare_class as string,
    cabin: r.cabin as string,
    confirmed: Boolean(r.confirmed),
    observations: (r.observations as string) ?? null,
  };
}

/**
 * Combinações companhia+classe que aparecem nas vendas, da mais usada para a
 * menos usada. É por aqui que se descobre o que vale configurar: são 401
 * combinações, mas poucas concentram o volume.
 */
export async function getUsage(limit = 60): Promise<FareUsage[] | null> {
  const sb = db();
  if (!sb) return null;

  const { data, error } = await sb
    .from("v_fare_class_usage")
    .select("airline_code, fare_class, legs, sales_count, cabin, source, confirmed, rule_id")
    .order("legs", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[fare-classes] uso:", error.message);
    return null;
  }

  return (data ?? []).map((r) => ({
    airlineCode: (r.airline_code as string) ?? null,
    fareClass: (r.fare_class as string) ?? null,
    legs: Number(r.legs ?? 0),
    salesCount: Number(r.sales_count ?? 0),
    cabin: (r.cabin as string) ?? null,
    source: r.source as string,
    confirmed: Boolean(r.confirmed),
    ruleId: (r.rule_id as string) ?? null,
  }));
}

/** Quanto do volume ainda não tem cabine resolvida. */
export async function getCoverage(): Promise<{
  legs: number;
  mapped: number;
  pct: number;
  unmappedCombos: number;
  emptyClassLegs: number;
} | null> {
  const sb = db();
  if (!sb) return null;

  const rows: FareUsage[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("v_fare_class_usage")
      .select("airline_code, fare_class, legs, cabin, source")
      .range(from, from + 999);
    if (error || !data) break;
    rows.push(
      ...data.map((r) => ({
        airlineCode: (r.airline_code as string) ?? null,
        fareClass: (r.fare_class as string) ?? null,
        legs: Number(r.legs ?? 0),
        salesCount: 0,
        cabin: (r.cabin as string) ?? null,
        source: r.source as string,
        confirmed: false,
        ruleId: null,
      })),
    );
    if (data.length < 1000) break;
  }
  if (!rows.length) return null;

  const legs = rows.reduce((s, r) => s + r.legs, 0);
  const mapped = rows.filter((r) => r.cabin).reduce((s, r) => s + r.legs, 0);
  return {
    legs,
    mapped,
    pct: legs > 0 ? (mapped / legs) * 100 : 0,
    unmappedCombos: rows.filter((r) => !r.cabin && r.fareClass).length,
    // Trecho sem classe preenchida no ERP: nao ha regra que resolva.
    emptyClassLegs: rows.filter((r) => !r.fareClass).reduce((s, r) => s + r.legs, 0),
  };
}
