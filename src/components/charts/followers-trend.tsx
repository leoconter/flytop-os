"use client";

import type {
  ChartData,
  ChartOptions,
  ScriptableContext,
  TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { followersTrend } from "@/lib/social-data";
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

/**
 * Tendência de novos seguidores. Sem props usa os dados ilustrativos
 * (mensal); com props plota a série vinda da API (diária, últimos 30 dias).
 */
export function FollowersTrendChart({
  labels = followersTrend.labels,
  values = followersTrend.values,
}: {
  labels?: string[];
  values?: number[];
}) {
  const data: ChartData<"line", number[], string> = {
    labels,
    datasets: [
      {
        label: "Novos seguidores",
        data: values,
        borderColor: "#1E56B8",
        borderWidth: 2.5,
        backgroundColor: fillGradient,
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: "#1E56B8",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
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
          label: (c: TooltipItem<"line">) =>
            "+" + (c.parsed.y ?? 0).toLocaleString("pt-BR") + " seguidores",
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        beginAtZero: true,
        ticks: {
          padding: 8,
          callback: (v) =>
            (typeof v === "number" ? v : parseFloat(v)).toLocaleString("pt-BR"),
        },
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
