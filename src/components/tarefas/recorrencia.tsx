"use client";

import { useState } from "react";
import { salvarRecorrencia } from "@/app/(app)/tarefas/actions";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { ETAPA_LABEL } from "@/lib/tarefas/modelo";
import {
  descrever,
  DIAS_SEMANA,
  type Regra,
  TIPO_LABEL,
  TIPOS,
  type TipoRecorrencia,
  UNIDADE_LABEL,
  UNIDADES,
  type Unidade,
} from "@/lib/tarefas/recorrencia";

const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

const IconeRepete = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

/**
 * Recorrência da tarefa, no gesto do ClickUp.
 *
 * O gatilho é a conclusão, e não um relógio: a tarefa volta a partir do dia em
 * que foi dada como feita. É o que faz "conferir e-mails toda quinta" andar
 * junto com o trabalho de verdade, em vez de acumular ocorrências não feitas.
 */
export function Recorrencia({
  taskId,
  regra,
  proxima,
  novaTarefa,
  reabrirComo,
}: {
  taskId: string;
  regra: Regra | null;
  proxima: string | null;
  novaTarefa: boolean;
  reabrirComo: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoRecorrencia | "">(regra?.tipo ?? "");
  const [intervalo, setIntervalo] = useState(String(regra?.intervalo ?? 1));
  const [unidade, setUnidade] = useState<Unidade>(regra?.unidade ?? "semana");
  const [dias, setDias] = useState<number[]>(regra?.diasSemana ?? []);
  const [diaDoMes, setDiaDoMes] = useState(String(regra?.diaDoMes ?? new Date().getUTCDate()));

  const mostraDias = tipo === "semanal" || (tipo === "personalizada" && unidade === "semana");
  const mostraDiaMes = tipo === "mensal" || (tipo === "personalizada" && unidade === "mes");

  const previa = tipo
    ? descrever({
        tipo,
        intervalo: Number(intervalo) || 1,
        unidade,
        diasSemana: dias,
        diaDoMes: Number(diaDoMes) || null,
      })
    : null;

  const resumo = descrever(regra);

  if (!aberto) {
    return (
      <div className="glass card tk-recorrencia">
        <div className="section-head flush">
          <span className="section-title">Recorrência</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(true)}>
            {resumo ? "Alterar" : "Definir"}
          </button>
        </div>
        {resumo ? (
          <p className="tk-repete">
            <IconeRepete />
            <span>
              <b>{resumo}</b>
              <span className="sub">
                {novaTarefa ? "Cria uma nova tarefa" : `Reabre como ${ETAPA_LABEL[reabrirComo as keyof typeof ETAPA_LABEL] ?? "A Fazer"}`}
                {proxima ? ` · volta em ${dataBR(proxima)}` : " ao concluir"}
              </span>
            </span>
          </p>
        ) : (
          <p className="metric-hint" style={{ marginTop: 10 }}>
            Esta tarefa não se repete.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="glass card tk-recorrencia">
      <div className="section-head flush">
        <span className="section-title">Recorrência</span>
        <span className="section-sub">a partir da conclusão</span>
      </div>

      <FormAcao action={salvarRecorrencia} aoConcluir={() => setAberto(false)} className="tk-rec-form">
        <input type="hidden" name="id" value={taskId} />

        <label className="tk-rec-linha">
          <span className="tk-rec-rot">Repetir</span>
          <select
            className="select"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoRecorrencia | "")}
          >
            <option value="">Não repete</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        {tipo === "personalizada" && (
          <div className="tk-rec-linha">
            <span className="tk-rec-rot">A cada</span>
            <input
              className="input tk-rec-num"
              name="intervalo"
              type="number"
              min={1}
              max={365}
              value={intervalo}
              onChange={(e) => setIntervalo(e.target.value)}
            />
            <select
              className="select"
              name="unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value as Unidade)}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {UNIDADE_LABEL[u][Number(intervalo) === 1 ? 0 : 1]}
                </option>
              ))}
            </select>
          </div>
        )}

        {mostraDias && (
          <div className="tk-rec-linha empilha">
            <span className="tk-rec-rot">Nos dias</span>
            <div className="tk-dias" role="group" aria-label="Dias da semana">
              {DIAS_SEMANA.map((d, i) => {
                const on = dias.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    className={on ? "on" : undefined}
                    aria-pressed={on}
                    onClick={() =>
                      setDias((atual) =>
                        atual.includes(i) ? atual.filter((x) => x !== i) : [...atual, i].sort(),
                      )
                    }
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            {dias.map((d) => (
              <input key={d} type="hidden" name="diaSemana" value={d} />
            ))}
          </div>
        )}

        {mostraDiaMes && (
          <label className="tk-rec-linha">
            <span className="tk-rec-rot">No dia</span>
            <select
              className="select tk-rec-num"
              name="diaDoMes"
              value={diaDoMes}
              onChange={(e) => setDiaDoMes(e.target.value)}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {/* Mês sem o dia escolhido cai no último — senão "todo dia 31"
                sumiria em fevereiro. */}
            {Number(diaDoMes) > 28 && (
              <span className="metric-hint">nos meses mais curtos, cai no último dia</span>
            )}
          </label>
        )}

        {tipo && (
          <>
            <label className="opcao tk-rec-opcao">
              <input type="checkbox" name="novaTarefa" defaultChecked={novaTarefa} />
              <span>
                <b>Criar uma nova tarefa</b>
                <span className="opcao-sub">
                  Em vez de reabrir esta. A concluída fica no histórico, e a cópia
                  começa com o checklist desmarcado.
                </span>
              </span>
            </label>

            <label className="tk-rec-linha">
              <span className="tk-rec-rot">Voltar como</span>
              <select className="select" name="reabrirComo" defaultValue={reabrirComo}>
                <option value="a_fazer">A Fazer</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="aguardando">Aguardando</option>
              </select>
            </label>

            {previa && (
              <p className="tk-rec-previa">
                <IconeRepete />
                {previa}
              </p>
            )}
          </>
        )}

        <div className="acoes-edicao" style={{ marginTop: 4 }}>
          <BotaoAcao className="btn btn-primary btn-sm">Salvar</BotaoAcao>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(false)}>
            Cancelar
          </button>
        </div>
      </FormAcao>
    </div>
  );
}
