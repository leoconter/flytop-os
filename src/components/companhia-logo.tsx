import Image from "next/image";
import { logoCompanhia } from "@/lib/companhias";

/**
 * A logo da companhia ao lado do nome.
 *
 * Quando a companhia não está no mapa, não desenha nada — nem caixa vazia, nem
 * ícone genérico. Um espaço em branco alinhado ao lado do nome parece imagem
 * quebrada; a ausência simplesmente não chama atenção.
 *
 * `unoptimized` porque os arquivos já vêm no tamanho certo (256px) e são
 * dezenas de PNGs pequenos: passá-los pelo otimizador do Next só somaria
 * latência na primeira visita e custo de função.
 */
export function CompanhiaLogo({
  nome,
  tamanho = 22,
}: {
  nome: string | null | undefined;
  tamanho?: number;
}) {
  const src = logoCompanhia(nome);
  if (!src) return null;

  return (
    <Image
      className="cia-logo"
      src={src}
      alt=""
      aria-hidden="true"
      width={tamanho}
      height={tamanho}
      unoptimized
      /* Sem lazy: são ícones de poucos KB, quase sempre acima da dobra, e o
         carregamento adiado os fazia aparecer depois do texto — a lista piscava
         com quadrados vazios antes de as logos entrarem. */
      loading="eager"
      style={{ width: tamanho, height: tamanho }}
    />
  );
}

/**
 * Nome da companhia com a logo à esquerda.
 *
 * A logo é decorativa: quem usa leitor de tela ouve o nome, que já está no
 * texto ao lado — por isso o `alt` vazio, e não o nome repetido.
 */
export function CompanhiaNome({
  nome,
  tamanho,
}: {
  nome: string | null | undefined;
  tamanho?: number;
}) {
  if (!nome) return <span className="muted">—</span>;
  return (
    <span className="cia">
      <CompanhiaLogo nome={nome} tamanho={tamanho} />
      <span>{nome}</span>
    </span>
  );
}
