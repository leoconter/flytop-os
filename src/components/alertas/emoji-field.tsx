"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Emojis do cadastro de alertas.
 *
 * Não é um teclado de emoji inteiro: é a lista que a FlyTop usa nos alertas —
 * aéreo, oferta, reação e as bandeiras dos destinos que ela vende. Cada um
 * carrega o nome, que serve de busca e de rótulo para leitor de tela.
 */
const GRUPOS: { nome: string; itens: [string, string][] }[] = [
  {
    nome: "Viagem",
    itens: [
      ["✈️", "avião"], ["🛫", "decolagem"], ["🛬", "pouso"], ["🎫", "passagem"],
      ["🧳", "mala"], ["🗺️", "mapa"], ["📍", "local"], ["🌍", "mundo europa"],
      ["🌎", "mundo américa"], ["🌏", "mundo ásia"], ["🏖️", "praia"],
      ["🏝️", "ilha"], ["🌴", "coqueiro"], ["⛱️", "guarda-sol"], ["🏔️", "montanha"],
      ["🌋", "vulcão"], ["🗽", "estátua da liberdade nova york"],
      ["🗼", "torre tóquio"], ["🏰", "castelo"], ["🕌", "mesquita dubai"],
      ["⛩️", "templo japão"], ["🎡", "roda gigante"], ["🚢", "navio"],
      ["🛳️", "cruzeiro"], ["🏨", "hotel"], ["🍷", "vinho"], ["🍕", "pizza itália"],
      ["🍣", "sushi japão"], ["☀️", "sol"], ["❄️", "neve"], ["🌙", "noite"],
      ["📸", "foto"],
    ],
  },
  {
    nome: "Oferta",
    itens: [
      ["🔥", "fogo promoção"], ["💥", "explosão"], ["🚨", "alerta sirene"],
      ["⚠️", "atenção"], ["✅", "check confirmado"], ["❗", "exclamação"],
      ["‼️", "dupla exclamação"], ["⭐", "estrela"], ["🌟", "brilho"],
      ["💫", "brilho estrela"], ["💰", "dinheiro"], ["💸", "dinheiro voando"],
      ["💳", "cartão parcelas"], ["🏷️", "etiqueta preço"], ["📉", "queda preço"],
      ["📢", "megafone aviso"], ["⏰", "relógio urgência"], ["⏳", "ampulheta"],
      ["🔔", "sino alerta"], ["📲", "celular whatsapp"], ["👉", "aponta direita"],
      ["👇", "aponta baixo"], ["🎉", "festa"], ["💎", "diamante premium"],
      ["🔹", "losango azul"], ["🔸", "losango laranja"], ["✔️", "certo"],
      ["🆕", "novo"],
    ],
  },
  {
    nome: "Reações",
    itens: [
      ["😍", "apaixonado"], ["🤩", "encantado"], ["😱", "chocado"],
      ["🥰", "amoroso"], ["😎", "de óculos"], ["🤯", "explodindo"],
      ["🥳", "comemorando"], ["🤑", "cifrão"], ["👏", "palmas"],
      ["🙌", "mãos ao alto"], ["👍", "joinha"], ["🫶", "coração com as mãos"],
      ["❤️", "coração vermelho"], ["🧡", "coração laranja"],
      ["💙", "coração azul"], ["💚", "coração verde"],
    ],
  },
  {
    nome: "Bandeiras",
    itens: [
      ["🇧🇷", "brasil"], ["🇵🇹", "portugal lisboa porto"], ["🇪🇸", "espanha madri barcelona"],
      ["🇮🇹", "itália roma milão"], ["🇫🇷", "frança paris"], ["🇬🇧", "reino unido londres"],
      ["🇮🇪", "irlanda dublin"], ["🇩🇪", "alemanha berlim frankfurt"],
      ["🇳🇱", "holanda amsterdã"], ["🇧🇪", "bélgica bruxelas"],
      ["🇨🇭", "suíça zurique"], ["🇦🇹", "áustria viena"], ["🇬🇷", "grécia atenas"],
      ["🇹🇷", "turquia istambul"], ["🇸🇪", "suécia estocolmo"],
      ["🇳🇴", "noruega oslo"], ["🇩🇰", "dinamarca copenhague"],
      ["🇦🇪", "emirados dubai"], ["🇶🇦", "catar doha"], ["🇮🇱", "israel tel aviv"],
      ["🇪🇬", "egito cairo"], ["🇲🇦", "marrocos marrakech"],
      ["🇿🇦", "áfrica do sul joanesburgo"], ["🇯🇵", "japão tóquio"],
      ["🇨🇳", "china xangai"], ["🇰🇷", "coreia seul"], ["🇹🇭", "tailândia bangkok"],
      ["🇸🇬", "singapura"], ["🇮🇩", "indonésia bali"], ["🇮🇳", "índia"],
      ["🇦🇺", "austrália sydney"], ["🇺🇸", "estados unidos miami nova york"],
      ["🇨🇦", "canadá toronto"], ["🇲🇽", "méxico cancún"],
      ["🇦🇷", "argentina buenos aires"], ["🇨🇱", "chile santiago"],
      ["🇺🇾", "uruguai montevidéu"], ["🇵🇪", "peru lima"],
      ["🇨🇴", "colômbia bogotá"], ["🇵🇦", "panamá"],
    ],
  },
];

