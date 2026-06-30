"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "flytop-blur";
const CHANGE_EVENT = "flytop-blur-change";

/**
 * Loja externa (localStorage) lida via useSyncExternalStore — evita mismatch de
 * hidratação (renderiza o snapshot do servidor e atualiza no cliente) sem
 * chamar setState dentro de effect.
 */
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "on";
}
function getServerSnapshot() {
  return false;
}

/**
 * Toggle de privacidade. Alterna a classe `body.blur-on` (o CSS em globals.css
 * borra elementos `.private` e `.chart-box`) e persiste em localStorage.
 */
export function PrivacyToggle() {
  const on = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Reflete o estado no <body> (efeito de DOM, não muda estado do React).
  useEffect(() => {
    document.body.classList.toggle("blur-on", on);
  }, [on]);

  const toggle = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, on ? "off" : "on");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [on]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label="Alternar visibilidade dos valores"
      className="inline-flex select-none items-center gap-[7px] rounded-[var(--radius-pill)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.55)] px-[13px] py-[7px] text-[12px] font-medium text-text-2 backdrop-blur-[20px] backdrop-saturate-150 transition-colors hover:bg-[rgba(255,255,255,0.78)] hover:text-text-1 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.04)]"
    >
      {on ? <EyeOffIcon /> : <EyeIcon />}
      {on ? "Mostrar valores" : "Ocultar valores"}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[14px] w-[14px] shrink-0"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[14px] w-[14px] shrink-0"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
