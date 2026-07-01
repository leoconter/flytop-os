/**
 * Geração do modelo de mensagem do alerta (padrão WhatsApp do FlyTop).
 */

const MESES = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

const pad2 = (n: number | string) => String(n).padStart(2, "0");

/** Extrai só os dígitos e devolve número. */
export function num(v: string | number): number {
  return Number(String(v).replace(/[^\d]/g, "")) || 0;
}

/** Formata como BRL: "R$ 12.680". */
export function money(v: string | number): string {
  return "R$ " + num(v).toLocaleString("pt-BR");
}

/** % de desconto entre "de" e "por". */
export function percentOff(de: string | number, por: string | number): string {
  const a = num(de);
  const b = num(por);
  if (!a || b >= a) return "0%";
  return Math.round(((a - b) / a) * 100) + "%";
}

/**
 * Agrupa datas ISO (YYYY-MM-DD) por mês, em ordem cronológica, no formato:
 *   *JUL:* 16, 20, 21
 *   *AGO:* 01, 03
 */
export function formatDates(isoDates: string[]): string {
  if (!isoDates.length) return "—";
  const sorted = [...isoDates].sort();
  const groups: { key: number; mes: string; days: string[] }[] = [];
  for (const iso of sorted) {
    const [y, m, d] = iso.split("-").map(Number);
    const key = y * 100 + m;
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, mes: MESES[m - 1], days: [pad2(d)] });
    } else {
      last.days.push(pad2(d));
    }
  }
  return groups.map((g) => `*${g.mes}:* ${g.days.join(", ")}`).join("\n");
}

export interface AlertFields {
  titulo: string;
  origem: string;
  destino: string;
  cabine: string;
  companhia: string;
  de: string;
  por: string;
  xjuros: string;
  idaDates: string[];
  voltaDates: string[];
}

/** Monta o texto do alerta a partir dos campos, seguindo o template do FlyTop. */
export function buildMessage(f: AlertFields): string {
  return `*${f.titulo}*

🔹 Destino: ${f.destino}
🔹 *${f.cabine} ${f.companhia}*

🛫 Saídas de ${f.origem}

~${money(f.de)}~
✅ *${money(f.por)} ida e volta com taxas* • ${percentOff(f.de, f.por)} OFF

*Em até ${num(f.xjuros)}x sem juros

🗓️ Ida:

${formatDates(f.idaDates)}

🗓️ Volta:

${formatDates(f.voltaDates)}

⚠️ *Oferta válida apenas para as datas acima*

📲 Nos chame para realizar a emissão:
👉 flytopviagens.com.br/fale-conosco

_Fly Top Viagens LTDA_ ®️`;
}
