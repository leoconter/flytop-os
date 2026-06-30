import { Orbs } from "@/components/orbs";
import { PrivacyToggle } from "@/components/dashboard/privacy-toggle";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ListCard, MetricCard, StatusPill } from "@/components/dashboard/ui";
import { metrics, routes, suppliers } from "@/lib/dashboard-data";

export const metadata = {
  title: "FlyTop · maio 2026",
};

export default function DashboardPage() {
  return (
    <main className="relative min-h-screen">
      <Orbs />

      <div className="relative z-[2] mx-auto max-w-[1180px] px-6 pb-16 pt-10">
        {/* Header */}
        <header className="mb-9 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-[10px] text-[12px] font-medium uppercase tracking-[0.1em] text-text-3">
              Relatório mensal
            </p>
            <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.028em] text-text-1">
              FlyTop · maio 2026
            </h1>
            <p className="mt-[10px] text-[15px] text-text-2">
              <b className="private font-semibold text-text-1">64 vendas</b> ·
              faturamento até 11/05:{" "}
              <b className="private font-semibold text-text-1">R$ 1,32M</b>
            </p>
          </div>
          <div className="flex flex-col items-end gap-[10px]">
            <PrivacyToggle />
            <StatusPill>Tracking acima da meta</StatusPill>
          </div>
        </header>

        {/* Métricas */}
        <section className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
          {metrics.map((m) => (
            <MetricCard key={m.label} metric={m} />
          ))}
        </section>

        {/* Gráfico */}
        <section className="mb-6">
          <div className="mb-[0.9rem] flex items-baseline justify-between px-[6px]">
            <span className="text-[17px] font-semibold tracking-[-0.012em] text-text-1">
              Faturamento acumulado
            </span>
            <span className="text-[13px] text-text-2">
              maio 2026 · pace baseado em dias úteis
            </span>
          </div>
          <div className="glass px-[1.6rem] pb-[1.25rem] pt-[1.5rem]">
            <ChartLegend />
            <RevenueChart />
          </div>
        </section>

        {/* Listas */}
        <section className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-[14px]">
          <ListCard
            title="Top 3 fornecedores"
            subtitle="por receita"
            items={suppliers}
          />
          <ListCard
            title="Top 5 trechos"
            subtitle="por receita"
            items={routes}
          />
        </section>

        {/* Footer */}
        <footer className="mt-9 flex flex-wrap justify-between gap-2 border-t border-black/[0.06] px-[6px] pt-5 text-[12px] text-text-3">
          <span>Fonte: FlyTop_Maio.xlsx · dados até 11/05</span>
          <span>Atualizado em 12/05/2026</span>
        </footer>
      </div>
    </main>
  );
}

function ChartLegend() {
  return (
    <div className="mb-[1.1rem] flex flex-wrap gap-[22px] px-1">
      <LegendItem label="Realizado">
        <span className="inline-block h-[3px] w-[22px] rounded-[2px] bg-accent-blue" />
      </LegendItem>
      <LegendItem label="Projeção (pace)">
        <span className="inline-block h-[2px] w-[22px] bg-[repeating-linear-gradient(to_right,var(--accent-blue)_0,var(--accent-blue)_5px,transparent_5px,transparent_10px)] opacity-60" />
      </LegendItem>
      <LegendItem label="Necessidade">
        <span className="inline-block h-[2px] w-[22px] bg-[repeating-linear-gradient(to_right,var(--accent-orange)_0,var(--accent-orange)_5px,transparent_5px,transparent_10px)]" />
      </LegendItem>
      <LegendItem label="Meta · R$ 3,5M">
        <span className="inline-block h-[2px] w-[22px] bg-[repeating-linear-gradient(to_right,var(--accent-green)_0,var(--accent-green)_5px,transparent_5px,transparent_10px)]" />
      </LegendItem>
    </div>
  );
}

function LegendItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-[9px] text-[13px] font-medium text-text-2">
      {children}
      {label}
    </span>
  );
}
