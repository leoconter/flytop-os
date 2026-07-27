"use client";

import { useEffect, useRef, useState } from "react";
import { mesLabel } from "@/lib/crm-data";

const MES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Resumo dos meses selecionados: "3 meses · Set/26, Out/26…". */
function summarize(value: string[]): string | null {
  if (!value.length) return null;
  const labels = [...value].sort().map(mesLabel);
  const shown = labels.slice(0, 3).join(", ");
  return `${value.length} ${value.length === 1 ? "mês" : "meses"} · ${shown}${labels.length > 3 ? "…" : ""}`;
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
 * Campo de meses: mostra um resumo e abre um mini-calendário (visão de ano)
 * só ao clicar. Navega por ano; clicar num mês adiciona/remove. Aceita vários
 * meses, inclusive de anos diferentes. Fecha ao clicar fora ou apertar Esc.
 */
export function MonthField({
  value,
  onChange,
  fallbackYear = 2026,
  placeholder = "Selecionar meses",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  fallbackYear?: number;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const firstYear = value.length
    ? Number(value.slice().sort()[0].split("-")[0])
    : fallbackYear;
  const [year, setYear] = useState(firstYear);
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

  const selected = new Set(value);
  const summary = summarize(value);

  function toggle(monthIndex: number) {
    const key = `${year}-${pad2(monthIndex + 1)}`;
    if (selected.has(key)) {
      onChange(value.filter((v) => v !== key));
    } else {
      onChange([...value, key]);
    }
  }

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
          <div className="cal">
            <div className="cal-head">
              <span className="cal-title">{year}</span>
              <div className="cal-nav">
                <button type="button" aria-label="Ano anterior" onClick={() => setYear((y) => y - 1)}>
                  ‹
                </button>
                <button type="button" aria-label="Próximo ano" onClick={() => setYear((y) => y + 1)}>
                  ›
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {MES_ABREV.map((m, i) => {
                const key = `${year}-${pad2(i + 1)}`;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`cal-day${selected.has(key) ? " sel" : ""}`}
                    style={{ aspectRatio: "auto", padding: "10px 0", fontSize: 12.5 }}
                    onClick={() => toggle(i)}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            <p className="cal-count">
              {value.length
                ? `${value.length} ${value.length === 1 ? "mês selecionado" : "meses selecionados"}`
                : "Nenhum mês selecionado"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
