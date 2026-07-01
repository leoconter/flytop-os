"use client";

import { useState } from "react";
import { disparoOptions } from "@/lib/alertas-data";

const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6l3 3 5-6" />
  </svg>
);

/** Seleção de comunidades para disparo; o botão mostra o total de grupos. */
export function DisparoCard({ onSalvar }: { onSalvar?: () => void }) {
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(disparoOptions.map((o) => [o.key, o.on])),
  );

  const total = disparoOptions.reduce(
    (sum, o) => sum + (selected[o.key] ? o.count : 0),
    0,
  );

  return (
    <div className="glass card">
      <SectionHeadLite title="Disparar para comunidades" sub="por região" />
      <div className="check-list">
        {disparoOptions.map((o) => (
          <button
            type="button"
            key={o.key}
            className={`check${selected[o.key] ? " on" : ""}`}
            aria-pressed={!!selected[o.key]}
            onClick={() =>
              setSelected((s) => ({ ...s, [o.key]: !s[o.key] }))
            }
          >
            <span className="box">
              <CheckIcon />
            </span>
            <span className="cn">{o.label}</span>
            <span className="cc">{o.info}</span>
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-block" disabled={total === 0}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        Disparar para {total} {total === 1 ? "grupo" : "grupos"}
      </button>

      {onSalvar && (
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ marginTop: 8 }}
          onClick={onSalvar}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <path d="M17 21v-8H7v8M7 3v5h8" />
          </svg>
          Salvar alerta para enviar depois
        </button>
      )}
    </div>
  );
}

function SectionHeadLite({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="section-head flush" style={{ marginBottom: 10 }}>
      <span className="section-title">{title}</span>
      <span className="section-sub">{sub}</span>
    </div>
  );
}
