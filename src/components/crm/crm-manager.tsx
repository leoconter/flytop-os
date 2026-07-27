"use client";

import { useMemo, useRef, useState } from "react";
import { Badge, SectionHead } from "@/components/dashboard/ui";
import {
  type Lead,
  leadsSeed,
  matchAlerta,
  mesLabel,
  waLink,
} from "@/lib/crm-data";
import { MonthField } from "./month-field";

export function CrmManager() {
  const [leads, setLeads] = useState<Lead[]>(leadsSeed);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [meses, setMeses] = useState<string[]>([]);
  const [filtroDestino, setFiltroDestino] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const idRef = useRef(0);

  const podeRegistrar =
    nome.trim() &&
    telefone.trim() &&
    origem.trim() &&
    destino.trim() &&
    meses.length > 0;

  /** Leads com um alerta correspondente já enviado — prontos para chamar. */
  const prontos = useMemo(
    () => leads.map((l) => ({ lead: l, alerta: matchAlerta(l) })).filter((x) => x.alerta),
    [leads],
  );

  /** Destinos distintos presentes nos leads (para o filtro). */
  const destinosFiltro = useMemo(
    () => [...new Set(leads.map((l) => l.destino))].sort((a, b) => a.localeCompare(b)),
    [leads],
  );

  /** Meses distintos presentes nos leads (para o filtro). */
  const mesesFiltro = useMemo(
    () => [...new Set(leads.flatMap((l) => l.meses))].sort(),
    [leads],
  );

  const leadsFiltrados = useMemo(
    () =>
      leads.filter(
        (l) =>
          (!filtroDestino || l.destino === filtroDestino) &&
          (!filtroMes || l.meses.includes(filtroMes)),
      ),
    [leads, filtroDestino, filtroMes],
  );

  function registrar() {
    if (!podeRegistrar) return;
    idRef.current += 1;
    const mesesOrdenados = [...meses].sort();
    setLeads((ls) => [
      {
        id: `ld-new-${idRef.current}`,
        nome: nome.trim(),
        telefone: telefone.trim(),
        origem: origem.trim(),
        destino: destino.trim(),
        meses: mesesOrdenados,
        criadoEm: "agora",
      },
      ...ls,
    ]);
    setNome("");
    setTelefone("");
    setOrigem("");
    setDestino("");
    setMeses([]);
  }

  function excluir(id: string) {
    setLeads((ls) => ls.filter((l) => l.id !== id));
  }

  return (
    <>
      <div className="grid-2 split">
        {/* Registrar interesse */}
        <div className="glass card">
          <SectionHead
            title="Registrar interesse"
            sub="cadastro do lead + destino de interesse"
            flush
          />
          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="field">
              <label htmlFor="crm-nome">Nome do lead</label>
              <input
                id="crm-nome"
                className="input"
                placeholder="Ex.: Ana Souza"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="crm-tel">Telefone</label>
              <input
                id="crm-tel"
                className="input"
                inputMode="tel"
                placeholder="+55 11 90000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="crm-origem">Origem</label>
              <input
                id="crm-origem"
                className="input"
                placeholder="Ex.: São Paulo"
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="crm-destino">Destino de interesse</label>
              <input
                id="crm-destino"
                className="input"
                placeholder="Ex.: Orlando"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />
            </div>

            <div className="field full">
              <label>Meses de interesse <span className="muted">(selecione um ou mais)</span></label>
              <MonthField value={meses} onChange={setMeses} fallbackYear={2026} />
            </div>

            <div className="field full">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={registrar}
                disabled={!podeRegistrar}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Registrar interesse
              </button>
            </div>
          </div>

          <div className="note-box blue" style={{ marginTop: 16 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16v-4M12 8h.01" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <div className="nt">
              Quando um alerta com a mesma <b>origem</b> e <b>destino</b> for
              enviado nas comunidades, o lead aparece em{" "}
              <b>Prontos para chamar</b> e você recebe a notificação.
            </div>
          </div>
        </div>

        {/* Prontos para chamar (match de alerta) */}
        <div className="glass card">
          <SectionHead
            title="Prontos para chamar"
            sub="lead com alerta correspondente enviado"
            flush
          />
          {prontos.length === 0 ? (
            <p className="wa-empty" style={{ padding: "28px 10px" }}>
              Nenhum lead com alerta correspondente ainda. Assim que um alerta
              casar com um interesse registrado, ele aparece aqui.
            </p>
          ) : (
            <div className="list" style={{ marginTop: 14 }}>
              {prontos.map(({ lead, alerta }) => (
                <div className="list-row" key={lead.id}>
                  <div className="list-main">
                    <div className="list-name">
                      {lead.nome}{" "}
                      <span className="muted">· {lead.origem} → {lead.destino}</span>
                    </div>
                    <div className="list-meta">
                      Alerta {alerta!.companhia} · {alerta!.preco} · {alerta!.quando}
                    </div>
                  </div>
                  <a
                    className="btn btn-primary btn-sm"
                    href={waLink(lead.telefone)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    Chamar
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interesses registrados */}
      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Interesses registrados"
            sub="todos os leads e o status do alerta"
            flush
          />

          {/* Filtros */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
            <div className="field" style={{ minWidth: 180 }}>
              <label htmlFor="crm-f-destino">Destino</label>
              <select
                id="crm-f-destino"
                className="select"
                value={filtroDestino}
                onChange={(e) => setFiltroDestino(e.target.value)}
              >
                <option value="">Todos os destinos</option>
                {destinosFiltro.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ minWidth: 180 }}>
              <label htmlFor="crm-f-mes">Mês de interesse</label>
              <select
                id="crm-f-mes"
                className="select"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
              >
                <option value="">Todos os meses</option>
                {mesesFiltro.map((m) => (
                  <option key={m} value={m}>{mesLabel(m)}</option>
                ))}
              </select>
            </div>
            {(filtroDestino || filtroMes) && (
              <div className="field" style={{ justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setFiltroDestino("");
                    setFiltroMes("");
                  }}
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Registrado</th>
                  <th>Lead</th>
                  <th>Telefone</th>
                  <th>Trecho</th>
                  <th>Meses</th>
                  <th>Status</th>
                  <th className="r">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leadsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted" style={{ textAlign: "center", padding: "24px 10px" }}>
                      Nenhum interesse para esse filtro.
                    </td>
                  </tr>
                ) : (
                  leadsFiltrados.map((lead) => {
                    const alerta = matchAlerta(lead);
                    return (
                      <tr key={lead.id}>
                        <td className="muted">{lead.criadoEm}</td>
                        <td>{lead.nome}</td>
                        <td className="mono-cell">{lead.telefone}</td>
                        <td>
                          {lead.origem} → {lead.destino}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {lead.meses.map((m) => (
                              <Badge key={m} tone="blue">{mesLabel(m)}</Badge>
                            ))}
                          </div>
                        </td>
                        <td>
                          {alerta ? (
                            <Badge tone="green">Alerta enviado</Badge>
                          ) : (
                            <Badge tone="gray">Aguardando alerta</Badge>
                          )}
                        </td>
                        <td className="r">
                          <div className="row-actions">
                            <a
                              className="btn btn-ghost btn-sm"
                              href={waLink(lead.telefone)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp
                            </a>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label="Excluir interesse"
                              onClick={() => excluir(lead.id)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
