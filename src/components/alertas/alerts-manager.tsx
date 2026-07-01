"use client";

import { useRef, useState } from "react";
import { SectionHead } from "@/components/dashboard/ui";
import {
  type AlertFields,
  buildMessage,
  money,
  percentOff,
} from "@/lib/alert-message";
import { defaultAlert, type SavedAlert, savedSeed } from "@/lib/alertas-data";
import { AlertBuilder } from "./alert-builder";

export function AlertsManager() {
  const [fields, setFields] = useState<AlertFields>(defaultAlert);
  const [mensagem, setMensagem] = useState<string>(() =>
    buildMessage(defaultAlert),
  );
  const [saved, setSaved] = useState<SavedAlert[]>(savedSeed);
  const idRef = useRef(0);
  const topRef = useRef<HTMLDivElement>(null);

  function setField<K extends keyof AlertFields>(key: K, value: AlertFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function gerar() {
    setMensagem(buildMessage(fields));
  }

  function salvar() {
    idRef.current += 1;
    setSaved((s) => [{ id: `sv-${idRef.current}`, fields: { ...fields } }, ...s]);
  }

  function editar(id: string) {
    const item = saved.find((s) => s.id === id);
    if (!item) return;
    setFields(item.fields);
    setMensagem(buildMessage(item.fields));
    setSaved((s) => s.filter((x) => x.id !== id));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function excluir(id: string) {
    setSaved((s) => s.filter((x) => x.id !== id));
  }

  return (
    <>
      <div ref={topRef} />
      <AlertBuilder
        fields={fields}
        setField={setField}
        mensagem={mensagem}
        setMensagem={setMensagem}
        onGerar={gerar}
        onSalvar={salvar}
      />

      {/* Banco de alertas — apenas salvos para enviar depois */}
      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Banco de alertas"
            sub="salvos para enviar depois"
            flush
          />
          {saved.length === 0 ? (
            <p className="wa-empty" style={{ padding: "28px 10px" }}>
              Nenhum alerta salvo. Use <b>Salvar alerta para enviar depois</b>{" "}
              para guardar um alerta aqui.
            </p>
          ) : (
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
                    <th className="r">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {saved.map((s) => (
                    <tr key={s.id}>
                      <td>{s.fields.destino}</td>
                      <td>{s.fields.companhia}</td>
                      <td>{s.fields.cabine}</td>
                      <td className="r private">{money(s.fields.por)}</td>
                      <td className="r">{percentOff(s.fields.de, s.fields.por)}</td>
                      <td className="r muted">
                        {s.fields.idaDates.length} ida · {s.fields.voltaDates.length} volta
                      </td>
                      <td className="r">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => editar(s.id)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Excluir alerta salvo"
                            onClick={() => excluir(s.id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
