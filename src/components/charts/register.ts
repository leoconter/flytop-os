"use client";

/**
 * Registro central dos elementos do Chart.js usados pelos gráficos da
 * plataforma. Importe este módulo (por efeito colateral) em cada componente de
 * gráfico. Registrar o mesmo elemento mais de uma vez é seguro.
 */
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  ArcElement,
  DoughnutController,
  Filler,
  Tooltip,
  Legend,
);

/** Tooltip glass branco, padrão da plataforma. */
export const glassTooltip = {
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  titleColor: "rgba(94, 100, 112, 1)",
  bodyColor: "#171b22",
  borderColor: "rgba(0, 0, 0, 0.08)",
  borderWidth: 1,
  padding: 12,
  cornerRadius: 12,
  displayColors: false,
  titleFont: { size: 12, weight: 500 as const, family: "Inter" },
  bodyFont: { size: 14, weight: 600 as const, family: "Inter" },
} as const;

/** Formata número como BRL inteiro. */
export const brl = (v: number) =>
  "R$ " + Math.round(v).toLocaleString("pt-BR");

/**
 * Eixo Y monetário (R$ Xk / R$ X,XM). Abaixo de 10k mantém uma casa decimal
 * — em escala diária, arredondar para "k" repetiria o mesmo rótulo em vários
 * traços (R$ 1k, R$ 1k, R$ 1k…).
 */
export function moneyTick(v: number | string) {
  const n = typeof v === "number" ? v : parseFloat(v);
  if (n === 0) return "0";
  if (n >= 1_000_000)
    return "R$ " + (n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "M";
  if (n >= 10_000) return "R$ " + Math.round(n / 1000) + "k";
  if (n >= 1_000)
    return "R$ " + (n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k";
  return "R$ " + Math.round(n).toLocaleString("pt-BR");
}
