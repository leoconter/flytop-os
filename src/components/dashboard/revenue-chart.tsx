"use client";

import {
  CategoryScale,
  type ChartData,
  type ChartOptions,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  type Plugin,
  PointElement,
  type ScriptableContext,
  type ScriptableScaleContext,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  buildSeries,
  DAYS_IN_MAY,
  isBusinessDay,
  META,
} from "@/lib/dashboard-data";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

const series = buildSeries();

/** Bandas verticais sutis atrás das colunas de dias não úteis. */
const weekendBandPlugin: Plugin<"line"> = {
  id: "weekendBand",
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    // Escala de categoria com N rótulos: o espaçamento entre ticks adjacentes é
    // largura/(N-1). Cada banda tem a largura de um slot, centrada no dia.
    const tickSpacing = (xScale.right - xScale.left) / (DAYS_IN_MAY - 1);
    const halfSlot = tickSpacing / 2;
    ctx.save();
    ctx.fillStyle = "rgba(15, 27, 44, 0.04)";
    for (let d = 1; d <= DAYS_IN_MAY; d++) {
      if (!isBusinessDay(d)) {
        const centerX = xScale.getPixelForTick(d - 1);
        ctx.fillRect(
          centerX - halfSlot,
          chartArea.top,
          tickSpacing,
          chartArea.bottom - chartArea.top,
        );
      }
    }
    ctx.restore();
  },
};

function makeFillGradient(ctx: ScriptableContext<"line">) {
  const { chart } = ctx;
  const { ctx: c, chartArea } = chart;
  if (!chartArea) return "rgba(30,86,184,0)";
  const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, "rgba(30, 86, 184, 0.22)");
  g.addColorStop(0.7, "rgba(30, 86, 184, 0.05)");
  g.addColorStop(1, "rgba(30, 86, 184, 0)");
  return g;
}

export function RevenueChart() {
  const data: ChartData<"line", (number | null)[], number> = {
    labels: series.labels,
    datasets: [
      {
        label: "Realizado",
        data: series.cumulative,
        borderColor: "#1E56B8",
        borderWidth: 2.5,
        backgroundColor: makeFillGradient,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#1E56B8",
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: "#1E56B8",
        pointHoverBorderColor: "#FFFFFF",
        spanGaps: false,
        order: 4,
      },
      {
        label: "Projeção (pace)",
        data: series.pace,
        borderColor: "rgba(30, 86, 184, 0.55)",
        borderWidth: 2,
        borderDash: [6, 6],
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: "rgba(30, 86, 184, 0.7)",
        pointHoverBorderColor: "#FFFFFF",
        spanGaps: false,
        order: 3,
      },
      {
        label: "Meta",
        data: series.metaLine,
        borderColor: "rgba(30, 122, 70, 0.8)",
        borderWidth: 2,
        borderDash: [6, 6],
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        order: 1,
      },
      {
        label: "Necessidade",
        data: series.necessity,
        borderColor: "rgba(176, 118, 30, 0.85)",
        borderWidth: 2,
        borderDash: [6, 6],
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: "rgba(176, 118, 30, 1)",
        pointHoverBorderColor: "#FFFFFF",
        order: 2,
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
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "rgba(94, 100, 112, 1)",
        bodyColor: "#171b22",
        footerColor: "rgba(23, 94, 55, 0.95)",
        borderColor: "rgba(0, 0, 0, 0.08)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
        titleFont: { size: 12, weight: 500, family: "Inter" },
        bodyFont: { size: 14, weight: 600, family: "Inter" },
        footerFont: { size: 12, weight: 600, family: "Inter" },
        // esconde a linha plana da meta (datasetIndex 2) do tooltip
        filter: (item: TooltipItem<"line">) => item.datasetIndex !== 2,
        callbacks: {
          title: (items: TooltipItem<"line">[]) =>
            "Dia " + items[0].label + " de maio",
          label: (c: TooltipItem<"line">) => {
            let prefix: string;
            if (c.datasetIndex === 0) prefix = "Realizado: ";
            else if (c.datasetIndex === 1) prefix = "Projeção: ";
            else if (c.datasetIndex === 3) prefix = "Necessidade: ";
            else return "";
            const y = c.parsed.y;
            if (y == null) return "";
            return prefix + "R$ " + Math.round(y).toLocaleString("pt-BR");
          },
          footer: (items: TooltipItem<"line">[]) =>
            Math.round(((items[0].parsed.y ?? 0) / META) * 100) + "% da meta",
        },
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          font: { size: 10, family: "Inter" },
          color: (ctx: ScriptableScaleContext) => {
            const day = parseInt(String(ctx.tick.label), 10);
            return !isNaN(day) && isBusinessDay(day)
              ? "rgba(0,0,0,0.5)"
              : "rgba(0,0,0,0.22)";
          },
        },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        suggestedMax: META * 1.2,
        ticks: {
          callback: (v: number | string) => {
            const n = typeof v === "number" ? v : parseFloat(v);
            if (n === 0) return "0";
            return n >= 1_000_000
              ? "R$ " + (n / 1_000_000).toFixed(1) + "M"
              : "R$ " + (n / 1000).toFixed(0) + "k";
          },
          font: { size: 10, family: "Inter" },
          color: "rgba(0,0,0,0.45)",
          padding: 8,
        },
        grid: { color: "rgba(0,0,0,0.06)", drawTicks: false },
        border: { display: false },
      },
    },
  };

  return (
    <div className="chart-box">
      <Line
        data={data}
        options={options}
        plugins={[weekendBandPlugin]}
        aria-label="Faturamento acumulado de maio de 2026 com projeção"
      />
    </div>
  );
}
