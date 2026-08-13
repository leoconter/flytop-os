"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { alternarEnvio, removerAlerta } from "@/app/(app)/alertas/actions";
import { BotaoAcao, FormAcao } from "@/components/form-acao";
import { Badge } from "@/components/dashboard/ui";
import { money, percentOff } from "@/lib/alert-message";
import type { Alerta } from "@/lib/alertas/store";

const sw = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconeCopiar = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);
const IconeOk = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IconeEnviar = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const IconeVoltar = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
const IconeEditar = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
const IconeRemover = () => (
  <svg viewBox="0 0 24 24" {...sw}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const quando = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Copia o texto do alerta para colar no grupo.
 *
 * É o passo central da tela: a plataforma não envia nada, então esse botão é o
 * que leva o alerta até o WhatsApp.
 */
function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 1800);
    return () => clearTimeout(t);
  }, [copiado]);

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm${copiado ? " copiado" : ""}`}
      title="Copiar a mensagem para colar no grupo"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
        } catch {
          // Navegador sem permissão de área de transferência: sem confirmação
          // falsa — o texto continua acessível abrindo o alerta para editar.
          setCopiado(false);
        }
      }}
    >
      {copiado ? <IconeOk /> : <IconeCopiar />}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

export function BancoAlertas({ alertas }: { alertas: Alerta[] }) {
  const [confirmando, setConfirmando] = useState<string | null>(null);

  if (alertas.length === 0) {
    return (
      <p className="wa-empty" style={{ padding: "28px 10px" }}>
        Nenhum alerta cadastrado. Use <b>Novo alerta</b> para criar o primeiro.
      </p>
    );
  }

  return (
    <div className="table-wrap" style={{ marginTop: 8 }}>
      <table>
        <thead>
          <tr>
            <th>Destino</th>
            <th>Companhia</th>
            <th>Cabine</th>
            <th className="r">Por</th>
            <th className="r">% OFF</th>
            <th className="r">Datas</th>
            <th>Status</th>
            <th style={{ width: 210 }} />
          </tr>
        </thead>
        <tbody>
          {alertas.map((a) => {
            const enviado = Boolean(a.enviadoEm);
            return (
              <tr key={a.id}>
                <td>{a.fields.destino}</td>
                <td>{a.fields.companhia || <span className="muted">—</span>}</td>
                <td>{a.fields.cabine || <span className="muted">—</span>}</td>
                <td className="r private">{money(a.fields.por)}</td>
                <td className="r">{percentOff(a.fields.de, a.fields.por)}</td>
                <td className="r muted">
                  {a.fields.idaDates.length} ida · {a.fields.voltaDates.length} volta
                </td>
                <td>
                  {enviado ? (
                    <Badge tone="green">Enviado {quando.format(new Date(a.enviadoEm!))}</Badge>
                  ) : (
                    <Badge tone="orange">Na fila</Badge>
                  )}
                </td>
                <td>
                  {confirmando === a.id ? (
                    <div className="acoes">
                      <span className="confirma">Excluir?</span>
                      <FormAcao action={removerAlerta} silencioso>
                        <input type="hidden" name="id" value={a.id} />
                        <BotaoAcao className="btn btn-ghost btn-sm danger" enviando="…">
                          Sim
                        </BotaoAcao>
                      </FormAcao>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setConfirmando(null)}
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <div className="acoes">
                      <BotaoCopiar texto={a.mensagem} />

                      <FormAcao action={alternarEnvio} silencioso>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="enviado" value={enviado ? "0" : "1"} />
                        <BotaoAcao
                          className="icon-btn"
                          title={
                            enviado
                              ? "Devolver para a fila — sai da contagem de enviados"
                              : "Marcar como enviado — entra na contagem"
                          }
                          aria-label={enviado ? "Devolver para a fila" : "Marcar como enviado"}
                          enviando={<IconeEnviar />}
                        >
                          {enviado ? <IconeVoltar /> : <IconeEnviar />}
                        </BotaoAcao>
                      </FormAcao>

                      <Link
                        href={`/alertas/novo?id=${a.id}`}
                        className="icon-btn"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <IconeEditar />
                      </Link>

                      <button
                        type="button"
                        className="icon-btn perigo"
                        title="Excluir alerta"
                        aria-label="Excluir alerta"
                        onClick={() => setConfirmando(a.id)}
                      >
                        <IconeRemover />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
