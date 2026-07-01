"use client";

import type { ChartData, ChartOptions, TooltipItem } from "chart.js";
import { useState } from "react";
import { Bar } from "react-chartjs-2";
import { dailyRevenue } from "@/lib/dashboard-data";
import { revenueByMonth } from "@/lib/interno-data";
import { brl, glassTooltip, moneyTick } from "./register";

type Period = "dia" | "semana" | "mes";

/** Agrega o faturamento diário em semanas de 7 dias. */
function weekly() {
  const buckets: Record<number, number> = {};
  for (const d of dailyRevenue) {
    const w = Math.floor((d.day - 1) / 7);
    buckets[w] = (buckets[w] ?? 0) + d.value;
  }
  const keys = Object.keys(buckets)
    .map(Number)
    .sort((a, b) => a - b);
  return {
    labels: keys.map((k) => `Semana ${k + 1}`),
    values: keys.map((k) => buckets[k]),
  };
}

const SERIES: Record<Period, { labels: string[]; values: number[] }> = {
  dia: {
    labels: dailyRevenue.map((d) => String(d.day)),
    values: dailyRevenue.map((d) => d.value),
  },
  semana: weekly(),
  mes: { labels: revenueByMonth.labels, values: revenueByMonth.values },
};

const TABS: { key: Period; label: string }[] = [
  { key: "dia", label: "Dia" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
];

export function RevenueByPeriodChart() {
  const [period, setPeriod] = useState<Period>("dia");
  const serie = SERIES[period];

  const data: ChartData<"bar", number[], string> = {
    labels: serie.labels,
    datasets: [
      {
        data: serie.values,
        backgroundColor: "rgba(0,122,255,0.7)",
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 46,
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
        callbacks: { label: (c: TooltipItem<"bar">) => brl(c.parsed.y ?? 0) },
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

  const label = period === "mes" ? "mês" : period;

  return (
    <div className="glass chart-card">
      <div className="section-head flush" style={{ marginBottom: 12 }}>
        <span className="section-title">Faturamento por {label}</span>
        <div className="presets">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`chip${period === t.key ? " sel" : ""}`}
              aria-pressed={period === t.key}
              onClick={() => setPeriod(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-box">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
