"use client";

import type { ChartData, ChartOptions, TooltipItem } from "chart.js";
import { Chart } from "react-chartjs-2";
import { adsEfficiency } from "@/lib/ads-data";
import { brl, glassTooltip, moneyTick } from "./register";

/**
 * Investimento (barra, eixo esq.) × CPA (linha, eixo dir.).
 * Sem props usa os dados ilustrativos; com props plota a série da API.
 */
export function AdsEfficiencyChart({
  labels = adsEfficiency.labels,
  investment = adsEfficiency.investment,
  cpa = adsEfficiency.cpa,
  cpaLabel = "CPA final",
}: {
  labels?: string[];
  investment?: number[];
  cpa?: (number | null)[];
  cpaLabel?: string;
} = {}) {
  const data: ChartData<"bar" | "line", (number | null)[], string> = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Investimento",
        data: investment,
        backgroundColor: "rgba(30,86,184,0.7)",
        borderRadius: 8,
        borderSkipped: false,
        yAxisID: "y",
        order: 2,
      },
      {
        type: "line",
        label: cpaLabel,
        data: cpa,
        spanGaps: true,
        borderColor: "#B0761E",
        borderWidth: 2.5,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: "#B0761E",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        yAxisID: "y1",
        order: 1,
      },
    ],
  };

  const options: ChartOptions<"bar" | "line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...glassTooltip,
        callbacks: {
          label: (c: TooltipItem<"bar" | "line">) =>
            c.dataset.label === "Investimento"
              ? "Investimento: " + brl(c.parsed.y ?? 0)
              : `${c.dataset.label}: R$ ` +
                (c.parsed.y ?? 0).toFixed(2).replace(".", ","),
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
        position: "left",
        ticks: { callback: moneyTick, padding: 8 },
        grid: { color: "rgba(0,0,0,0.06)", drawTicks: false },
        border: { display: false },
      },
      y1: {
        beginAtZero: true,
        position: "right",
        grid: { display: false },
        border: { display: false },
        ticks: {
          padding: 8,
          callback: (v) =>
            "R$ " + (typeof v === "number" ? v : parseFloat(v)).toFixed(2).replace(".", ","),
        },
      },
    },
  };

  return (
    <div className="chart-box">
      <Chart type="bar" data={data} options={options} />
    </div>
  );
}
