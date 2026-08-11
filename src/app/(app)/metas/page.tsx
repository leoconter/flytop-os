import { Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import type { Metric } from "@/lib/dashboard-data";
import { PARAM_FROM, PARAM_TO, resolveRange } from "@/lib/date-range";
import { fmtMoney, fmtMoneyCompact } from "@/lib/meta/ads";
import { fmtInt } from "@/lib/meta/instagram";
import { getGoalsMonth } from "@/lib/monde/goals";
import { saveGoal } from "./actions";

export const metadata = { title: "FlyTop OS · Metas de Venda" };

const MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function monthLabel(key: string): string {
  return `${MES[Number(key.slice(5, 7)) - 1]} de ${key.slice(0, 4)}`;
}

/** Barra de progresso da meta, verde ao bater. */
function GoalBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="muted">—</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 150 }}>
      <span className={`metric-bar${pct >= 100 ? " green" : ""}`} style={{ flex: 1, marginTop: 0 }}>
        <div style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
      <b style={{ fontSize: 13, minWidth: 46, textAlign: "right" }}>
        {pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
      </b>
    </span>
  );
}

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ [PARAM_FROM]?: string; [PARAM_TO]?: string }>;
}) {
  // A tela é mensal: usa o mês do fim do período selecionado no cabeçalho.
  const range = resolveRange(await searchParams);
  const data = await getGoalsMonth(range.until);

  if (!data) {
    return (
      <>
        <PageHead
          title="Metas de Venda"
          sub="Cadastro da meta mensal da agência e por vendedor"
          right={<Pill tone="blue">Aguardando conexão</Pill>}
        />
        <div className="note-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="nt">
            O banco ainda não respondeu. Confira as credenciais do Supabase.
          </div>
        </div>
      </>
    );
  }

  const label = monthLabel(data.month);
  const falta = data.agencyGoal ? data.agencyGoal - data.revenue : null;

  const metrics: Metric[] = [
    {
      label: "Meta da agência",
      value: data.agencyGoal ? fmtMoneyCompact(data.agencyGoal) : "não definida",
      small: !data.agencyGoal,
      hint: label,
      privateValue: true,
      info: "Meta de faturamento do mês. É ela que alimenta a linha de meta e a projeção do Dashboard Geral.",
    },
    {
      label: "Realizado",
      value: fmtMoneyCompact(data.revenue),
      hint: `${fmtInt(data.salesCount)} vendas no mês`,
      privateValue: true,
      info: "Faturamento das vendas do mês, sem as canceladas.",
    },
    {
      label: "% da meta",
      value: data.pct !== null ? `${data.pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—",
      tone: data.pct !== null && data.pct >= 100 ? "green" : "blue",
      bar: data.pct !== null ? { pct: Math.min(100, data.pct), green: data.pct >= 100 } : undefined,
      privateValue: true,
    },
    {
      label: falta !== null && falta > 0 ? "Falta para a meta" : "Acima da meta",
      value: falta !== null ? fmtMoneyCompact(Math.abs(falta)) : "—",
      tone: falta !== null && falta <= 0 ? "green" : undefined,
      hint: data.agencyGoal ? label : "defina a meta abaixo",
      privateValue: true,
    },
  ];

  return (
    <>
      <PageHead
        title="Metas de Venda"
        sub={`Cadastro da meta da agência e por vendedor · ${label}`}
        right={<Pill tone="blue">Acesso restrito</Pill>}
      />

      <Metrics metrics={metrics} />

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Meta da agência"
            sub={`vale para ${label}`}
            flush
          />
          <form
            action={saveGoal}
            style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 14, flexWrap: "wrap" }}
          >
            <input type="hidden" name="month" value={data.month} />
            <div className="field" style={{ maxWidth: 240 }}>
              <label htmlFor="agency-goal">Meta de faturamento (R$)</label>
              <input
                id="agency-goal"
                className="input"
                name="amount"
                inputMode="decimal"
                placeholder="3.500.000"
                defaultValue={data.agencyGoal ?? ""}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Salvar meta
            </button>
            <p className="metric-hint" style={{ marginLeft: "auto", maxWidth: 320 }}>
              Deixe em branco e salve para remover a meta do mês. Para outro mês,
              troque o período no seletor do topo.
            </p>
          </form>
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Metas por vendedor"
            sub={
              data.sellersGoalTotal > 0
                ? `soma das individuais: ${fmtMoney(data.sellersGoalTotal)}`
                : "nenhuma meta individual definida"
            }
            flush
          />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th className="r">Realizado</th>
                  <th className="r">Vendas</th>
                  <th style={{ width: 190 }}>Progresso</th>
                  <th style={{ width: 230 }}>Meta (R$)</th>
                </tr>
              </thead>
              <tbody>
                {data.sellers.map((s) => {
                  const pct = s.amount && s.amount > 0 ? (s.revenue / s.amount) * 100 : null;
                  return (
                    <tr key={s.sellerId}>
                      <td>
                        {s.name}
                        {s.active === false && (
                          <span className="badge gray" style={{ marginLeft: 8 }}>
                            inativo
                          </span>
                        )}
                      </td>
                      <td className="r private">{fmtMoney(s.revenue)}</td>
                      <td className="r">{fmtInt(s.salesCount)}</td>
                      <td>
                        <GoalBar pct={pct} />
                      </td>
                      <td>
                        <form
                          action={saveGoal}
                          style={{ display: "flex", gap: 8, alignItems: "center" }}
                        >
                          <input type="hidden" name="month" value={data.month} />
                          <input type="hidden" name="sellerId" value={s.sellerId} />
                          <input
                            className="input"
                            name="amount"
                            inputMode="decimal"
                            placeholder="sem meta"
                            defaultValue={s.amount ?? ""}
                            aria-label={`Meta de ${s.name}`}
                            style={{ maxWidth: 130 }}
                          />
                          <button type="submit" className="btn btn-ghost btn-sm">
                            Salvar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="note-box blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div className="nt">
          A meta é <b>configuração da plataforma</b> — o Monde não tem esse
          conceito, então ela vive aqui e vale por mês. O <b>Dashboard Geral</b>{" "}
          lê esta meta para desenhar a linha de meta, a necessidade diária e a
          projeção de fechamento. O realizado de cada vendedor vem das vendas do
          ERP, cruzado pelo nome.
        </div>
      </div>
    </>
  );
}
