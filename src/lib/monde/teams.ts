/**
 * Equipes de venda.
 *
 * O Monde não tem esse conceito — é organização da FlyTop. O vínculo mora em
 * `monde_sellers.team_id`, que a sincronização diária não toca (o upsert só
 * escreve as colunas vindas da API).
 */
import { db } from "@/lib/supabase";

export interface TeamMember {
  sellerId: string;
  name: string;
  active: boolean | null;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}

export interface TeamsView {
  teams: Team[];
  /** Vendedores ainda sem equipe. */
  semEquipe: TeamMember[];
}

export async function getTeams(): Promise<TeamsView | null> {
  const sb = db();
  if (!sb) return null;

  const [teamsRes, sellersRes] = await Promise.all([
    sb.from("teams").select("id, name").order("name"),
    sb.from("monde_sellers").select("seller_id, name, active, team_id").order("name"),
  ]);

  if (teamsRes.error || sellersRes.error) {
    console.error("[monde/teams]", teamsRes.error?.message ?? sellersRes.error?.message);
    return null;
  }

  const porEquipe = new Map<string, TeamMember[]>();
  const semEquipe: TeamMember[] = [];
  for (const s of sellersRes.data ?? []) {
    const m: TeamMember = {
      sellerId: s.seller_id as string,
      name: s.name as string,
      active: s.active as boolean | null,
    };
    const tid = s.team_id as string | null;
    if (!tid) semEquipe.push(m);
    else porEquipe.set(tid, [...(porEquipe.get(tid) ?? []), m]);
  }

  return {
    teams: (teamsRes.data ?? []).map((t) => ({
      id: t.id as string,
      name: t.name as string,
      members: porEquipe.get(t.id as string) ?? [],
    })),
    semEquipe,
  };
}
