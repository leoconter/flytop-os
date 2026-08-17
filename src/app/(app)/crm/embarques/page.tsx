import Link from "next/link";
import { CompanhiaNome } from "@/components/companhia-logo";
import { Badge, Metrics, PageHead, SectionHead } from "@/components/dashboard/ui";
import { waLink } from "@/lib/crm-data";
import type { Metric } from "@/lib/dashboard-data";
import { fmtInt } from "@/lib/meta/instagram";
import { getVoos48h, type Voo } from "@/lib/monde/voos";

export const metadata = {
  title: "FlyTop OS · Embarques e retornos 48h",
};

// A janela é de horas: cachear serviria uma lista velha, e "em 2h" que já
// passou é pior que dado nenhum.
export const dynamic = "force-dynamic";

function VooTable({
  title,
  sub,
  voos,
  vazio,
  passado = false,
}: {
  title: string;
  sub: string;
  voos: Voo[];
  vazio: string;
  /** Lista do passado: a urgência se inverte — o mais recente é o mais quente. */
  passado?: boolean;
}) {
  return (
    <div className="glass card">
      <SectionHead title={title} sub={sub} flush />
      {voos.length === 0 ? (
        <p className="metric-hint" style={{ marginTop: 14 }}>
          {vazio}
        </p>
      ) : (
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 132 }}>Quando</th>
                <th>Cliente</th>
                <th>Trecho</th>
                <th>Companhia</th>
                <th>Localizador</th>
                <th className="r">Contato</th>
              </tr>
            </thead>
            <tbody>
              {voos.map((v) => (
                <tr key={v.id}>
                  <td>
                    <Badge
                      tone={
                        passado
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
                        <span className="muted" title="O cadastro do cliente não tem celular">
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

export default async function EmbarquesPage() {
  const voos = await getVoos48h();

  if (!voos) {
    return (
      <>
        <PageHead
          eyebrow="CRM · operação"
          title="Embarques e retornos"
          sub="Clientes partindo, voltando e recém-chegados"
        />
        <div className="note-box blue">
          <div className="nt">
            O banco não respondeu. Se a migração <b>20260817000001_voos_etapas.sql</b>{" "}
            ainda não foi aplicada, rode-a no Supabase.
          </div>
        </div>
      </>
    );
  }

  const semTelefone = [...voos.embarques, ...voos.retornos, ...voos.retornaram].filter(
    (v) => !v.telefone,
  ).length;

  const metrics: Metric[] = [
    {
      label: "Embarcando em 48h",
      value: fmtInt(voos.embarques.length),
      hint: "clientes partindo",
      info: "Primeiro trecho do bilhete com partida nas próximas 48 horas.",
    },
    {
      label: "Voltando em 48h",
      value: fmtInt(voos.retornos.length),
      tone: "blue",
      hint: "ainda em viagem",
      info: "Último trecho do bilhete com partida nas próximas 48 horas.",
    },
    {
      label: "Já retornaram",
      value: fmtInt(voos.retornaram.length),
      tone: "green",
      hint: "desembarcaram nas últimas 48h",
      info:
        "Último trecho do bilhete cuja chegada já aconteceu, dentro das últimas 48 horas. Conta a chegada, não a partida: quem decolou há 3 horas ainda está no ar.",
    },
    {
      label: "Sem telefone",
      value: fmtInt(semTelefone),
      tone: semTelefone > 0 ? "red" : undefined,
      hint: "não dá para contatar",
      info: "Clientes destas listas cujo cadastro no Monde não tem celular.",
    },
  ];

  return (
    <>
      <PageHead
        eyebrow="CRM · operação"
        title="Embarques e retornos"
        sub="Clientes partindo, voltando e recém-chegados"
        right={
          <Link href="/crm" className="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar para o CRM
          </Link>
        }
      />

      <Metrics metrics={metrics} />

      <div className="section">
        <VooTable
          title="Embarques nas próximas 48h"
          sub="clientes partindo — deseje boa viagem"
          voos={voos.embarques}
          vazio="Ninguém embarca nas próximas 48 horas."
        />
      </div>

      <div className="section">
        <VooTable
          title="Retornos nas próximas 48h"
          sub="clientes voltando — ainda em viagem"
          voos={voos.retornos}
          vazio="Ninguém volta nas próximas 48 horas."
        />
      </div>

      <div className="section">
        <VooTable
          title="Já retornaram · últimas 48h"
          sub="acabaram de chegar — pergunte como foi e ofereça a próxima"
          voos={voos.retornaram}
          vazio="Ninguém desembarcou de volta nas últimas 48 horas."
          passado
        />
      </div>

      <div className="foot-note">
        <span>FlyTop OS · dados do Monde</span>
        <span>Elev · 2026</span>
      </div>
    </>
  );
}
