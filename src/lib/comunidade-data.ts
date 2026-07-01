/**
 * Dados ilustrativos da tela de Comunidade. Portado do preview da Fase 1.
 */
import type { Metric } from "./dashboard-data";

export const communityMetrics: Metric[] = [
  { label: "Total de membros", value: "77.769", hint: "em 45 comunidades" },
  { label: "Entradas hoje", value: "+312", tone: "green", hint: "novos membros" },
  { label: "Saídas hoje", value: "−47", tone: "red", hint: "saíram dos grupos" },
  {
    label: "Saldo do dia",
    value: "+265",
    tone: "green",
    hint: "crescimento líquido",
    hintTone: "positive",
  },
];

/** Entradas x saídas — últimos 10 dias (saídas negativas para o eixo). */
export const communityFlow: {
  labels: string[];
  entradas: number[];
  saidas: number[];
} = {
  labels: ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11"],
  entradas: [241, 288, 310, 276, 259, 298, 331, 305, 289, 312],
  saidas: [38, 52, 41, 45, 60, 49, 37, 55, 43, 47],
};

/**
 * Capacidade máxima de cada comunidade. A "participação" na tabela representa
 * o quão cheia está a comunidade em relação a esse teto (membros / 2.000).
 */
export const COMMUNITY_CAP = 2000;

/** Membros por comunidade (45 grupos). */
const members = [
  1826, 1552, 1805, 1881, 1939, 1706, 1798, 1847, 1740, 1651, 1714, 1706, 1768,
  1804, 1931, 1920, 1781, 132, 1755, 1693, 1957, 1743, 1718, 1738, 1892, 1833,
  1509, 1646, 1740, 1791, 1773, 1773, 1575, 1829, 1683, 1623, 1820, 1705, 1520,
  1795, 2000, 1673, 1878, 1793, 1813,
];

/** Posições (1-indexadas) das comunidades do Rio; as demais são de SP. */
const rjPositions = new Set([15, 16, 17, 18]);

export interface CommunityRow {
  name: string;
  region: "SP" | "RJ";
  members: number;
  membersLabel: string;
  /** % de ocupação = membros / 2.000. */
  occupancy: number;
  /** Largura da barra (0–100), teto em 100%. */
  bar: number;
  occupancyLabel: string;
}

export const communityRows: CommunityRow[] = members.map((m, i) => {
  const pos = i + 1;
  const occupancy = (m / COMMUNITY_CAP) * 100;
  return {
    name: `Comunidade ${String(pos).padStart(2, "0")}`,
    region: rjPositions.has(pos) ? "RJ" : "SP",
    members: m,
    membersLabel: m.toLocaleString("pt-BR"),
    occupancy,
    bar: Math.min(occupancy, 100),
    occupancyLabel: occupancy.toFixed(1).replace(".", ",") + "%",
  };
});

export const communityCount = communityRows.length;
export const communityTotalMembers = members.reduce((a, b) => a + b, 0);
export const communityTotalLabel = communityTotalMembers.toLocaleString("pt-BR");
