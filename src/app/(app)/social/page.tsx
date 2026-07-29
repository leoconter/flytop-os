import { FollowersTrendChart } from "@/components/charts/followers-trend";
import { PostsInPeriod } from "@/components/social/posts-in-period";
import { Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import type { Metric } from "@/lib/dashboard-data";
import { formatRange, PARAM_FROM, PARAM_TO, resolveRange } from "@/lib/date-range";
import { fmtCompact, fmtInt, getInstagramSocial } from "@/lib/meta/instagram";
import { socialMetrics } from "@/lib/social-data";

export const metadata = { title: "FlyTop OS · Social Media" };

/** Cache das buscas na Graph API: 1h. */
export const revalidate = 3600;

function pct(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
}

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ [PARAM_FROM]?: string; [PARAM_TO]?: string }>;
}) {
  const range = resolveRange(await searchParams);
  const live = await getInstagramSocial(range);
  const periodLabel = formatRange(range);

  const metrics: Metric[] = live
    ? [
        {
          label: "Seguidores",
          value: fmtInt(live.followers),
          hint: "base total",
          info: "Tamanho da audiência hoje. Não muda com o período selecionado.",
        },
        {
          label: "Novos seguidores",
          value: live.newFollowers !== null ? `+${fmtInt(live.newFollowers)}` : "—",
          tone: live.newFollowers !== null ? "blue" : undefined,
          hint:
            live.newFollowers === null
              ? "a API só informa os últimos 30 dias"
              : live.vsPreviousPct !== null
                ? `${live.vsPreviousPct >= 0 ? "+" : ""}${pct(live.vsPreviousPct)} vs ritmo do período anterior`
                : live.trendLimited
                  ? "últimos 30 dias do período"
                  : "no período",
          hintTone:
            live.vsPreviousPct === null
              ? undefined
              : live.vsPreviousPct >= 0
                ? "positive"
                : "negative",
          info: "Saldo de seguidores no período. A Meta só publica os últimos 30 dias e leva 1–2 dias para consolidar.",
        },
        {
          label: "Alcance",
          value: live.reach !== null ? fmtCompact(live.reach) : "—",
          hint: live.reachIsSum
            ? "soma de janelas de 30 dias · orgânico + pago"
            : "pessoas únicas · orgânico + pago",
          info: live.reachIsSum
            ? "Pessoas diferentes que viram algum conteúdo. Acima de 30 dias vira soma de janelas (limite da API), então há repetição."
            : "Pessoas diferentes que viram algum conteúdo, orgânico ou impulsionado. Cada uma conta uma vez.",
        },
        {
          label: "Visualizações",
          value: live.views !== null ? fmtCompact(live.views) : "—",
          hint: "views · orgânico + pago",
          info: "Exibições do conteúdo, contando repetições. Substituiu as impressões na API da Meta.",
        },
        {
          label: "Engajamento",
          value: live.engagementPct !== null ? pct(live.engagementPct) : "—",
          tone: "green",
          hint: "interações ÷ alcance",
          info: "Interações ÷ alcance: de cada 100 pessoas alcançadas, quantas interagiram.",
        },
      ]
    : socialMetrics;

  const organicMetrics: Metric[] | null = live?.organic
    ? [
        {
          label: "Alcance orgânico",
          value: fmtCompact(live.organic.reach),
          hint: "soma do alcance dos posts",
          info: "Soma do alcance de cada post. Quem viu dois posts conta duas vezes.",
        },
        {
          label: "Visualizações orgânicas",
          value: fmtCompact(live.organic.views),
          hint: "views dos posts do período",
          info: "Exibições dos posts do período, sem impulsionamento.",
        },
        {
          label: "Engajamento orgânico",
          value:
            live.organic.engagementPct !== null ? pct(live.organic.engagementPct) : "—",
          tone: "green",
          hint: `${fmtInt(live.organic.interactions)} interações ÷ alcance orgânico`,
          info: "Mesma conta do engajamento, só com os posts do período — sem mídia paga.",
        },
      ]
    : null;

  return (
    <>
      <PageHead
        title="Social Media"
        sub={
          live
            ? `Audiência, alcance e engajamento · ${periodLabel}`
            : "Audiência, alcance e engajamento · dados ilustrativos"
        }
        right={!live && <Pill tone="blue">Aguardando conexão Meta</Pill>}
      />

      <Metrics metrics={metrics} />

      {organicMetrics && (
        <div className="section">
          <SectionHead
            title="Desempenho orgânico"
            sub="agregado dos insights por post, sem tráfego pago"
          />
          <Metrics metrics={organicMetrics} />
        </div>
      )}

      {(!live || live.followerTrend) && (
        <div className="section">
          <SectionHead
            title="Tendência de novos seguidores"
            sub={
              live?.followerTrend
                ? live.trendLimited
                  ? "por dia · últimos 30 dias (limite da API)"
                  : "por dia · no período"
                : "últimos 6 meses"
            }
          />
          <div className="glass chart-card">
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-line ll-blue" />
                {live?.followerTrend
                  ? "Novos seguidores por dia"
                  : "Novos seguidores por mês"}
              </span>
              {live?.forecast && (
                <span className="legend-item">
                  <span className="legend-line ll-dash-blue" />
                  Projeção · próximos {live.forecast.days} dias
                </span>
              )}
            </div>
            <FollowersTrendChart
              labels={live?.followerTrend?.labels}
              values={live?.followerTrend?.values}
              forecast={live?.forecast ?? undefined}
            />
            {live?.forecast && (
              <p className="metric-hint">
                Mantido o ritmo de <b>{fmtInt(Math.round(live.forecast.perDay))}</b>{" "}
                seguidores/dia{" "}
                {live.forecast.basis === "anterior"
                  ? "do período anterior"
                  : "deste período (a API não cobre o período anterior)"}
                , a base chega a <b>{fmtInt(live.forecast.followersAtEnd)}</b> em{" "}
                {live.forecast.untilLabel} — <b>+{fmtInt(live.forecast.total)}</b> em{" "}
                {live.forecast.days} dias.
              </p>
            )}
          </div>
        </div>
      )}

      <PostsInPeriod posts={live?.posts} totals={live?.postsTotals} />

      <div className="note-box blue">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div className="nt">
          {live ? (
            <>
              <b>Fonte:</b> Graph API da Meta, atualizada a cada hora. O período
              vem do seletor no topo da tela. A grade principal usa métricas da
              conta (orgânico + pago); <b>Desempenho orgânico</b> soma os
              insights de cada post — por isso o alcance orgânico pode contar a
              mesma pessoa mais de uma vez. A série de seguidores cobre no
              máximo 30 dias (limite da API).
            </>
          ) : (
            <>
              <b>Presença orgânica:</b> seguidores, alcance e visualizações
              virão do Instagram assim que o app Meta for conectado
              (variáveis <b>META_ACCESS_TOKEN</b> e <b>META_IG_USER_ID</b>).
            </>
          )}
        </div>
      </div>
    </>
  );
}
