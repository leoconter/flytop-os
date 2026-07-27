"use client";

import type {
  ChartData,
  ChartOptions,
  ScriptableContext,
  TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { monthlyAvgDays } from "@/lib/jornada-data";
import { glassTooltip } from "./register";

function fillGradient(ctx: ScriptableContext<"line">) {
  const { chart } = ctx;
  const { ctx: c, chartArea } = chart;
  if (!chartArea) return "rgba(30,86,184,0)";
  const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, "rgba(30, 86, 184, 0.22)");
  g.addColorStop(1, "rgba(30, 86, 184, 0)");
  return g;
}

const dayTick = (v: number | string) =>
  (typeof v === "number" ? v : parseFloat(v)) + "d";

export function JourneyMonthlyChart() {
  const data: ChartData<"line", number[], string> = {
    labels: monthlyAvgDays.labels,
    datasets: [
      {
        label: "Tempo médio",
        data: monthlyAvgDays.values,
        borderColor: "#1E56B8",
        borderWidth: 2.5,
        backgroundColor: fillGradient,
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#1E56B8",
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
          label: (c: TooltipItem<"line">) => `${c.parsed.y ?? 0} dias`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { callback: dayTick, padding: 8, stepSize: 10 },
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
