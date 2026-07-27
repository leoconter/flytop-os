"use client";

import type { ChartData, ChartOptions, TooltipItem } from "chart.js";
import { Bar } from "react-chartjs-2";
import { communityFlow } from "@/lib/comunidade-data";
import { glassTooltip } from "./register";

export function CommunityFlowChart() {
  const { labels, entradas, saidas } = communityFlow;

  const data: ChartData<"bar", number[], string> = {
    labels,
    datasets: [
      {
        label: "Entradas",
        data: entradas,
        backgroundColor: "rgba(30,122,70,0.8)",
        borderRadius: 5,
        borderSkipped: false,
      },
      {
        label: "Saídas",
        data: saidas.map((v) => -v),
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
          label: (c: TooltipItem<"bar">) =>
            c.dataset.label + ": " + Math.abs(c.parsed.y ?? 0),
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
