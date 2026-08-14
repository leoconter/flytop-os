/**
 * De que comunidade é este grupo.
 *
 * O identificador que a Z-API entrega — "120363421170082651-group" — não diz
 * nada para quem opera. A comunidade é conhecida pelo número: "#33", "RJ #17".
 * Este módulo tira esse número do nome do grupo, que é como a FlyTop já batiza
 * as comunidades no próprio WhatsApp.
 *
 * A leitura automática acerta 46 dos 49 grupos. Os outros três têm nome que não
 * diz nada ("Conversa em grupo desconhecida") e precisam de uma pessoa — por
 * isso o resultado é sugestão, e não verdade: quem manda é o que foi salvo na
 * tela de Comunidades.
 */

export interface Rotulo {
  numero: number | null;
  praca: string | null;
}

/**
 * Praças conhecidas.
 *
 * A numeração é contínua entre elas: os grupos 15, 16 e 17 são do Rio e não
 * existem em São Paulo. Por isso a praça é uma etiqueta do grupo, não um
 * prefixo que reinicia a contagem.
 */
const PRACAS = [
  { sigla: "RJ", padrao: /\bRJ\b|\brio\b/i },
  { sigla: "SP", padrao: /\bSP\b|\bs[ãa]o\s+paulo\b/i },
];

export function inferir(nome: string | null | undefined): Rotulo {
  const texto = String(nome ?? "");

  // "#33", "# 33" ou "nº 33" — o que aparece nos nomes reais.
  const m = /#\s*(\d{1,3})\b/.exec(texto) ?? /\bn[ºo°]\s*(\d{1,3})\b/i.exec(texto);
  const numero = m ? Number(m[1]) : null;

  const praca = PRACAS.find((p) => p.padrao.test(texto))?.sigla ?? null;

  return { numero, praca };
}

/** Como o grupo aparece nas telas. */
export function etiqueta(g: {
  numero?: number | null;
  praca?: string | null;
  apelido?: string | null;
  name?: string | null;
  group_id?: string;
}): string {
  if (g.apelido?.trim()) return g.apelido.trim();
  if (g.numero != null) return `${g.praca ? `${g.praca} ` : ""}#${g.numero}`;
  if (g.name?.trim()) return g.name.trim();
  // Último recurso: o começo do id, que ao menos distingue um grupo do outro.
  return g.group_id ? `Grupo ${g.group_id.slice(0, 8)}…` : "Grupo sem nome";
}
