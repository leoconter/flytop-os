"use client";

import type { ChartData, ChartOptions, TooltipItem } from "chart.js";
import { Chart } from "react-chartjs-2";
import { adsEfficiency } from "@/lib/ads-data";
import { brl, glassTooltip, moneyTick } from "./register";

/** Investimento (barra, eixo esq.) × CPA final por membro (linha, eixo dir.). */
export function AdsEfficiencyChart() {
  const { labels, investment, cpa } = adsEfficiency;

  const data: ChartData<"bar" | "line", number[], string> = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Investimento",
        data: investment,
        backgroundColor: "rgba(0,122,255,0.7)",
        borderRadius: 8,
        borderSkipped: false,
        yAxisID: "y",
        order: 2,
      },
      {
        type: "line",
        label: "CPA final",
        data: cpa,
        borderColor: "#FF9500",
        borderWidth: 2.5,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: "#FF9500",
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
              : "CPA final: R$ " + (c.parsed.y ?? 0).toFixed(2).replace(".", ","),
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
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
