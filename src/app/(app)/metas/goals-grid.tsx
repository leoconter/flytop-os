"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { GoalsYear } from "@/lib/monde/goals";
import { saveGoalsYear } from "./actions";

const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const fmtBR = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** "650000" → "650.000". Vazio continua vazio. */
function toInput(n: number | null): string {
  return n === null ? "" : fmtBR.format(n);
}

/** Lê o que a pessoa digitou, aceitando ponto de milhar e vírgula decimal. */
function parse(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

/**
 * O rótulo não muda: o botão é sempre "Salvar". Sem alteração ele fica apagado
 * e inerte — o estado se lê pela aparência, não por um texto que se reescreve.
 */
function SaveButton({ dirty }: { dirty: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-primary"
      disabled={pending || dirty === 0}
      title={dirty === 0 ? "Nenhuma alteração para salvar" : `${dirty} alteração(ões) pendente(s)`}
    >
      {pending ? "Salvando…" : "Salvar"}
    </button>
  );
}

export function GoalsGrid({ data }: { data: GoalsYear }) {
  // Estado só do que foi digitado; o resto vem do servidor.
  const inicial = useMemo(() => {
    const m: Record<string, string> = {};
    data.months.forEach((mes, i) => {
      m[`agency:${mes}`] = toInput(data.agency[i]);
      for (const s of data.sellers) m[`${s.sellerId}:${mes}`] = toInput(s.goals[i]);
    });
    return m;
  }, [data]);

  const [vals, setVals] = useState(inicial);
  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));

  /**
   * Depois de gravar, o servidor devolve os valores já normalizados. Sem isto o
   * que ficou na tela é o texto cru digitado ("500000" em vez de "500.000") e o
   * botão segue habilitado por uma alteração que já foi salva.
   *
   * Compara o conteúdo, não a identidade do objeto: uma re-renderização que não
   * mudou nada não pode descartar o que a pessoa está digitando.
   */
  const sig = useMemo(() => JSON.stringify(inicial), [inicial]);
  const [sigVisto, setSigVisto] = useState(sig);
  if (sig !== sigVisto) {
    setSigVisto(sig);
    setVals(inicial);
  }

  const dirty = Object.keys(inicial).filter((k) => (vals[k] ?? "") !== inicial[k]).length;

  /** Repete o primeiro valor preenchido da linha nos meses seguintes que estão vazios. */
  function replicar(who: string) {
    setVals((p) => {
      const next = { ...p };
      let ultimo = "";
      for (const mes of data.months) {
        const k = `${who}:${mes}`;
        if ((next[k] ?? "").trim()) ultimo = next[k];
        else if (ultimo) next[k] = ultimo;
      }
      return next;
    });
  }

  /** Total do ano de uma linha, somando o que está na tela. */
  const totalLinha = (who: string) =>
    data.months.reduce((s, mes) => s + (parse(vals[`${who}:${mes}`] ?? "") ?? 0), 0);

  /** Soma das metas de vendedor num mês — é o que vale quando a agência está vazia. */
  const somaMes = (i: number) =>
    data.sellers.reduce(
      (s, v) => s + (parse(vals[`${v.sellerId}:${data.months[i]}`] ?? "") ?? 0),
      0,
    );

  /** Uma célula editável, igual na linha da agência e nas dos vendedores. */
  const Celula = ({ who, i, rotulo }: { who: string; i: number; rotulo: string }) => {
    const k = `${who}:${data.months[i]}`;
    return (
      <td className={i === data.currentMonth ? "sheet-now" : ""}>
        <input
          className="sheet-input"
          name={`c:${who}:${data.months[i]}`}
          value={vals[k] ?? ""}
          onChange={(e) => set(k, e.target.value)}
          inputMode="decimal"
          placeholder={who === "agency" ? "soma" : "—"}
          aria-label={`${rotulo} em ${MES_CURTO[i]}/${data.year}`}
        />
      </td>
    );
  };

  return (
    <form action={saveGoalsYear}>
      <input type="hidden" name="year" value={data.year} />

      <div className="glass card">
        <div className="grid-head">
          <div>
            <div className="section-title">Metas Mensais · {data.year}</div>
            <div className="section-sub">
              vendedores nas linhas, meses nas colunas — preencha e salve de uma vez
            </div>
          </div>
          <SaveButton dirty={dirty} />
        </div>

        <div className="table-wrap sheet-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th className="sheet-name">Vendedor</th>
                {MES_CURTO.map((m, i) => (
                  <th key={m} className={`r${i === data.currentMonth ? " sheet-now" : ""}`}>
                    {m}
                  </th>
                ))}
                <th className="r sheet-total">Ano</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {/* A meta da agência é a linha que o Dashboard Geral lê: vem primeiro. */}
              <tr className="sheet-agency">
                <td className="sheet-name">
                  Meta da agência
                  <span className="sheet-hint">vazio = soma dos vendedores</span>
                </td>
                {data.months.map((_, i) => (
                  <Celula key={i} who="agency" i={i} rotulo="Meta da agência" />
                ))}
                <td className="r sheet-total private">{fmtBR.format(totalLinha("agency"))}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => replicar("agency")}
                    title="Repete o valor preenchido nos meses seguintes que estão vazios"
                  >
                    Repetir →
                  </button>
                </td>
              </tr>

              {data.sellers.map((s) => (
                <tr key={s.sellerId}>
                  <td className="sheet-name">
                    {s.name}
                    {s.active === false && <span className="badge gray">inativo</span>}
                  </td>
                  {data.months.map((_, i) => (
                    <Celula key={i} who={s.sellerId} i={i} rotulo={`Meta de ${s.name}`} />
                  ))}
                  <td className="r sheet-total private">{fmtBR.format(totalLinha(s.sellerId))}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => replicar(s.sellerId)}
                      title="Repete o valor preenchido nos meses seguintes que estão vazios"
                    >
                      Repetir →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="sheet-sum">
                <td className="sheet-name">Soma dos vendedores</td>
                {data.months.map((mes, i) => (
                  <td key={mes} className={`r${i === data.currentMonth ? " sheet-now" : ""}`}>
                    <span className="private">{fmtBR.format(somaMes(i))}</span>
                  </td>
                ))}
                <td className="r sheet-total private">
                  {fmtBR.format(data.months.reduce((s, _, i) => s + somaMes(i), 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </form>
  );
}
