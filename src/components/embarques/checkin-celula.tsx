"use client";

import { useEffect, useRef, useState } from "react";
import {
  checkinFeito,
  checkinLimpar,
  checkinPendente,
} from "@/app/(app)/embarques/actions";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import type { Checkin, Motivo } from "@/lib/monde/checkin";

/**
 * A célula de check-in de um voo.
 *
 * Três estados: a fazer, feito e pendente com justificativa. A justificativa
 * abre num painel ao clicar, e não num campo sempre visível — a maioria das
 * linhas termina em "feito", e um seletor por linha encheria a tabela de
 * controle que quase nunca é usado.
 */
export function CheckinCelula({
  segmentId,
  checkin,
  motivos,
}: {
  segmentId: string;
  checkin: Checkin | null;
  motivos: Motivo[];
}) {
  const [aberto, setAberto] = useState(false);
  const [novo, setNovo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  if (checkin?.status === "feito") {
    return (
      <div className="ck">
        <span className="badge green" title={quandoTexto(checkin)}>
          check-in feito
        </span>
        <FormAcao action={checkinLimpar} silencioso>
          <input type="hidden" name="segmentId" value={segmentId} />
          <BotaoAcao className="btn btn-ghost btn-sm" enviando="…" title="Desfazer">
            desfazer
          </BotaoAcao>
        </FormAcao>
      </div>
    );
  }

  if (checkin?.status === "pendente") {
    return (
      <div className="ck">
        <span className="badge orange" title={quandoTexto(checkin)}>
          {checkin.motivo ?? "pendente"}
        </span>
        {checkin.nota && <span className="ck-nota">{checkin.nota}</span>}
        <FormAcao action={checkinFeito} silencioso>
          <input type="hidden" name="segmentId" value={segmentId} />
          <BotaoAcao className="btn btn-ghost btn-sm" enviando="…">
            marcar feito
          </BotaoAcao>
        </FormAcao>
      </div>
    );
  }

  return (
    <div className="ck" ref={ref}>
      <FormAcao action={checkinFeito} silencioso>
        <input type="hidden" name="segmentId" value={segmentId} />
        <BotaoAcao className="btn btn-primary btn-sm" enviando="…">
          Check-in realizado
        </BotaoAcao>
      </FormAcao>

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        Justificar
      </button>

      {aberto && (
        <div className="ck-pop">
          <FormAcao
            action={checkinPendente}
            silencioso
            aoConcluir={() => {
              setAberto(false);
              setNovo(false);
            }}
          >
            <input type="hidden" name="segmentId" value={segmentId} />

            {novo ? (
              <input
                className="input"
                name="novoMotivo"
                placeholder="Nova justificativa"
                aria-label="Nova justificativa"
                autoFocus
                required
              />
            ) : (
              <select className="select" name="reasonId" aria-label="Justificativa" required>
                <option value="">Escolha o motivo…</option>
                {motivos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setNovo((v) => !v)}
              title={novo ? "Escolher da lista" : "Cadastrar nova justificativa"}
            >
              {novo ? "escolher da lista" : "+ nova"}
            </button>

            <input
              className="input"
              name="nota"
              placeholder="Observação (opcional)"
              aria-label="Observação"
            />

            <BotaoAcao className="btn btn-primary btn-sm" enviando="Salvando…">
              Salvar
            </BotaoAcao>
          </FormAcao>
        </div>
      )}
    </div>
  );
}

function quandoTexto(c: Checkin): string {
  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(c.quando));
  return c.quem ? `${c.quem} · ${data}` : data;
}
