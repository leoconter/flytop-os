"use client";

import type { ChartData, ChartOptions, TooltipItem } from "chart.js";
import { Bar } from "react-chartjs-2";
import { timeBucketHighlight, timeBuckets } from "@/lib/jornada-data";
import { glassTooltip } from "./register";

export function JourneyDistributionChart() {
  const labels = timeBuckets.map((b) => b.label);
  const values = timeBuckets.map((b) => b.count);

  const data: ChartData<"bar", number[], string> = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: values.map((_, i) =>
          i === timeBucketHighlight
            ? "rgba(30,86,184,0.85)"
            : "rgba(30,86,184,0.25)",
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
          title: (items: TooltipItem<"bar">[]) => items[0].label + " dias",
          label: (c: TooltipItem<"bar">) => `${c.parsed.y ?? 0} compradores`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        title: {
          display: true,
          text: "dias até comprar",
          color: "rgba(94,100,112,1)",
          font: { size: 12, family: "Inter" },
          padding: { top: 6 },
        },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, padding: 8 },
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
