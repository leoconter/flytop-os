"use client";

import { useEffect, useRef, useState } from "react";
import { MultiDateCalendar } from "./multi-date-calendar";

const MESES = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

/** Resumo das datas selecionadas: "9 datas · JUL, AGO". */
function summarize(value: string[]): string | null {
  if (!value.length) return null;
  const months: string[] = [];
  for (const iso of [...value].sort()) {
    const m = Number(iso.split("-")[1]);
    const lbl = MESES[m - 1];
    if (!months.includes(lbl)) months.push(lbl);
  }
  const n = value.length;
  return `${n} ${n === 1 ? "data" : "datas"} · ${months.join(", ")}`;
}

const CalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const Chevron = () => (
  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/**
 * Campo de datas: mostra um resumo e abre o calendário (popover) só ao clicar.
 * Fecha ao clicar fora ou apertar Esc.
 */
export function CalendarField({
  value,
  onChange,
  fallback,
  accent = "blue",
  placeholder = "Selecionar datas",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  fallback: { y: number; m: number };
  accent?: "blue" | "green";
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const summary = summarize(value);

  return (
    <div className="cal-field" ref={ref}>
      <button
        type="button"
        className={`cal-trigger${open ? " open" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="lead">
          <CalIcon />
          {summary ? <span>{summary}</span> : <span className="placeholder">{placeholder}</span>}
        </span>
        <Chevron />
      </button>

      {open && (
        <div className="cal-pop">
          <MultiDateCalendar
            value={value}
            onChange={onChange}
            fallback={fallback}
            accent={accent}
          />
        </div>
      )}
    </div>
  );
}
