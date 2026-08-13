"use client";

import type { ChartData, ChartOptions, TooltipItem } from "chart.js";
import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { fmtInt } from "@/lib/meta/instagram";
import { brl, glassTooltip, moneyTick } from "./register";

export interface DiaReceita {
  date: string;
  revenue: number;
  count: number;
}

type Granularidade = "dia" | "semana" | "mes" | "trimestre" | "ano";

const OPCOES: { chave: Granularidade; rotulo: string }[] = [
  { chave: "dia", rotulo: "Diário" },
  { chave: "semana", rotulo: "Semanal" },
  { chave: "mes", rotulo: "Mensal" },
  { chave: "trimestre", rotulo: "Trimestral" },
  { chave: "ano", rotulo: "Anual" },
];

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/* Datas em UTC ao meio-dia: o mesmo cuidado do resto da plataforma, para o
   fuso não empurrar um dia para trás na virada. */
const dia = (iso: string) => new Date(`${iso}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const somaDias = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};

/** Segunda-feira da semana da data. */
function segunda(d: Date): Date {
  const dow = d.getUTCDay(); // 0 = domingo
  return somaDias(d, dow === 0 ? -6 : 1 - dow);
}

/** Início do balde ao qual a data pertence. */
function inicioDoBalde(d: Date, g: Granularidade): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (g) {
    case "dia":
      return d;
    case "semana":
      return segunda(d);
    case "mes":
      return new Date(Date.UTC(y, m, 1, 12));
    case "trimestre":
      return new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1, 12));
    case "ano":
      return new Date(Date.UTC(y, 0, 1, 12));
  }
}

function proximoBalde(d: Date, g: Granularidade): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (g) {
    case "dia":
      return somaDias(d, 1);
    case "semana":
      return somaDias(d, 7);
    case "mes":
      return new Date(Date.UTC(y, m + 1, 1, 12));
    case "trimestre":
      return new Date(Date.UTC(y, m + 3, 1, 12));
    case "ano":
      return new Date(Date.UTC(y + 1, 0, 1, 12));
  }
}

function rotulo(d: Date, g: Granularidade): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const ano2 = String(d.getUTCFullYear()).slice(2);
  switch (g) {
    case "dia":
    case "semana":
      return `${dd}/${mm}`;
    case "mes":
      return `${MES[d.getUTCMonth()]}/${ano2}`;
    case "trimestre":
      return `T${Math.floor(d.getUTCMonth() / 3) + 1}/${ano2}`;
    case "ano":
      return String(d.getUTCFullYear());
  }
}

interface Balde {
  inicio: string;
  fim: string;
  rotulo: string;
  revenue: number;
  count: number;
}

/**
 * Agrupa a série diária em baldes.
 *
 * Percorre o período inteiro, e não só os dias que tiveram venda: dia parado
 * precisa aparecer como zero, senão o eixo mente sobre o intervalo entre as
 * barras. Os baldes das pontas ficam recortados pelo período — meia semana no
 * começo é meia semana, não uma semana inteira.
 */
function agrupar(
  daily: DiaReceita[],
  since: string,
  until: string,
  g: Granularidade,
): Balde[] {
  const porDia = new Map(daily.map((d) => [d.date, d]));
  const fimPeriodo = dia(until);
  const baldes: Balde[] = [];

  let cursor = inicioDoBalde(dia(since), g);
  while (cursor <= fimPeriodo) {
    const proximo = proximoBalde(cursor, g);
    const inicioReal = iso(cursor) < since ? since : iso(cursor);
    const fimBalde = somaDias(proximo, -1);
    const fimReal = iso(fimBalde) > until ? until : iso(fimBalde);

    let revenue = 0;
    let count = 0;
    for (let d = dia(inicioReal); iso(d) <= fimReal; d = somaDias(d, 1)) {
      const r = porDia.get(iso(d));
      if (r) {
        revenue += r.revenue;
        count += r.count;
      }
    }

    baldes.push({ inicio: inicioReal, fim: fimReal, rotulo: rotulo(cursor, g), revenue, count });
    cursor = proximo;
  }

  return baldes;
}

const dataBR = (isoStr: string) => isoStr.slice(8, 10) + "/" + isoStr.slice(5, 7) + "/" + isoStr.slice(2, 4);

/**
 * Receita do período analisado, no recorte que a pessoa escolher.
 *
 * A série vem pronta do servidor em dias; trocar de granularidade é só
 * reagrupar aqui — sem nova consulta, a troca é instantânea.
 */
export function RevenuePeriodChart({
  daily,
  since,
  until,
}: {
  daily: DiaReceita[];
  since: string;
  until: string;
}) {
  const [g, setG] = useState<Granularidade>("dia");

  // Quantos baldes cada opção geraria: uma barra só não é um gráfico, então a
  // opção fica apagada em vez de entregar um retângulo isolado.
  const contagens = useMemo(() => {
    const m = {} as Record<Granularidade, number>;
    for (const o of OPCOES) m[o.chave] = agrupar(daily, since, until, o.chave).length;
    return m;
  }, [daily, since, until]);

  const baldes = useMemo(() => agrupar(daily, since, until, g), [daily, since, until, g]);

  const data: ChartData<"bar", number[], string> = {
    labels: baldes.map((b) => b.rotulo),
    datasets: [
      {
        data: baldes.map((b) => b.revenue),
        backgroundColor: "rgba(30,86,184,0.7)",
        hoverBackgroundColor: "rgba(30,86,184,0.9)",
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...glassTooltip,
        callbacks: {
          title: (itens: TooltipItem<"bar">[]) => {
            const b = baldes[itens[0].dataIndex];
            return b.inicio === b.fim
              ? dataBR(b.inicio)
              : `${dataBR(b.inicio)} – ${dataBR(b.fim)}`;
          },
          label: (c: TooltipItem<"bar">) => {
            const b = baldes[c.dataIndex];
            return `${brl(b.revenue)} · ${fmtInt(b.count)} ${b.count === 1 ? "venda" : "vendas"}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { autoSkip: true, maxRotation: 0, autoSkipPadding: 14 },
      },
      y: {
        beginAtZero: true,
        ticks: { callback: moneyTick, padding: 8 },
        grid: { color: "rgba(0,0,0,0.06)", drawTicks: false },
        border: { display: false },
      },
    },
  };

  return (
    <>
      <div className="section-head">
        <span className="section-title">Receita no período</span>
        <span className="section-sub">
          {baldes.length} {g === "dia" ? "dias" : "períodos"} · {dataBR(since)} – {dataBR(until)}
        </span>
        <span className="section-right">
          <span className="seg" role="group" aria-label="Agrupar a receita por">
            {OPCOES.map((o) => {
              const inerte = contagens[o.chave] < 2;
              return (
                <button
                  key={o.chave}
                  type="button"
                  className={g === o.chave ? "on" : undefined}
                  disabled={inerte}
                  aria-pressed={g === o.chave}
                  title={
                    inerte
                      ? "O período selecionado cabe inteiro em um só — escolha um intervalo maior"
                      : undefined
                  }
                  onClick={() => setG(o.chave)}
                >
                  {o.rotulo}
                </button>
              );
            })}
          </span>
        </span>
      </div>
      <div className="chart-box largo">
        <Bar data={data} options={options} />
      </div>
    </>
  );
}
