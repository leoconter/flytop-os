"use client";

import { SectionHead } from "@/components/dashboard/ui";
import type { AlertFields } from "@/lib/alert-message";
import { percentOff } from "@/lib/alert-message";
import { cabines, companhias } from "@/lib/alertas-data";
import { CalendarField } from "./calendar-field";
import { DisparoCard } from "./disparo-card";
import { WhatsAppPreview } from "./whatsapp-preview";

type FieldKey = keyof AlertFields;

export function AlertBuilder({
  fields,
  setField,
  mensagem,
  setMensagem,
  onGerar,
  onSalvar,
}: {
  fields: AlertFields;
  setField: <K extends FieldKey>(key: K, value: AlertFields[K]) => void;
  mensagem: string;
  setMensagem: (v: string) => void;
  onGerar: () => void;
  onSalvar: () => void;
}) {
  const {
    titulo, origem, destino, cabine, companhia, de, por, xjuros, idaDates, voltaDates,
  } = fields;

  return (
    <div className="grid-2 split">
      {/* Cadastro */}
      <div className="glass card">
        <SectionHead title="Cadastrar alerta" sub="gera o modelo da mensagem" flush />
        <div className="form-grid" style={{ marginTop: 14 }}>
          <div className="field full">
            <label htmlFor="al-titulo">Título</label>
            <input id="al-titulo" className="input" value={titulo} onChange={(e) => setField("titulo", e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="al-origem">Origem</label>
            <input id="al-origem" className="input" value={origem} onChange={(e) => setField("origem", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="al-destino">Destino</label>
            <input id="al-destino" className="input" value={destino} onChange={(e) => setField("destino", e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="al-cabine">Cabine</label>
            <select id="al-cabine" className="select" value={cabine} onChange={(e) => setField("cabine", e.target.value)}>
              {cabines.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="al-companhia">Companhia</label>
            <select id="al-companhia" className="select" value={companhia} onChange={(e) => setField("companhia", e.target.value)}>
              {companhias.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="al-de">De (R$)</label>
            <input id="al-de" className="input" inputMode="numeric" value={de} onChange={(e) => setField("de", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="al-por">Por (R$)</label>
            <input id="al-por" className="input" inputMode="numeric" value={por} onChange={(e) => setField("por", e.target.value)} />
          </div>

          <div className="field">
            <label>% OFF (automático)</label>
            <div className="readonly-field">{percentOff(de, por)}</div>
          </div>
          <div className="field">
            <label htmlFor="al-juros">Vezes sem juros</label>
            <input id="al-juros" className="input" inputMode="numeric" value={xjuros} onChange={(e) => setField("xjuros", e.target.value)} />
          </div>

          <div className="field">
            <label>Datas de ida</label>
            <CalendarField
              value={idaDates}
              onChange={(v) => setField("idaDates", v)}
              fallback={{ y: 2026, m: 6 }}
              placeholder="Selecionar datas de ida"
            />
          </div>
          <div className="field">
            <label>Datas de volta</label>
            <CalendarField
              value={voltaDates}
              onChange={(v) => setField("voltaDates", v)}
              fallback={{ y: 2026, m: 7 }}
              accent="green"
              placeholder="Selecionar datas de volta"
            />
          </div>

          <div className="field full">
            <button type="button" className="btn btn-primary btn-block" onClick={onGerar}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Gerar alerta
            </button>
          </div>

          <div className="field full">
            <label htmlFor="al-msg">Modelo da mensagem</label>
            <textarea id="al-msg" className="textarea" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Preview + disparo */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="glass card">
          <SectionHead title="Pré-visualização" sub="como chega no grupo" flush />
          <div style={{ marginTop: 14 }}>
            <WhatsAppPreview message={mensagem} />
          </div>
        </div>
        <DisparoCard onSalvar={onSalvar} />
      </div>
    </div>
  );
}
