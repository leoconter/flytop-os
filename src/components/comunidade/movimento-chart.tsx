"use client";

import type { ChartData, ChartOptions, TooltipItem } from "chart.js";
import { Bar } from "react-chartjs-2";
import { glassTooltip } from "@/components/charts/register";
import type { Movimento } from "@/lib/whatsapp/comunidade";

/**
 * Entradas para cima, saídas para baixo.
 *
 * As duas barras existem separadas de propósito: um gráfico só de saldo
 * esconderia um dia de 240 entradas e 97 saídas atrás do mesmo "+143" de um dia
 * parado com 143 entradas e nenhuma saída — e são situações bem diferentes.
 */
export function MovimentoChart({ dados }: { dados: Movimento[] }) {
  const labels = dados.map((d) => {
    const [, m, dia] = d.dia.split("-");
    return `${dia}/${m}`;
  });

  const data: ChartData<"bar", number[], string> = {
    labels,
    datasets: [
      {
        label: "Entradas",
        data: dados.map((d) => d.entradas),
        backgroundColor: "rgba(30,122,70,0.8)",
        borderRadius: 5,
        borderSkipped: false,
      },
      {
        label: "Saídas",
        data: dados.map((d) => -d.saidas),
        backgroundColor: "rgba(179,54,44,0.75)",
        borderRadius: 5,
        borderSkipped: false,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...glassTooltip,
        callbacks: {
          // O valor das saídas é negativo só para desenhar para baixo; no
          // texto ele volta a ser a quantidade que a pessoa espera ler.
          label: (c: TooltipItem<"bar">) =>
            `${c.dataset.label}: ${Math.abs(c.parsed.y ?? 0)}`,
          footer: (itens: TooltipItem<"bar">[]) => {
            const e = itens.find((i) => i.dataset.label === "Entradas")?.parsed.y ?? 0;
            const s = Math.abs(itens.find((i) => i.dataset.label === "Saídas")?.parsed.y ?? 0);
            const saldo = e - s;
            return `Saldo: ${saldo > 0 ? "+" : ""}${saldo}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, stacked: true },
      y: {
        stacked: true,
        grid: { color: "rgba(0,0,0,0.06)", drawTicks: false },
        border: { display: false },
        ticks: { callback: (v) => Math.abs(Number(v)), padding: 8 },
      },
    },
  };

  return (
    <div className="chart-box">
      <Bar data={data} options={options} />
    </div>
  );
}
