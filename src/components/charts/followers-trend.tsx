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
 * (mensal); com props plota a série vinda da API (diária). `forecast`
 * acrescenta o trecho projetado como linha tracejada, emendada no último
 * ponto realizado.
 */
export function FollowersTrendChart({
  labels = followersTrend.labels,
  values = followersTrend.values,
  forecast,
}: {
  labels?: string[];
  values?: number[];
  forecast?: { labels: string[]; values: number[] };
}) {
  const ahead = forecast?.values.length ?? 0;
  const allLabels = [...labels, ...(forecast?.labels ?? [])];
  const realized = [...values, ...Array<number | null>(ahead).fill(null)];
  // A projeção começa no último ponto realizado para as linhas se emendarem.
  const projected = forecast
    ? [
        ...Array<number | null>(Math.max(0, values.length - 1)).fill(null),
        values[values.length - 1] ?? null,
        ...forecast.values,
      ]
    : null;

  const data: ChartData<"line", (number | null)[], string> = {
    labels: allLabels,
    datasets: [
      {
        label: "Novos seguidores",
        data: realized,
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
      ...(projected
        ? [
            {
              label: "Projeção",
              data: projected,
              borderColor: "rgba(30, 86, 184, 0.55)",
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              tension: 0,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointBackgroundColor: "rgba(30, 86, 184, 0.7)",
              pointBorderColor: "#fff",
            },
          ]
        : []),
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
          label: (c: TooltipItem<"line">) => {
            if (c.parsed.y === null) return "";
            const n = "+" + (c.parsed.y ?? 0).toLocaleString("pt-BR") + " seguidores";
            return c.datasetIndex === 1 ? `${n} (projeção)` : n;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { autoSkip: true, maxTicksLimit: 14 },
      },
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
