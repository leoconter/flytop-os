import { Metrics, PageHead } from "@/components/dashboard/ui";
import { AbasVoos, tela, VooTable } from "@/components/embarques/voos";
import type { Metric } from "@/lib/dashboard-data";
import { fmtInt } from "@/lib/meta/instagram";
import { checkinsDe, listarMotivos } from "@/lib/monde/checkin";
import { listarVoos, type TipoVoo } from "@/lib/monde/voos";

/**
 * O corpo das três telas de voos.
 *
 * As páginas de `/embarques`, `/embarques/retornos` e `/embarques/retornaram`
 * só dizem
 * qual é a sua — todo o resto é igual, e mantê-lo aqui evita que as três
 * comecem a divergir em detalhes.
 */
export async function PaginaVoos({ tipo }: { tipo: TipoVoo }) {
  const t = tela(tipo);
  const r = await listarVoos(tipo);

  if (!r) {
    return (
      <>
        <PageHead eyebrow="Operação" title={t.aba} sub={t.sub} />
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

  const [checkins, motivos] = t.passado
    ? [new Map(), []]
    : await Promise.all([checkinsDe(voos.map((v) => v.id)), listarMotivos()]);

  const feitos = [...checkins.values()].filter((c) => c.status === "feito").length;
  const justificados = [...checkins.values()].filter((c) => c.status === "pendente").length;

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
    ...(t.passado
      ? []
      : [
          {
            label: "Check-in",
            value: `${feitos}/${voos.length}`,
            tone: (feitos === voos.length && voos.length > 0 ? "green" : undefined) as
              | "green"
              | undefined,
            hint: justificados
              ? `${justificados} ${justificados === 1 ? "justificado" : "justificados"}`
              : "feitos",
            info: "Quantos voos desta lista já tiveram o check-in marcado. Os demais estão a fazer ou com justificativa registrada.",
          } satisfies Metric,
        ]),
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
      <PageHead eyebrow="Operação" title={t.aba} sub={t.sub} />

      <AbasVoos atual={tipo} contagens={contagens} />

      <Metrics metrics={metrics} />

      <div className="section">
        <VooTable voos={voos} tipo={tipo} checkins={checkins} motivos={motivos} />
      </div>

      <div className="foot-note">
        <span>FlyTop OS · dados do Monde</span>
        <span>Elev · 2026</span>
      </div>
    </>
  );
}
