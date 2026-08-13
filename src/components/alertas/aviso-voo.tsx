"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** De quanto em quanto tempo as telas abertas perguntam se saiu alerta. */
const INTERVALO_MS = 10_000;
/** Quanto o avião leva para atravessar. Igual ao `--voo-dur` do CSS. */
const TRAVESSIA_MS = 6_500;

const CHAVE_SOM = "ft-alerta-som";

interface Envio {
  id: string;
  titulo: string;
  destino: string;
  companhia: string | null;
  cabine: string | null;
  enviadoEm: string;
}

/* --------------------------- Preferências ---------------------------------- */

/**
 * Silêncio e "menos movimento" vivem fora do React — num caso o armazenamento
 * do navegador, no outro a configuração do sistema. Lidos como fonte externa,
 * a tela acompanha os dois mesmo quando mudam por fora: silenciar numa aba
 * vale nas outras, e trocar a preferência do sistema chega sem recarregar.
 */
const ouvintes = new Set<() => void>();
function avisarSom() {
  for (const f of ouvintes) f();
}
function assinarSom(cb: () => void) {
  ouvintes.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    ouvintes.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
const lerMudo = () => localStorage.getItem(CHAVE_SOM) === "0";

const consultaMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)");
function assinarMovimento(cb: () => void) {
  const mq = consultaMovimento();
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** No servidor não há navegador: assume som ligado e movimento permitido. */
const naoSei = () => false;

/* ------------------------------- Som --------------------------------------- */

/**
 * O som é sintetizado, não é arquivo.
 *
 * Sai um "whoosh" — ruído passando por um filtro que sobe e desce, como algo
 * cruzando de um lado ao outro — com duas notas curtas por cima para chamar
 * atenção. Sem arquivo não há requisição extra nem asset para versionar.
 */
function tocar(ctx: AudioContext) {
  const t = ctx.currentTime;
  const dur = 0.9;

  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;

  const ruido = ctx.createBufferSource();
  ruido.buffer = buffer;

  const filtro = ctx.createBiquadFilter();
  filtro.type = "bandpass";
  filtro.Q.value = 1.1;
  filtro.frequency.setValueAtTime(320, t);
  filtro.frequency.exponentialRampToValueAtTime(1900, t + 0.42);
  filtro.frequency.exponentialRampToValueAtTime(300, t + dur);

  const ganho = ctx.createGain();
  ganho.gain.setValueAtTime(0.0001, t);
  ganho.gain.exponentialRampToValueAtTime(0.13, t + 0.32);
  ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  ruido.connect(filtro).connect(ganho).connect(ctx.destination);
  ruido.start(t);
  ruido.stop(t + dur);

  [880, 1320].forEach((hz, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    const g = ctx.createGain();
    const inicio = t + 0.06 + i * 0.13;
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(0.1, inicio + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.5);
    osc.connect(g).connect(ctx.destination);
    osc.start(inicio);
    osc.stop(inicio + 0.5);
  });
}

/* ------------------------------ Componente --------------------------------- */

const Aviao = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.5 12c0 .6-.4 1-1 1l-5.6.1-3.3 6.4c-.2.3-.5.5-.9.5H9.3c-.4 0-.7-.4-.6-.8l1.7-6.1-4 .1-1.3 1.9c-.2.2-.4.4-.7.4h-.9c-.4 0-.7-.4-.6-.8L4 12l-1.1-2.7c-.1-.4.2-.8.6-.8h.9c.3 0 .5.1.7.4l1.3 1.9 4 .1-1.7-6.1c-.1-.4.2-.8.6-.8h1.4c.4 0 .7.2.9.5l3.3 6.4 5.6.1c.6 0 1 .4 1 1z" />
  </svg>
);

const SomLigado = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
  </svg>
);
const SomMudo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M16 10l4 4M20 10l-4 4" />
  </svg>
);

