import Link from "next/link";
import { CompanhiaNome } from "@/components/companhia-logo";
import { Badge, SectionHead } from "@/components/dashboard/ui";
import { waLink } from "@/lib/crm-data";
import type { Checkin, Motivo } from "@/lib/monde/checkin";
import type { Contagens, TipoVoo, Voo } from "@/lib/monde/voos";
import { CheckinCelula } from "./checkin-celula";

/** As três telas, na ordem da viagem: parte, volta, chegou. */
export const TELAS: {
  tipo: TipoVoo;
  href: string;
  aba: string;
  titulo: string;
  sub: string;
  vazio: string;
  /** A coluna "Quando" muda de sentido conforme a tela. */
  cabecalho: string;
  passado?: boolean;
}[] = [
  {
    tipo: "embarques",
    href: "/embarques",
    aba: "Embarques",
    titulo: "Embarques nas próximas 48h",
    sub: "clientes partindo — deseje boa viagem",
    vazio: "Ninguém embarca nas próximas 48 horas.",
    cabecalho: "Parte",
  },
  {
    tipo: "retornos",
    href: "/embarques/retornos",
    aba: "Retornos",
    titulo: "Retornos nas próximas 48h",
    sub: "clientes voltando — ainda em viagem",
    vazio: "Ninguém volta nas próximas 48 horas.",
    cabecalho: "Volta",
  },
  {
    tipo: "retornaram",
    href: "/embarques/retornaram",
    aba: "Já retornaram",
    titulo: "Já retornaram · últimas 48h",
    sub: "acabaram de chegar — pergunte como foi e ofereça a próxima",
    vazio: "Ninguém desembarcou de volta nas últimas 48 horas.",
    cabecalho: "Chegou",
    passado: true,
  },
];

export function tela(tipo: TipoVoo) {
  return TELAS.find((t) => t.tipo === tipo)!;
}

/**
 * Navegação entre as três telas, com quantos há em cada uma.
 *
 * O número na aba é o que evita a ida em vão: dá para ver que não há ninguém
 * voltando sem abrir a tela.
 */
export function AbasVoos({
  atual,
  contagens,
}: {
  atual: TipoVoo;
  contagens: Contagens;
}) {
  return (
    <nav className="tabs" aria-label="Embarques e retornos">
      {TELAS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`tab${t.tipo === atual ? " on" : ""}`}
          aria-current={t.tipo === atual ? "page" : undefined}
        >
          {t.aba}
          <span className="tab-contagem">{contagens[t.tipo]}</span>
        </Link>
      ))}
    </nav>
  );
}

export function VooTable({
  voos,
  tipo,
  checkins,
  motivos,
}: {
  voos: Voo[];
  tipo: TipoVoo;
  checkins: Map<string, Checkin>;
  motivos: Motivo[];
}) {
  const t = tela(tipo);
  /* Em "já retornaram" o voo aconteceu: oferecer "check-in realizado" ali
     seria propor uma ação que não existe mais. */
  const comCheckin = !t.passado;

  return (
    <div className="glass card">
      <SectionHead title={t.titulo} sub={t.sub} flush />
      {voos.length === 0 ? (
        <p className="metric-hint" style={{ marginTop: 14 }}>
          {t.vazio}
        </p>
      ) : (
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 132 }}>{t.cabecalho}</th>
                <th>Cliente</th>
                <th>Trecho</th>
                <th>Companhia</th>
                <th>Localizador</th>
                {comCheckin && <th style={{ width: 300 }}>Check-in</th>}
                <th className="r">Contato</th>
              </tr>
            </thead>
            <tbody>
              {voos.map((v) => (
                <tr key={v.id}>
                  <td>
                    <Badge
                      tone={
                        t.passado
                          ? Math.abs(v.horas) <= 24
                            ? "green"
                            : "gray"
                          : v.horas <= 24
                            ? "orange"
                            : "blue"
                      }
                    >
                      {v.quando}
                    </Badge>
                  </td>
                  <td>{v.cliente ?? <span className="muted">—</span>}</td>
                  <td className="mono-cell">{v.trecho}</td>
                  <td>
                    <CompanhiaNome nome={v.companhia} />
                  </td>
                  <td className="mono-cell muted">{v.localizador ?? "—"}</td>
                  {comCheckin && (
                    <td>
                      <CheckinCelula
                        segmentId={v.id}
                        checkin={checkins.get(v.id) ?? null}
                        motivos={motivos}
                      />
                    </td>
                  )}
                  <td className="r">
                    <div className="row-actions">
                      {v.telefone ? (
                        <a
                          className="btn btn-ghost btn-sm"
                          href={waLink(v.telefone)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      ) : (
                        <span
                          className="muted"
                          title="O cadastro do cliente no Monde não tem celular"
                        >
                          sem telefone
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
