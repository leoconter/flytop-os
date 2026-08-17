import Link from "next/link";
import { BancoAlertas } from "@/components/alertas/banco-alertas";
import { Metrics, PageHead, SectionHead } from "@/components/dashboard/ui";
import { estatisticas, listarAlertas } from "@/lib/alertas/store";
import type { Metric } from "@/lib/dashboard-data";
import { fmtInt } from "@/lib/meta/instagram";
import { destinosMaisPedidos } from "@/lib/crm/store";

export const metadata = {
  title: "FlyTop OS · Alertas",
};

/** O banco muda a cada cadastro e a cada envio marcado: sem cache. */
export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const listagem = await listarAlertas();
  const alertas = "alertas" in listagem ? listagem.alertas : null;
  const st = alertas ? estatisticas(alertas) : null;

  /* O que a operação quer saber aqui não é o que ela mesma mandou, e sim o que
     o cliente está pedindo: o destino mais registrado no CRM aponta o próximo
     alerta a caçar. A contagem de companhia continua em Dados de alertas. */
  const destinos = await destinosMaisPedidos(1);
  const topDestino = destinos?.[0];
  const metrics: Metric[] = [
    {
      label: "Enviados hoje",
      value: fmtInt(st?.enviadosHoje ?? 0),
      hint: "marcados como enviados",
    },
    {
      label: "Enviados no mês",
      value: fmtInt(st?.enviadosMes ?? 0),
      hint: `${fmtInt(st?.total ?? 0)} cadastrados no total`,
    },
    {
      label: "Na fila",
      value: fmtInt(st?.naFila ?? 0),
      tone: st && st.naFila > 0 ? "blue" : undefined,
      hint: "prontos para copiar",
    },
    {
      label: "Destino mais pedido",
      value: topDestino?.destino ?? "—",
      small: true,
      tone: topDestino ? "blue" : undefined,
      hint: topDestino
        ? `${fmtInt(topDestino.pedidos)} ${topDestino.pedidos === 1 ? "interesse" : "interesses"} no CRM`
        : "nenhum interesse registrado ainda",
      info: "Destino que mais aparece nos interesses registrados no CRM. Diz qual oferta vale a pena caçar em seguida.",
    },
  ];

  return (
    <>
      <PageHead
        eyebrow="Comunidade · operação"
        title="Controle de Alertas"
        sub="Cadastre a oferta, copie a mensagem e marque quando enviar aos grupos"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/alertas/dados" className="chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 3 3 5-6" />
              </svg>
              Dados de alertas
            </Link>
            <Link href="/alertas/novo" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Novo alerta
            </Link>
          </div>
        }
      />

      <Metrics metrics={metrics} />

      <div className="section">
        <div className="glass card">
          <SectionHead
            title="Banco de alertas"
            sub="a fila primeiro, depois o que já saiu"
            flush
          />
          {alertas ? (
            <BancoAlertas alertas={alertas} />
          ) : (
            <p className="wa-empty" style={{ padding: "28px 10px" }}>
              {"erro" in listagem && listagem.erro === "sem-tabela"
                ? "A tabela de alertas ainda não foi criada no banco. Os alertas aparecem aqui assim que a migração for aplicada."
                : "O banco de alertas não respondeu."}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