const IconeEmoji = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
    <path d="M9 9.5h.01M15 9.5h.01" />
  </svg>
);

/** Popover com os emojis. Fecha ao clicar fora ou apertar Esc, como o calendário. */
function Seletor({ onEscolher, onFechar }: { onEscolher: (e: string) => void; onFechar: () => void }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();

  const grupos = termo
    ? [
        {
          nome: "Resultados",
          itens: GRUPOS.flatMap((g) => g.itens).filter(([, n]) => n.includes(termo)),
        },
      ]
    : GRUPOS;

  return (
    <div className="emoji-pop">
      <input
        className="input emoji-busca"
        placeholder="Buscar: praia, fogo, portugal…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        aria-label="Buscar emoji"
        autoFocus
      />
      <div className="emoji-rolo">
        {grupos.map((g) => (
          <div key={g.nome}>
            <p className="emoji-grupo">{g.nome}</p>
            <div className="emoji-grade">
              {g.itens.map(([e, nome]) => (
                <button
                  key={e}
                  type="button"
                  className="emoji-item"
                  title={nome}
                  aria-label={nome}
                  onClick={() => onEscolher(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
        {grupos[0].itens.length === 0 && (
          <p className="metric-hint" style={{ padding: "10px 2px" }}>
            Nenhum emoji com esse nome.
          </p>
        )}
      </div>
      <button type="button" className="btn btn-ghost btn-sm emoji-fechar" onClick={onFechar}>
        Fechar
      </button>
    </div>
  );
}

type Alvo = HTMLInputElement | HTMLTextAreaElement;

/**
 * Campo com botão de emoji.
 *
 * O emoji entra onde o cursor está, não no fim do texto — quem escreve o
 * título quase sempre quer a bandeira no meio da frase. Depois de inserir, o
 * cursor volta para logo depois do emoji, então dá para escolher vários
 * seguidos sem clicar no campo de novo.
 */
function useEmoji(value: string, onChange: (v: string) => void) {
  const ref = useRef<Alvo>(null);
  const cursor = useRef<number | null>(null);

  // Só depois que o React reescreveu o campo é que dá para posicionar o cursor.
  useEffect(() => {
    if (cursor.current === null) return;
    const el = ref.current;
    if (el) {
      el.focus();
      el.setSelectionRange(cursor.current, cursor.current);
    }
    cursor.current = null;
  });

  const inserir = (emoji: string) => {
    const el = ref.current;
    const ini = el?.selectionStart ?? value.length;
    const fim = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, ini) + emoji + value.slice(fim));
    cursor.current = ini + emoji.length;
  };

  return { ref, inserir };
}

/** Botão + popover, compartilhado pelo input e pela área de texto. */
function Gatilho({ inserir, alto }: { inserir: (e: string) => void; alto?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <span className={`emoji-caixa${alto ? " alto" : ""}`} ref={caixa}>
      <button
        type="button"
        className={`emoji-btn${aberto ? " on" : ""}`}
        title="Inserir emoji"
        aria-label="Inserir emoji"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
      >
        <IconeEmoji />
      </button>
      {aberto && <Seletor onEscolher={inserir} onFechar={() => setAberto(false)} />}
    </span>
  );
}

export function EntradaComEmoji({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const { ref, inserir } = useEmoji(value, onChange);
  return (
    <div className="com-emoji">
      <input
        {...rest}
        ref={ref as React.RefObject<HTMLInputElement>}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Gatilho inserir={inserir} />
    </div>
  );
}

export function TextoComEmoji({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const { ref, inserir } = useEmoji(value, onChange);
  return (
    <div className="com-emoji">
      <textarea
        {...rest}
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        className="textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Gatilho inserir={inserir} alto />
    </div>
  );
}
