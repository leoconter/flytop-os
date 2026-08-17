"use client";

import { useState } from "react";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import type { Faixa } from "@/lib/comissao-regra";
import { salvarFaixas } from "./actions";

/** Só os dígitos, para o campo aceitar "450.000" e "450000" igual. */
function paraCampo(v: number | null): string {
  if (v === null) return "";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/**
 * A planilha das faixas.
 *
 * Client component porque dá para acrescentar e remover linhas antes de salvar
 * — sem isso, cadastrar uma faixa nova exigiria uma ida ao servidor só para
 * fazer aparecer um campo vazio.
 */
export function FaixasGrid({ faixas }: { faixas: Faixa[] }) {
  const [linhas, setLinhas] = useState(() =>
    faixas.length
      ? faixas.map((f, i) => ({ chave: `${i}`, de: f.de, ate: f.ate, taxa: f.taxa }))
      : [{ chave: "0", de: 0, ate: null as number | null, taxa: 0 }],
  );

  const adicionar = () => {
    const ultima = linhas[linhas.length - 1];
    setLinhas([
      ...linhas,
      {
        chave: `n${Date.now()}`,
        // Começa onde a anterior terminou: é o que se quer em quase todo caso,
        // e evita o buraco silencioso entre uma faixa e a seguinte.
        de: ultima?.ate ?? 0,
        ate: null,
        taxa: 0,
      },
    ]);
  };

  const remover = (chave: string) =>
    setLinhas(linhas.filter((l) => l.chave !== chave));

  return (
    <FormAcao action={salvarFaixas} exigeMudanca>
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 190 }}>Faturamento a partir de</th>
              <th style={{ width: 190 }}>Até (vazio = sem teto)</th>
              <th style={{ width: 130 }}>Comissão %</th>
              <th style={{ width: 90 }} />
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave}>
                <td>
                  <input
                    className="input"
                    name={`de:${l.chave}`}
                    defaultValue={paraCampo(l.de)}
                    inputMode="decimal"
                    aria-label="Faturamento inicial da faixa"
                    style={{ width: 165 }}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    name={`ate:${l.chave}`}
                    defaultValue={paraCampo(l.ate)}
                    inputMode="decimal"
                    placeholder="sem teto"
                    aria-label="Faturamento final da faixa"
                    style={{ width: 165 }}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    name={`taxa:${l.chave}`}
                    defaultValue={paraCampo(l.taxa * 100)}
                    inputMode="decimal"
                    aria-label="Percentual da faixa"
                    style={{ width: 105 }}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm danger"
                    onClick={() => remover(l.chave)}
                    disabled={linhas.length === 1}
                    title={
                      linhas.length === 1
                        ? "Precisa sobrar ao menos uma faixa"
                        : "Remover esta faixa"
                    }
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
        <BotaoAcao>Salvar faixas</BotaoAcao>
        <button type="button" className="btn btn-ghost btn-sm" onClick={adicionar}>
          Adicionar faixa
        </button>
      </div>
    </FormAcao>
  );
}