/**
 * Aviso de alerta enviado.
 *
 * Fica montado no layout, então vale em qualquer tela aberta: quando alguém
 * marca um alerta como enviado, um aviãozinho atravessa a tela puxando uma
 * faixa com o destino, e toca um som curto.
 */
export function AvisoVoo() {
  const [voo, setVoo] = useState<Envio | null>(null);
  const mudo = useSyncExternalStore(assinarSom, lerMudo, naoSei);
  const parado = useSyncExternalStore(
    assinarMovimento,
    () => consultaMovimento().matches,
    naoSei,
  );

  // `undefined` = ainda não sei qual era o último; o primeiro retorno vira a
  // referência. Sem isso, abrir a plataforma dispararia um avião pelo alerta
  // que saiu ontem.
  const visto = useRef<string | null | undefined>(undefined);
  const audio = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // O navegador só deixa tocar som depois de algum clique na página. Abrimos o
  // canal no primeiro toque, para o aviso não sair mudo na primeira vez.
  useEffect(() => {
    const destravar = () => {
      if (!audio.current) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) audio.current = new Ctx();
      }
      void audio.current?.resume().catch(() => {});
    };
    document.addEventListener("pointerdown", destravar, { once: true });
    document.addEventListener("keydown", destravar, { once: true });
    return () => {
      document.removeEventListener("pointerdown", destravar);
      document.removeEventListener("keydown", destravar);
    };
  }, []);

  const anunciar = useCallback((envio: Envio) => {
    setVoo(envio);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVoo(null), TRAVESSIA_MS);

    if (localStorage.getItem(CHAVE_SOM) === "0") return;
    const ctx = audio.current;
    if (!ctx) return;
    // Se o navegador ainda não liberou o áudio, o avião passa em silêncio —
    // melhor que engasgar a animação esperando permissão.
    void ctx.resume().then(() => tocar(ctx)).catch(() => {});
  }, []);

  useEffect(() => {
    let vivo = true;

    async function conferir() {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/alertas/ultimo-envio", { cache: "no-store" });
        if (!r.ok || !vivo) return;
        const { envio } = (await r.json()) as { envio: Envio | null };
        if (!vivo) return;

        const id = envio?.id ?? null;
        if (visto.current === undefined) {
          visto.current = id;
          return;
        }
        if (id && id !== visto.current) {
          visto.current = id;
          anunciar(envio!);
        }
      } catch {
        // Rede oscilou: não é erro de tela, tenta de novo no próximo ciclo.
      }
    }

    void conferir();
    const ciclo = setInterval(conferir, INTERVALO_MS);
    // Voltar para a aba confere na hora — assim o alerta que saiu enquanto ela
    // estava escondida não passa despercebido.
    document.addEventListener("visibilitychange", conferir);

    return () => {
      vivo = false;
      clearInterval(ciclo);
      document.removeEventListener("visibilitychange", conferir);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [anunciar]);

  if (!voo) return null;

  const detalhe = [voo.cabine, voo.companhia].filter(Boolean).join(" · ");

  return (
    <div className={`voo${parado ? " parado" : ""}`} role="status" aria-live="polite">
      <span className="voo-aviao">
        <Aviao />
      </span>
      <span className="voo-cabo" />
      <span className="voo-faixa">
        <b>Alerta enviado</b>
        <span className="voo-destino">{voo.destino}</span>
        {detalhe && <span className="voo-detalhe">{detalhe}</span>}
        <button
          type="button"
          className="voo-som"
          title={mudo ? "Ligar o som dos avisos" : "Silenciar os avisos"}
          aria-label={mudo ? "Ligar o som dos avisos" : "Silenciar os avisos"}
          onClick={() => {
            localStorage.setItem(CHAVE_SOM, mudo ? "1" : "0");
            avisarSom();
          }}
        >
          {mudo ? <SomMudo /> : <SomLigado />}
        </button>
      </span>
    </div>
  );
}
