/**
 * De que companhia é este nome.
 *
 * O Monde grava o nome digitado no cadastro, não um código: chegam
 * "American Air Lines", "Gol - Linhas Aéreas", "AIR CHINA". Para achar a logo é
 * preciso o código IATA, e ele não dá para deduzir do bilhete — os trechos
 * trazem os códigos de todas as companhias do itinerário, e num voo em
 * codeshare a primeira letra em ordem alfabética não é a companhia que vendeu.
 * Daí o mapa explícito.
 *
 * O nome é comparado sem acento, sem pontuação e sem caixa, para "AeroMéxico",
 * "Aeromexico" e "AEROMEXICO" caírem no mesmo lugar.
 */

/** Nome como aparece no Monde → código IATA. */
const POR_NOME: Record<string, string> = {
  "latam airlines brasil": "LA",
  "latam airlines chile": "LA",
  "latam airlines": "LA",
  "ita airways": "AZ",
  "british airways": "BA",
  "tap portugal": "TP",
  "tap air portugal": "TP",
  "american air lines": "AA",
  "american airlines": "AA",
  "iberia airlines": "IB",
  "iberia": "IB",
  "copa air lines": "CM",
  "copa airlines": "CM",
  "azul linhas aereas": "AD",
  "royal air maroc": "AT",
  "turkish airlines": "TK",
  "qatar airways": "QR",
  "air france": "AF",
  "united airlines": "UA",
  "aeromexico": "AM",
  "air china": "CA",
  "emirates": "EK",
  "deutsche lufthansa": "LH",
  "lufthansa": "LH",
  "jal japan airlines": "JL",
  "japan airlines": "JL",
  "aerolineas argentinas": "AR",
  "gol linhas aereas": "G3",
  "gol": "G3",
  "air canada": "AC",
  "swiss": "LX",
  "air europa": "UX",
  "avianca": "AV",
  "delta air lines": "DL",
  "delta airlines": "DL",
  "klm": "KL",
  "ethiopian": "ET",
  "ethiopian airlines": "ET",
  "south african airways": "SA",
  "qantas us": "QF",
  "qantas": "QF",
  "all nippon airways ana": "NH",
  "all nippon airways": "NH",
  "etihad airways": "EY",
  "singapore airlines": "SQ",
  "korean air": "KE",
  "jetsmart": "JA",
  "el al israel airlines": "LY",
  "azores airlines": "S4",
  "norwegian air shuttle": "DY",
  "eurowings": "EW",
  "sky airline": "H2",
  "neos air": "NO",

  /* Apelidos curtos. No cadastro de alerta a companhia é campo livre e quem
     digita escreve "LATAM", "TAP", "Turkish" — não o nome completo do Monde. */
  "latam": "LA",
  "tap": "TP",
  "azul": "AD",
  "ita": "AZ",
  "british": "BA",
  "american": "AA",
  "united": "UA",
  "copa": "CM",
  "delta": "DL",
  "qatar": "QR",
  "turkish": "TK",
  "emirates air": "EK",
  "air portugal": "TP",
  "japan airlines jal": "JL",
  "ana": "NH",
  "etihad": "EY",
  "singapore": "SQ",
  "korean": "KE",
  "norwegian": "DY",
  "royal air": "AT",
  "south african": "SA",
  "el al": "LY",
  "azores": "S4",
  "aerolineas": "AR",
};

/** Minúsculas, sem acento e sem pontuação — a forma usada como chave. */
function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Código IATA da companhia, ou null quando o nome não está no mapa. */
export function codigoIata(nome: string | null | undefined): string | null {
  if (!nome) return null;
  const chave = normalizar(nome);
  if (POR_NOME[chave]) return POR_NOME[chave];

  // Nome com sufixo ("Emirates Airlines", "Avianca Brasil"): tenta o prefixo
  // mais longo que exista no mapa, do mais específico para o mais geral.
  const partes = chave.split(" ");
  for (let n = partes.length - 1; n >= 1; n--) {
    const tentativa = partes.slice(0, n).join(" ");
    if (POR_NOME[tentativa]) return POR_NOME[tentativa];
  }
  return null;
}

/**
 * Caminho da logo, ou null quando não temos.
 *
 * Devolver null é o certo quando a companhia é desconhecida: uma imagem
 * quebrada ao lado do nome é pior que nome nenhum ao lado do nome.
 */
export function logoCompanhia(nome: string | null | undefined): string | null {
  const iata = codigoIata(nome);
  return iata ? `/companhias/${iata}.png` : null;
}

/** Todos os códigos usados — o script de download percorre esta lista. */
export function codigosConhecidos(): string[] {
  return [...new Set(Object.values(POR_NOME))].sort();
}
