"use client";

import { useState } from "react";

const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DOW = ["D", "S", "T", "Q", "Q", "S", "S"];

const pad2 = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

/**
 * Calendário de seleção múltipla de datas. Clicar em um dia adiciona/remove.
 * Datas em ISO (YYYY-MM-DD). `fallback` define o mês inicial exibido quando
 * não há datas selecionadas (evita depender de "hoje" e mismatch de hidratação).
 */
export function MultiDateCalendar({
  value,
  onChange,
  fallback,
  accent = "blue",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  fallback: { y: number; m: number };
  accent?: "blue" | "green";
}) {
  const first = value.length
    ? value.slice().sort()[0].split("-").map(Number)
    : null;
  const [view, setView] = useState<{ y: number; m: number }>(
    first ? { y: first[0], m: first[1] - 1 } : fallback,
  );

  const selected = new Set(value);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow = new Date(view.y, view.m, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function shift(delta: number) {
    const m = view.m + delta;
    const y = view.y + Math.floor(m / 12);
    setView({ y, m: ((m % 12) + 12) % 12 });
  }

  function toggle(d: number) {
    const key = iso(view.y, view.m, d);
    if (selected.has(key)) {
      onChange(value.filter((v) => v !== key));
    } else {
      onChange([...value, key]);
    }
  }

  return (
    <div className={`cal${accent === "green" ? " cal-green" : ""}`}>
      <div className="cal-head">
        <span className="cal-title">
          {MESES_LONGOS[view.m]} {view.y}
        </span>
        <div className="cal-nav">
          <button type="button" aria-label="Mês anterior" onClick={() => shift(-1)}>
            ‹
          </button>
          <button type="button" aria-label="Próximo mês" onClick={() => shift(1)}>
            ›
          </button>
        </div>
      </div>

      <div className="cal-grid">
        {DOW.map((d, i) => (
          <div className="cal-dow" key={i}>
            {d}
          </div>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <span className="cal-day empty" key={i} />
          ) : (
            <button
              type="button"
              key={i}
              className={`cal-day${selected.has(iso(view.y, view.m, d)) ? " sel" : ""}`}
              onClick={() => toggle(d)}
            >
              {d}
            </button>
          ),
        )}
      </div>

      <p className="cal-count">
        {value.length
          ? `${value.length} ${value.length === 1 ? "data selecionada" : "datas selecionadas"}`
          : "Nenhuma data selecionada"}
      </p>
    </div>
  );
}
