import type { ListItem, Metric } from "@/lib/dashboard-data";

/** Cartão de métrica (glass). Valores recebem `.private` para o blur. */
export function MetricCard({ metric }: { metric: Metric }) {
  const toneClass =
    metric.tone === "blue"
      ? "text-accent-blue"
      : metric.tone === "green"
        ? "text-accent-green-dark"
        : "text-text-1";

  return (
    <div className="glass px-[1.4rem] pb-[1.5rem] pt-[1.35rem]">
      <p className="mb-[14px] text-[13px] font-medium text-text-2">
        {metric.label}
      </p>
      <p
        className={`private text-[31px] font-semibold leading-[1.05] tracking-[-0.025em] ${toneClass}`}
      >
        {metric.value}
      </p>

      {metric.hint && (
        <p
          className={`private mt-2 text-[13px] ${
            metric.hintPositive
              ? "font-semibold text-accent-green-dark"
              : "text-text-3"
          }`}
        >
          {metric.hint}
        </p>
      )}

      {typeof metric.barPct === "number" && (
        <div className="private relative mt-4 h-[6px] overflow-hidden rounded-[var(--radius-pill)] bg-black/[0.06]">
          <div
            className="h-full rounded-[var(--radius-pill)] bg-[linear-gradient(90deg,var(--accent-blue),#5AB4FF)] [box-shadow:0_0_8px_rgba(0,122,255,0.4)]"
            style={{ width: `${metric.barPct}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** Cartão de lista (Top fornecedores / trechos). */
export function ListCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: ListItem[];
}) {
  return (
    <div className="glass px-[1.6rem] py-[1.5rem]">
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-[17px] font-semibold tracking-[-0.012em] text-text-1">
          {title}
        </span>
        <span className="text-[13px] text-text-2">{subtitle}</span>
      </div>
      <div className="flex flex-col gap-[10px]">
        {items.map((item, i) => (
          <ListRow key={item.name} rank={i + 1} item={item} />
        ))}
      </div>
    </div>
  );
}

function ListRow({ rank, item }: { rank: number; item: ListItem }) {
  return (
    <div className="flex items-center gap-[14px] rounded-[var(--radius-md)] border border-white/60 bg-[rgba(255,255,255,0.55)] px-[14px] py-[13px] transition-[background,transform] duration-200 hover:-translate-y-px hover:bg-[rgba(255,255,255,0.75)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.03)]">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(0,122,255,0.25)] bg-[rgba(0,122,255,0.12)] text-[12px] font-semibold text-accent-blue [box-shadow:inset_0_1px_0_rgba(255,255,255,0.7)]">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-text-1 ${
            item.mono
              ? "font-mono text-[13px] tracking-[0.02em]"
              : "text-[14.5px] font-medium"
          }`}
        >
          {item.name}
        </p>
        <p className="private mt-[3px] text-[12px] text-text-3">{item.meta}</p>
      </div>
      <span className="private whitespace-nowrap text-[14.5px] font-semibold tracking-[-0.01em] text-text-1">
        {item.value}
      </span>
    </div>
  );
}

/** Pílula de status (ex.: "Tracking acima da meta"). */
export function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[9px] rounded-[var(--radius-pill)] border border-[rgba(52,199,89,0.3)] bg-[rgba(52,199,89,0.16)] px-4 py-[9px] text-[13px] font-medium text-accent-green-dark backdrop-blur-[20px] backdrop-saturate-150 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.04)]">
      <span className="h-[6px] w-[6px] rounded-full bg-accent-green [box-shadow:0_0_8px_rgba(52,199,89,0.8)]" />
      {children}
    </span>
  );
}
