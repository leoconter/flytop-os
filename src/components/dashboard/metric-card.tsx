"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Metric } from "@/lib/dashboard-data";

function cx(...parts: (string | false | undefined | null)[]) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Encolhe a fonte quando o número é comprido demais para a coluna.
 *
 * O cartão tem largura fixa e o valor não quebra linha: "R$ 5.358.240" a 29px
 * mede 184px numa caixa de 180 e vaza pela borda. Como o texto é montado no
 * servidor, o tamanho é conhecido aqui — não precisa medir no navegador nem
 * abreviar o valor, que é justamente o que se quer ver por inteiro.
 */
function comprido(valor: string): string | null {
  if (valor.length >= 14) return "xs";
  if (valor.length >= 12) return "md";
  return null;
}

/**
 * Cartão de métrica. Com `metric.info`, o rótulo ganha um "i" que abre a
 * explicação ao clique (fecha ao clicar fora ou apertar Esc).
 *
 * É client component por causa desse estado. O cartão é elevado enquanto o
 * texto está aberto: `.glass` usa backdrop-filter, que cria contexto de
 * empilhamento — sem o z-index, o cartão seguinte cobriria a explicação.
 */
export function MetricCard({ metric }: { metric: Metric }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popId = useId();

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

  return (
    <div
      className="glass metric"
      ref={ref}
      style={open ? { zIndex: 20 } : undefined}
    >
      <p className="metric-label">
        {metric.label}
        {metric.info && (
          <button
            type="button"
            className={cx("mi-btn", open && "on")}
            aria-label={`O que é ${metric.label}?`}
            aria-expanded={open}
            aria-describedby={open ? popId : undefined}
            onClick={() => setOpen((o) => !o)}
          >
            i
          </button>
        )}
      </p>

      <p
        className={cx(
          "metric-value",
          metric.tone,
          metric.small && "sm",
          comprido(metric.value),
          metric.privateValue && "private",
        )}
      >
        {metric.value}
      </p>

      {metric.bar && (
        <div
          className={cx(
            "metric-bar",
            metric.bar.green && "green",
            metric.privateValue && "private",
          )}
        >
          <div style={{ width: `${metric.bar.pct}%` }} />
        </div>
      )}

      {metric.hint && (
        <p
          className={cx(
            "metric-hint",
            metric.hintTone,
            metric.privateHint && "private",
          )}
        >
          {metric.hint}
        </p>
      )}

      {open && metric.info && (
        <div className="mi-pop" id={popId} role="tooltip">
          {metric.info}
        </div>
      )}
    </div>
  );
}
