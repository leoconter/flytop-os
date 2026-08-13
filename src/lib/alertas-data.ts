/**
 * Opções fixas do cadastro de alertas.
 *
 * Os números da tela saem do banco (`src/lib/alertas/store.ts`); o que sobrou
 * aqui são as listas que o formulário oferece — cabines e companhias que a
 * FlyTop costuma alertar. Um valor fora da lista continua válido: o campo
 * mantém o que estiver gravado.
 */

export const cabines = ["Executiva", "Business", "Premium Economy", "Econômica"];

export const companhias = [
  "Air France",
  "LATAM",
  "United Airlines",
  "Qatar Airways",
  "TAP Air Portugal",
  "American Airlines",
  "ITA Airways",
  "Emirates",
];
