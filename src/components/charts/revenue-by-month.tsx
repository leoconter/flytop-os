"use client";

import type { ChartData, ChartOptions, TooltipItem } from "chart.js";
import { Bar } from "react-chartjs-2";
import { revenueByMonth } from "@/lib/interno-data";
import { brl, glassTooltip, moneyTick } from "./register";

export function RevenueByMonthChart() {
  const { labels, values, highlightIndex } = revenueByMonth;

  const data: ChartData<"bar", number[], string> = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: values.map((_, i) =>
          i === highlightIndex ? "rgba(30,86,184,0.85)" : "rgba(30,86,184,0.25)",
        ),
        borderRadius: 8,
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
          label: (c: TooltipItem<"bar">) =>
            brl(c.parsed.y ?? 0) + (c.label === "mai*" ? " (parcial)" : ""),
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
      <Bar data={data} options={options} />
    </div>
  );
}
