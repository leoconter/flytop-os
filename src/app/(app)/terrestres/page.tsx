import { Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import type { Metric } from "@/lib/dashboard-data";
import { formatRange, PARAM_FROM, PARAM_TO, resolveRange } from "@/lib/date-range";
import { fmtMoney, fmtMoneyCompact } from "@/lib/meta/ads";
import { fmtInt } from "@/lib/meta/instagram";
import { getLandByType, getLandItems, getLandSuppliers } from "@/lib/monde/land";

export const metadata = { title: "FlyTop OS · Produtos Terrestres" };

export const revalidate = 3600;

/** "2026-09-10" → "10/09" */
const d = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

/** Unidade da coluna de quantidade muda conforme o produto. */
function unitLabel(type: string, units: number | null): string {
  if (!units) return "—";
  if (type === "hotel") return `${units} ${units === 1 ? "diária" : "diárias"}`;
  if (type === "car_rental") return `${units} ${units === 1 ? "dia" : "dias"}`;
  return String(units);
}

export default async function TerrestresPage({
  searchParams,
}: {
  searchParams: Promise<{ [PARAM_FROM]?: string; [PARAM_TO]?: string }>;
}) {
  const range = resolveRange(await searchParams);
  const periodLabel = formatRange(range);

  const [byType, suppliers, items] = await Promise.all([
    getLandByType(range),
    getLandSuppliers(range),
    getLandItems(range),
  ]);

  if (!byType) {
    return (
      <>
        <PageHead
          title="Produtos Terrestres"
          sub={`Hospedagem, carro, seguro e pacotes · ${periodLabel}`}
          right={<Pill tone="blue">Sem terrestre no período</Pill>}
        />
        <div className="note-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="nt">
            Nenhum produto terrestre vendido neste período — ou a carga do Monde
            ainda não rodou. Tente um intervalo maior no seletor do cabeçalho.
          </div>
        </div>
      </>
    );
  }

  const { types, totals } = byType;
  const topType = types[0];

  const metrics: Metric[] = [
    {
      label: "Receita terrestre",
      value: fmtMoneyCompact(totals.revenue),
      hint: `${fmtInt(totals.items)} itens em ${fmtInt(totals.salesCount)} vendas`,
      privateValue: true,
      info: "Soma do valor cobrado do cliente nos produtos que não são passagem aérea.",
    },
    {
      label: "Comissão",
      value: fmtMoneyCompact(totals.commission),
      tone: "green",
      hint:
        totals.revenue > 0
          ? `${((totals.commission / totals.revenue) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da receita`
          : "sem receita no período",
      privateValue: true,
      info: "Comissão registrada nos itens terrestres. Diferente do aéreo, aqui ela costuma vir preenchida.",
    },
    {
      label: "Ticket por item",
      value: fmtMoney(totals.items > 0 ? totals.revenue / totals.items : 0),
      hint: "média por produto vendido",
      privateValue: true,
      info: "Receita terrestre dividida pelo número de itens.",
    },
    {
      label: "Produto líder",
      value: topType?.label ?? "—",
      small: true,
      hint: topType ? `${fmtMoneyCompact(topType.revenue)} em ${fmtInt(topType.items)} itens` : undefined,
      info: "Tipo de produto terrestre com maior receita no período.",
    },
  ];

  return (
    <>
      <PageHead
        title="Produtos Terrestres"
        sub={`Hospedagem, carro, seguro e pacotes · ${periodLabel}`}
      />

      <Metrics metrics={metrics} />

      <div className="section">
        <div className="glass card">
          <SectionHead title="Por tipo de produto" sub="receita no período" flush />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="r">Itens</th>
                  <th className="r">Vendas</th>
                  <th className="r">Receita</th>
                  <th className="r">Comissão</th>
                  <th className="r">Participação</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.productType}>
                    <td>{t.label}</td>
                    <td className="r">{fmtInt(t.items)}</td>
                    <td className="r">{fmtInt(t.salesCount)}</td>
                    <td className="r private">{fmtMoney(t.revenue)}</td>
                    <td className="r private">{fmtMoney(t.commission)}</td>
                    <td className="r">
                      {totals.revenue > 0
                        ? ((t.revenue / totals.revenue) * 100).toLocaleString("pt-BR", {
                            maximumFractionDigits: 1,
                          })
                        : "0"}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {suppliers && suppliers.length > 0 && (
        <div className="section">
          <div className="glass card">
            <SectionHead title="Fornecedores" sub="por receita no período" flush />
            <div className="list" style={{ marginTop: 14 }}>
              {suppliers.map((s, i) => (
                <div className="list-row" key={s.name}>
                  <span className="rank">{i + 1}</span>
                  <div className="list-main">
                    <div className="list-name">{s.name}</div>
                    <div className="list-meta">
                      {s.types.join(" · ")} — {fmtInt(s.items)}{" "}
                      {s.items === 1 ? "item" : "itens"}
                    </div>
                  </div>
                  <div className="list-value private">
                    {fmtMoney(s.revenue)}
                    <small>
                      {s.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="section">
          <div className="glass card">
            <SectionHead
              title="Itens vendidos"
              sub={`${items.length} mais recentes`}
              flush
            />
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Venda</th>
                    <th>Produto</th>
                    <th>Descrição</th>
                    <th>Cliente</th>
                    <th>Período</th>
                    <th className="r">Qtd.</th>
                    <th className="r">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <span className="mono-cell">{d(it.saleDate)}</span>
                        <small className="muted" style={{ display: "block", fontSize: 11.5 }}>
                          nº {it.saleNumber}
                        </small>
                      </td>
                      <td>{it.label}</td>
                      <td>
                        {it.title ?? it.supplierName ?? "—"}
                        {it.bookingRef && (
                          <small
                            className="muted mono-cell"
                            style={{ display: "block", fontSize: 11.5 }}
                          >
                            {it.bookingRef}
                          </small>
                        )}
                      </td>
                      <td>{it.customer ?? "—"}</td>
                      <td className="mono-cell">
                        {it.startDate ? `${d(it.startDate)} → ${d(it.endDate)}` : "—"}
                      </td>
                      <td className="r">{unitLabel(it.productType, it.units)}</td>
                      <td className="r private">{fmtMoney(it.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="note-box blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div className="nt">
          <b>Por que esta tela existe:</b> as vendas de hotel, carro e seguro não
          têm trecho aéreo, então ficavam invisíveis nas telas por rota,
          companhia e classe. O faturamento total sempre esteve certo — o que
          faltava era enxergar de onde vinha essa parte dele.
        </div>
      </div>
    </>
  );
}
