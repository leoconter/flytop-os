"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Botão de TV / tela cheia. Esconde a sidebar (classe `body.tv-mode`) e entra
 * no fullscreen real do navegador. Sai pelo mesmo botão ou pela tecla Esc
 * (sincronizado via evento `fullscreenchange`).
 */
export function TvModeButton() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    function onFsChange() {
      // Ao sair do fullscreen (Esc), também sai do modo TV.
      if (!document.fullscreenElement) {
        document.body.classList.remove("tv-mode");
        setOn(false);
      }
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggle = useCallback(async () => {
    const entering = !document.body.classList.contains("tv-mode");
    if (entering) {
      document.body.classList.add("tv-mode");
      setOn(true);
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Fullscreen pode ser bloqueado; ainda assim escondemos a sidebar.
      }
    } else {
      document.body.classList.remove("tv-mode");
      setOn(false);
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignore
        }
      }
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label="Alternar modo TV (tela cheia)"
      className="blur-toggle"
    >
      {on ? <ContractIcon /> : <ExpandIcon />}
      {on ? "Sair da TV" : "Tela cheia"}
    </button>
  );
}

function ExpandIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function ContractIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}
