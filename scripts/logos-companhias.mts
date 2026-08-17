/**
 * Baixa as logos das companhias aéreas para `public/companhias/`.
 *
 * As logos ficam no repositório, e não são buscadas de um CDN a cada visita,
 * por três motivos: a tela não depende de um serviço de terceiros continuar no
 * ar, o navegador de quem usa a plataforma não é exposto a outro domínio, e a
 * imagem carrega junto com o resto em vez de aparecer depois.
 *
 * Rodar de novo é seguro: só baixa o que falta, a menos que receba `--forcar`.
 *
 * Uso:  node scripts/logos-companhias.mts [--forcar]
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { codigosConhecidos } from "../src/lib/companhias.ts";

const DESTINO = new URL("../public/companhias/", import.meta.url);
const forcar = process.argv.includes("--forcar");

/**
 * O símbolo quadrado, não o logotipo.
 *
 * O logotipo horizontal traz o nome da companhia escrito dentro da imagem —
 * ao lado do nome na lista, o texto apareceria duas vezes. Pior: boa parte
 * deles é em tinta escura sobre transparente e some no modo TV, que tem fundo
 * escuro. O símbolo quadrado tem fundo próprio e se sustenta nos dois.
 *
 * `@2x` dobra a resolução (256px reais) para não borrar em tela retina.
 */
const fonte = (iata: string) => `https://pics.avs.io/al_square/128/128/${iata}@2x.png`;

/** PNG de verdade começa com esta assinatura. */
const ehPng = (b: Buffer) =>
  b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

mkdirSync(DESTINO, { recursive: true });

const codigos = codigosConhecidos();
console.log(`${codigos.length} companhias no mapa.\n`);

let baixadas = 0;
let existentes = 0;
const falhas: string[] = [];

for (const iata of codigos) {
  const arquivo = new URL(`${iata}.png`, DESTINO);

  if (!forcar && existsSync(arquivo)) {
    existentes++;
    continue;
  }

  try {
    const res = await fetch(fonte(iata));
    if (!res.ok) {
      falhas.push(`${iata} (HTTP ${res.status})`);
      continue;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    // O serviço responde 200 com um pixel vazio quando não conhece o código;
    // gravar isso deixaria um quadrado em branco ao lado do nome, que parece
    // defeito da tela e não ausência de logo.
    if (!ehPng(buf) || buf.length < 500) {
      falhas.push(`${iata} (resposta vazia, ${buf.length}b)`);
      continue;
    }

    writeFileSync(arquivo, buf);
    baixadas++;
    console.log(`  ${iata}  ${String(buf.length).padStart(6)}b`);
  } catch (e) {
    falhas.push(`${iata} (${(e as Error).message})`);
  }
}

console.log(`\n${baixadas} baixadas, ${existentes} já existiam.`);
if (falhas.length) {
  console.log(`Sem logo (${falhas.length}): ${falhas.join(", ")}`);
  console.log("A tela mostra só o nome nesses casos — não quebra.");
}
