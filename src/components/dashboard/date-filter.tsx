"use client";

import { useState } from "react";

interface Preset {
  key: string;
  label: string;
  start: string;
  end: string;
}

// Presets ilustrativos centrados nos dados de maio/2026.
const PRESETS: Preset[] = [
  { key: "mes", label: "Maio 2026", start: "2026-05-01", end: "2026-05-31" },
  { key: "30d", label: "Últimos 30 dias", start: "2026-04-12", end: "2026-05-11" },
  { key: "ano", label: "Ano 2026", start: "2026-01-01", end: "2026-05-31" },
];

/**
 * Filtro por data do Dashboard Interno: presets + intervalo custom.
 *
 * UI funcional (estado local), mas por ora os dados exibidos são ilustrativos e
 * NÃO recalculam de verdade — a query real entra quando plugarmos Supabase/Monde.
 */
export function DateFilter() {
  const [preset, setPreset] = useState("mes");
  const [start, setStart] = useState(PRESETS[0].start);
  const [end, setEnd] = useState(PRESETS[0].end);

  function applyPreset(p: Preset) {
    setPreset(p.key);
    setStart(p.start);
    setEnd(p.end);
  }

  return (
    <div className="glass date-filter">
      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`chip${preset === p.key ? " sel" : ""}`}
            aria-pressed={preset === p.key}
            onClick={() => applyPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="range">
        <span className="lbl">De</span>
        <input
          type="date"
          className="input date"
          value={start}
          onChange={(e) => {
            setStart(e.target.value);
            setPreset("custom");
          }}
          aria-label="Data inicial"
        />
        <span className="sep">→</span>
        <span className="lbl">Até</span>
        <input
          type="date"
          className="input date"
          value={end}
          onChange={(e) => {
            setEnd(e.target.value);
            setPreset("custom");
          }}
          aria-label="Data final"
        />
      </div>

      <p className="note">
        Filtro ilustrativo — os números ainda são de exemplo; a consulta por
        período entra com a integração de dados reais.
      </p>
    </div>
  );
}
