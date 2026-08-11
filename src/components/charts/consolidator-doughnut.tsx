"use client";

import type { ChartData, ChartOptions, TooltipItem } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { consolidators } from "@/lib/interno-data";
import { glassTooltip } from "./register";

/** Sem props usa os dados ilustrativos; com props, as fatias do banco. */
export function ConsolidatorDoughnut({
  slices = consolidators,
}: {
  slices?: { label: string; value: number; color: string }[];
} = {}) {
  const data: ChartData<"doughnut", number[], string> = {
    labels: slices.map((c) => c.label),
    datasets: [
      {
        data: slices.map((c) => c.value),
        backgroundColor: slices.map((c) => c.color),
        borderColor: "rgba(255, 255, 255, 0.6)",
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          boxWidth: 9,
          boxHeight: 9,
          usePointStyle: true,
          pointStyle: "circle",
          padding: 12,
          font: { size: 12 },
        },
      },
      tooltip: {
        ...glassTooltip,
        callbacks: {
          label: (c: TooltipItem<"doughnut">) => `${c.label}: ${c.parsed}%`,
        },
      },
    },
  };

  return (
    <div className="chart-box sm">
      <Doughnut data={data} options={options} />
    </div>
  );
}
