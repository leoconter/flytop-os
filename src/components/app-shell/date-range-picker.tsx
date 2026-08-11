"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  addDaysISO,
  DEFAULT_LABEL,
  defaultRange,
  formatRange,
  PARAM_FROM,
  PARAM_TO,
  periodDefaultFor,
  todaySP,
} from "@/lib/date-range";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DOW = ["D", "S", "T", "Q", "Q", "S", "S"];

const pad2 = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
/** Data ISO → partes, sem passar por fuso (meio-dia UTC evita virar o dia). */
const partsOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
};
const dowOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

interface Draft {
  since: string;
  until: string;
}

/** Presets, calculados a partir de "hoje" no momento em que o painel abre. */
function presetsFor(today: string): { label: string; range: Draft }[] {
  const startOfWeek = addDaysISO(today, -dowOf(today));
  const { y, m } = partsOf(today);
  const firstThisMonth = isoOf(y, m, 1);
  const lastPrevMonth = addDaysISO(firstThisMonth, -1);
  const p = partsOf(lastPrevMonth);
  return [
    { label: "Hoje", range: { since: today, until: today } },
    {
      label: "Ontem",
      range: { since: addDaysISO(today, -1), until: addDaysISO(today, -1) },
    },
    { label: "Últimos 7 dias", range: { since: addDaysISO(today, -6), until: today } },
    { label: "Últimos 14 dias", range: { since: addDaysISO(today, -13), until: today } },
    { label: "Últimos 30 dias", range: { since: addDaysISO(today, -29), until: today } },
    { label: "Esta semana", range: { since: startOfWeek, until: today } },
    {
      label: "Semana passada",
      range: {
        since: addDaysISO(startOfWeek, -7),
        until: addDaysISO(startOfWeek, -1),
      },
    },
    { label: "Este mês", range: { since: firstThisMonth, until: today } },
    {
      label: "Mês passado",
      range: { since: isoOf(p.y, p.m, 1), until: lastPrevMonth },
    },
    { label: "Este ano", range: { since: isoOf(y, 0, 1), until: today } },
  ];
}

const CalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

/** Uma grade mensal do seletor. */
function Month({
  y,
  m,
  draft,
  today,
  onPick,
}: {
  y: number;
  m: number;
  draft: Draft;
  today: string;
  onPick: (iso: string) => void;
}) {
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rp-month">
      <div className="rp-mtitle">
        {MESES[m]} {y}
      </div>
      <div className="rp-grid">
        {DOW.map((d, i) => (
          <span className="rp-dow" key={i}>
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const iso = isoOf(y, m, d);
          const isStart = iso === draft.since;
          const isEnd = iso === draft.until;
          const inside = iso > draft.since && iso < draft.until;
          const cls = [
            "rp-day",
            inside && "rp-in",
            (isStart || isEnd) && "rp-edge",
            isStart && !isEnd && "rp-start",
            isEnd && !isStart && "rp-end",
            isStart && isEnd && "rp-solo",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              type="button"
              key={i}
              className={cls}
              disabled={iso > today}
              onClick={() => onPick(iso)}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Seletor de período do cabeçalho: presets + calendário de dois meses.
 * Aplica o intervalo na URL (`?de=&ate=`), que as telas leem no servidor.
 * Usa useSearchParams — precisa estar dentro de um <Suspense> (ver Topbar).
 */
export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const ref = useRef<HTMLDivElement>(null);

  const urlSince = params.get(PARAM_FROM);
  const urlUntil = params.get(PARAM_TO);
  // Cada tela abre no período que faz sentido para ela — o rótulo tem que
  // dizer o mesmo que o servidor resolveu.
  const mode = periodDefaultFor(pathname);
  // Rótulo derivado só da URL: nada de "hoje" na renderização do servidor.
  const label =
    urlSince && urlUntil
      ? formatRange({ since: urlSince, until: urlUntil })
      : DEFAULT_LABEL[mode];

  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");
  const [draft, setDraft] = useState<Draft>({ since: "", until: "" });
  const [anchor, setAnchor] = useState<string | null>(null);
  const [view, setView] = useState({ y: 2026, m: 0 });

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

  function openPanel() {
    const t = todaySP();
    const initial: Draft =
      urlSince && urlUntil ? { since: urlSince, until: urlUntil } : defaultRange(mode);
    const { y, m } = partsOf(initial.until);
    setToday(t);
    setDraft(initial);
    setAnchor(null);
    // Mês do fim do intervalo à direita: o mês corrente fica sempre visível.
    setView(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
    setOpen(true);
  }

  function pick(iso: string) {
    if (anchor === null) {
      setAnchor(iso);
      setDraft({ since: iso, until: iso });
    } else {
      setDraft(
        iso < anchor ? { since: iso, until: anchor } : { since: anchor, until: iso },
      );
      setAnchor(null);
    }
  }

  function apply(range: Draft = draft) {
    const next = new URLSearchParams(params.toString());
    next.set(PARAM_FROM, range.since);
    next.set(PARAM_TO, range.until);
    router.push(`${pathname}?${next.toString()}`);
    setOpen(false);
  }

  function shiftView(delta: number) {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  }

  const right = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 };
  const presets = today ? presetsFor(today) : [];
  const spanDays =
    draft.since && draft.until
      ? Math.round(
          (Date.parse(`${draft.until}T12:00:00Z`) -
            Date.parse(`${draft.since}T12:00:00Z`)) /
            86_400_000,
        ) + 1
      : 0;

  return (
    <div className="rp" ref={ref}>
      <button
        type="button"
        className={`chip rp-trigger${open ? " sel" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        <CalIcon />
        {label}
      </button>

      {open && (
        <div className="rp-pop" role="dialog" aria-label="Selecionar período">
          <div className="rp-presets">
            {presets.map((p) => {
              const on =
                p.range.since === draft.since && p.range.until === draft.until;
              return (
                <button
                  type="button"
                  key={p.label}
                  className={`rp-preset${on ? " on" : ""}`}
                  onClick={() => {
                    setDraft(p.range);
                    setAnchor(null);
                    const { y, m } = partsOf(p.range.until);
                    setView(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="rp-body">
            <div className="rp-nav">
              <button type="button" aria-label="Meses anteriores" onClick={() => shiftView(-1)}>
                ‹
              </button>
              <button type="button" aria-label="Próximos meses" onClick={() => shiftView(1)}>
                ›
              </button>
            </div>
            <div className="rp-months">
              <Month {...view} draft={draft} today={today} onPick={pick} />
              <Month {...right} draft={draft} today={today} onPick={pick} />
            </div>

            <div className="rp-foot">
              <span className="rp-txt">
                {formatRange(draft)} · <b>{spanDays}</b>{" "}
                {spanDays === 1 ? "dia" : "dias"}
              </span>
              <span className="rp-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => apply()}>
                  Aplicar
                </button>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
