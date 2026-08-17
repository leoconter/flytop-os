import Link from "next/link";
import { Metrics, PageHead } from "@/components/dashboard/ui";
import { AbasVoos, tela, VooTable } from "@/components/crm/voos";
import type { Metric } from "@/lib/dashboard-data";
import { fmtInt } from "@/lib/meta/instagram";
import { listarVoos, type TipoVoo } from "@/lib/monde/voos";

/**
 * O corpo das três telas de voos.
 *
 * As páginas de `/crm/embarques`, `/crm/retornos` e `/crm/retornaram` só dizem
 * qual é a sua — todo o resto é igual, e mantê-lo aqui evita que as três
 * comecem a divergir em detalhes.
 */
export async function PaginaVoos({ tipo }: { tipo: TipoVoo }) {
  const t = tela(tipo);
  const r = await listarVoos(tipo);

  const voltar = (
    <Link href="/crm" className="chip">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Voltar para o CRM
    </Link>
  );

  if (!r) {
    return (
      <>
        <PageHead eyebrow="CRM · operação" title={t.aba} sub={t.sub} right={voltar} />
        <div className="note-box blue">
          <div className="nt">
            O banco não respondeu. Se as migrações de voos ainda não foram aplicadas,
            rode <b>20260817000001_voos_etapas.sql</b> e{" "}
            <b>20260817000002_voos_retorno_para_casa.sql</b> no Supabase.
          </div>
        </div>
      </>
    );
  }

  const { voos, contagens } = r;
  const semTelefone = voos.filter((v) => !v.telefone).length;

  const metrics: Metric[] = [
    {
      label: t.aba,
      value: fmtInt(voos.length),
      tone: tipo === "retornaram" ? "green" : tipo === "retornos" ? "blue" : undefined,
      hint: tipo === "retornaram" ? "nas últimas 48h" : "nas próximas 48h",
      info:
        tipo === "embarques"
          ? "Primeiro trecho do bilhete, com partida nas próximas 48 horas."
          : tipo === "retornos"
            ? "Último trecho do bilhete, com partida nas próximas 48 horas."
            : "Último trecho do bilhete cuja chegada já aconteceu, dentro das últimas 48 horas. Conta a chegada, não a partida: quem decolou há 3 horas ainda está no ar.",
    },
    {
      label: "Com telefone",
      value: fmtInt(voos.length - semTelefone),
      hint: "dá para chamar no WhatsApp",
      info: "Clientes desta lista com celular no cadastro do Monde.",
    },
    {
      label: "Sem telefone",
      value: fmtInt(semTelefone),
      tone: semTelefone > 0 ? "red" : undefined,
      hint: "não dá para contatar",
      info: "Falha de cadastro no Monde — o cliente existe, mas sem celular.",
    },
  ];

  return (
    <>
      <PageHead eyebrow="CRM · operação" title={t.aba} sub={t.sub} right={voltar} />

      <AbasVoos atual={tipo} contagens={contagens} />

      <Metrics metrics={metrics} />

      <div className="section">
        <VooTable voos={voos} tipo={tipo} />
      </div>

      <div className="foot-note">
        <span>FlyTop OS · dados do Monde</span>
        <span>Elev · 2026</span>
      </div>
    </>
  );
}
