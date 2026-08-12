"use client";

import type {
  ChartData,
  ChartOptions,
  ScriptableContext,
  TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { brl, glassTooltip, moneyTick } from "./register";

function fillGradient(ctx: ScriptableContext<"line">) {
  const { chart } = ctx;
  const { ctx: c, chartArea } = chart;
  if (!chartArea) return "rgba(30,86,184,0)";
  const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, "rgba(30, 86, 184, 0.22)");
  g.addColorStop(1, "rgba(30, 86, 184, 0)");
  return g;
}

/** Recebe a série pronta do servidor: rótulos "AAAA-MM-DD" e acumulado. */
export function VendorEvolutionChart({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const dias = labels.map((iso) => Number(iso.slice(8, 10)));
  const data: ChartData<"line", number[], number> = {
    labels: dias,
    datasets: [
      {
        label: "Acumulado",
        data: values,
        borderColor: "#1E56B8",
        borderWidth: 2.5,
        backgroundColor: fillGradient,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...glassTooltip,
        callbacks: {
          title: (items: TooltipItem<"line">[]) => "Dia " + items[0].label,
          label: (c: TooltipItem<"line">) => brl(c.parsed.y ?? 0),
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { callback: moneyTick, padding: 8 },
        grid: { color: "rgba(0,0,0,0.06)", drawTicks: false },
        border: { display: false },
      },
    },
  };

  return (
    <div className="chart-box sm">
      <Line data={data} options={options} />
    </div>
  );
}
