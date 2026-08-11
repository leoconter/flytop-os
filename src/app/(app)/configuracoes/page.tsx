import { Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import type { Metric } from "@/lib/dashboard-data";
import { fmtInt } from "@/lib/meta/instagram";
import {
  CABINS,
  getAirlineRules,
  getCoverage,
  getDefaultRules,
  getUsage,
} from "@/lib/monde/fare-classes";
import { saveFareRule } from "./actions";

export const metadata = { title: "FlyTop OS · Configurações" };

/**
 * Sempre no servidor, a cada visita. Sem isso a tela é prerenderizada no
 * build e continua mostrando a configuração daquele momento — justamente o
 * que uma tela de configuração não pode fazer.
 */
export const dynamic = "force-dynamic";

/** Select de cabine reaproveitado nos três formulários da tela. */
function CabinSelect({
  name = "cabin",
  value,
  allowEmpty,
  label,
}: {
  name?: string;
  value?: string | null;
  allowEmpty?: boolean;
  label?: string;
}) {
  return (
    <select className="select" name={name} defaultValue={value ?? ""} aria-label={label}>
      {allowEmpty && <option value="">— remover —</option>}
      {!value && !allowEmpty && <option value="">selecione</option>}
      {CABINS.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

export default async function ConfiguracoesPage() {
  const [coverage, usage, defaults, airlineRules] = await Promise.all([
    getCoverage(),
    getUsage(40),
    getDefaultRules(),
    getAirlineRules(),
  ]);

  if (!defaults) {
    return (
      <>
        <PageHead
          title="Configurações"
          sub="Mapa de classes tarifárias"
          right={<Pill tone="blue">Aguardando conexão</Pill>}
        />
        <div className="note-box blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="nt">O banco ainda não respondeu.</div>
        </div>
      </>
    );
  }

  const metrics: Metric[] = coverage
    ? [
        {
          label: "Cobertura",
          value: coverage.pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%",
          tone: coverage.pct >= 95 ? "green" : "blue",
          bar: { pct: coverage.pct, green: coverage.pct >= 95 },
          hint: `${fmtInt(coverage.mapped)} de ${fmtInt(coverage.legs)} trechos com cabine`,
          info: "Quanto dos trechos vendidos já tem cabine resolvida, seja por regra da companhia ou pela regra padrão.",
        },
        {
          label: "Regras por companhia",
          value: fmtInt(airlineRules?.length ?? 0),
          hint: "sobrepõem o padrão",
          info: "Regras específicas cadastradas. Elas têm precedência sobre a regra padrão da mesma letra.",
        },
        {
          label: "Combinações sem regra",
          value: fmtInt(coverage.unmappedCombos),
          tone: coverage.unmappedCombos > 0 ? "red" : "green",
          hint: "companhia + classe sem cabine",
          info: "Combinações que aparecem nas vendas e não são resolvidas nem pela companhia nem pelo padrão.",
        },
        {
          label: "Trechos sem classe",
          value: fmtInt(coverage.emptyClassLegs),
          hint: "campo vazio no Monde",
          info: "O ERP não registrou a classe tarifária nesses trechos. Nenhuma regra resolve — é cadastro faltando na origem.",
        },
      ]
    : [];

  return (
    <>
      <PageHead
        title="Configurações"
        sub="Mapa de classes tarifárias por companhia"
        right={<Pill tone="blue">Acesso restrito</Pill>}
      />

      {coverage && <Metrics metrics={metrics} />}

      {/* Uso real: é aqui que se descobre o que vale configurar. */}
      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Classes em uso"
            sub="as 40 combinações com mais trechos vendidos"
            flush
          />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Companhia</th>
                  <th>Classe</th>
                  <th className="r">Trechos</th>
                  <th>Cabine hoje</th>
                  <th>Origem da regra</th>
                  <th style={{ width: 300 }}>Definir para esta companhia</th>
                </tr>
              </thead>
              <tbody>
                {(usage ?? []).map((u) => (
                  <tr key={`${u.airlineCode}|${u.fareClass}`}>
                    <td className="mono-cell">{u.airlineCode ?? "—"}</td>
                    <td className="mono-cell">
                      {u.fareClass ?? <span className="muted">(vazia)</span>}
                    </td>
                    <td className="r">{fmtInt(u.legs)}</td>
                    <td>
                      {u.cabin ?? <span className="badge orange">não mapeada</span>}
                    </td>
                    <td>
                      {u.source === "especifica" && (
                        <span className="badge blue">
                          <span className="bd" />
                          da companhia
                        </span>
                      )}
                      {u.source === "padrao" && (
                        <span className="badge gray">
                          <span className="bd" />
                          padrão
                        </span>
                      )}
                      {u.source === "nao mapeada" && (
                        <span className="badge orange">
                          <span className="bd" />
                          sem regra
                        </span>
                      )}
                    </td>
                    <td>
                      {u.fareClass && u.airlineCode ? (
                        <form
                          action={saveFareRule}
                          style={{ display: "flex", gap: 8, alignItems: "center" }}
                        >
                          <input type="hidden" name="airlineCode" value={u.airlineCode} />
                          <input type="hidden" name="fareClass" value={u.fareClass} />
                          <CabinSelect
                            value={u.source === "especifica" ? u.cabin : null}
                            allowEmpty={u.source === "especifica"}
                            label={`Cabine de ${u.airlineCode} ${u.fareClass}`}
                          />
                          <button type="submit" className="btn btn-ghost btn-sm">
                            Salvar
                          </button>
                        </form>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Regras específicas já cadastradas */}
      {airlineRules && airlineRules.length > 0 && (
        <div className="section">
          <div className="glass card">
            <SectionHead
              title="Regras por companhia"
              sub={`${airlineRules.length} cadastradas`}
              flush
            />
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Companhia</th>
                    <th>Classe</th>
                    <th style={{ width: 300 }}>Cabine</th>
                  </tr>
                </thead>
                <tbody>
                  {airlineRules.map((r) => (
                    <tr key={r.id}>
                      <td className="mono-cell">{r.airlineCode}</td>
                      <td className="mono-cell">{r.fareClass}</td>
                      <td>
                        <form
                          action={saveFareRule}
                          style={{ display: "flex", gap: 8, alignItems: "center" }}
                        >
                          <input type="hidden" name="airlineCode" value={r.airlineCode ?? ""} />
                          <input type="hidden" name="fareClass" value={r.fareClass} />
                          <CabinSelect value={r.cabin} allowEmpty />
                          <button type="submit" className="btn btn-ghost btn-sm">
                            Salvar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Regra padrão */}
      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Regra padrão"
            sub="vale para qualquer companhia sem regra própria"
            flush
          />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Classe</th>
                  <th style={{ width: 300 }}>Cabine</th>
                  <th>Situação</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {defaults.map((r) => (
                  <tr key={r.id}>
                    <td className="mono-cell">{r.fareClass}</td>
                    <td>
                      <form
                        action={saveFareRule}
                        style={{ display: "flex", gap: 8, alignItems: "center" }}
                      >
                        <input type="hidden" name="airlineCode" value="" />
                        <input type="hidden" name="fareClass" value={r.fareClass} />
                        <CabinSelect value={r.cabin} />
                        <label
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
                        >
                          <input type="checkbox" name="confirmed" defaultChecked={r.confirmed} />
                          conferida
                        </label>
                        <button type="submit" className="btn btn-ghost btn-sm">
                          Salvar
                        </button>
                      </form>
                    </td>
                    <td>
                      {r.confirmed ? (
                        <span className="badge green">
                          <span className="bd" />
                          conferida
                        </span>
                      ) : (
                        <span className="badge orange">
                          <span className="bd" />
                          a conferir
                        </span>
                      )}
                    </td>
                    <td className="muted" style={{ fontSize: 12.5, whiteSpace: "normal" }}>
                      {r.observations ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Nova regra avulsa */}
      <div className="section">
        <div className="glass card">
          <SectionHead title="Nova regra" sub="para uma companhia específica" flush />
          <form action={saveFareRule} className="form-grid" style={{ marginTop: 14 }}>
            <div className="field">
              <label htmlFor="nova-cia">Companhia (código IATA)</label>
              <input
                id="nova-cia"
                className="input"
                name="airlineCode"
                placeholder="LA, TP, AZ…"
                maxLength={3}
              />
            </div>
            <div className="field">
              <label htmlFor="nova-classe">Classe tarifária</label>
              <input
                id="nova-classe"
                className="input"
                name="fareClass"
                placeholder="J, P, R…"
                maxLength={3}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="nova-cabine">Cabine</label>
              <CabinSelect label="Cabine da nova regra" />
            </div>
            <div className="field" style={{ justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary">
                Adicionar regra
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="note-box blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div className="nt">
          <b>Como a cabine é decidida:</b> primeiro procura a regra da companhia
          do trecho; sem ela, cai na regra padrão. Por isso vale cadastrar
          exceção só onde a companhia foge da convenção — as letras seguras (J,
          C, D = Executiva; F, A = First) funcionam para quase todas. A coluna
          <b> Trechos</b> mostra onde configurar rende mais: são 401 combinações
          no histórico, mas poucas concentram o volume.
        </div>
      </div>
    </>
  );
}
