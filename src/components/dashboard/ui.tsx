import type { ReactNode } from "react";
import type { ListItem, Metric } from "@/lib/dashboard-data";
import { MetricCard } from "./metric-card";

export { MetricCard };

function cx(...parts: (string | false | undefined | null)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Cabeçalho de página (eyebrow + título + subtítulo) com slot à direita. */
export function PageHead({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow?: string;
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Pílula de status. tone "green" (padrão) ou "blue". */
export function Pill({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "blue";
}) {
  return (
    <span className={cx("pill", tone === "blue" && "blue")}>
      <span className="pd" />
      {children}
    </span>
  );
}

/** Cabeçalho de seção (título + subtítulo). */
export function SectionHead({
  title,
  sub,
  flush,
  right,
}: {
  title: string;
  sub?: string;
  flush?: boolean;
  /** Ação à direita do título — ex.: "Adicionar usuário". */
  right?: ReactNode;
}) {
  return (
    <div className={cx("section-head", flush && "flush")}>
      <span className="section-title">{title}</span>
      {sub && <span className="section-sub">{sub}</span>}
      {right && <span className="section-right">{right}</span>}
    </div>
  );
}

/** Grade de métricas. */
export function Metrics({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="metrics">
      {metrics.map((m) => (
        <MetricCard key={m.label} metric={m} />
      ))}
    </section>
  );
}

/**
 * Cartão de lista (Top fornecedores / trechos), com rank automático.
 * `privateValue` (padrão true) borra o valor no modo privacidade — desligue
 * para valores não financeiros (ex.: contagem de vendas).
 */
export function ListCard({
  title,
  subtitle,
  items,
  privateValue = true,
}: {
  title: string;
  subtitle: string;
  items: ListItem[];
  privateValue?: boolean;
}) {
  return (
    <div className="glass card">
      <SectionHead title={title} sub={subtitle} flush />
      <div className="list" style={{ marginTop: 14 }}>
        {items.map((item, i) => (
          <div className="list-row" key={item.name}>
            <span className="rank">{i + 1}</span>
            <div className="list-main">
              <div className={cx("list-name", item.mono && "mono")}>
                {item.name}
              </div>
              <div className="list-meta">{item.meta}</div>
            </div>
            <div className={cx("list-value", privateValue && "private")}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Badge colorida (status em tabelas). */
export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "green" | "orange" | "blue" | "gray";
}) {
  return (
    <span className={cx("badge", tone)}>
      <span className="bd" />
      {children}
    </span>
  );
}
