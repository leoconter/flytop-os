import { FollowersTrendChart } from "@/components/charts/followers-trend";
import { PostsInPeriod } from "@/components/social/posts-in-period";
import { Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import type { Metric } from "@/lib/dashboard-data";
import { fmtCompact, fmtInt, getInstagramSocial } from "@/lib/meta/instagram";
import { socialMetrics } from "@/lib/social-data";

export const metadata = { title: "FlyTop OS · Social Media" };

/** Revalida as métricas do Instagram a cada 1h (ISR). */
export const revalidate = 3600;

export default async function SocialPage() {
  const live = await getInstagramSocial();

  const metrics: Metric[] = live
    ? [
        { label: "Seguidores", value: fmtInt(live.followers), hint: "base total" },
        {
          label: "Novos seguidores",
          value: live.newFollowers !== null ? `+${fmtInt(live.newFollowers)}` : "—",
          tone: "blue",
          hint: live.newFollowers !== null ? "últimos 30 dias" : "indisponível para a conta",
        },
        {
          label: "Posts",
          value: fmtInt(live.postsTotals.count),
          hint: "últimos 30 dias",
        },
        {
          label: "Alcance",
          value: live.reach !== null ? fmtCompact(live.reach) : "—",
          hint: "pessoas únicas · 30 dias",
        },
        {
          label: "Visualizações",
          value: live.views !== null ? fmtCompact(live.views) : "—",
          hint: "views · 30 dias",
        },
        {
          label: "Engajamento",
          value:
            live.engagementPct !== null
              ? live.engagementPct.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                }) + "%"
              : "—",
          tone: "green",
          hint: "interações ÷ alcance",
        },
      ]
    : socialMetrics;

  return (
    <>
      <PageHead
        eyebrow="Marketing · presença"
        title="Social Media"
        sub={
          live
            ? "Audiência, alcance e engajamento · últimos 30 dias"
            : "Audiência, alcance e engajamento · dados ilustrativos"
        }
        right={
          live ? (
            <Pill>Instagram · @{live.username}</Pill>
          ) : (
            <Pill tone="blue">Aguardando conexão Meta</Pill>
          )
        }
      />

      <Metrics metrics={metrics} />

      {(!live || live.followerTrend) && (
        <div className="section">
          <SectionHead
            title="Tendência de novos seguidores"
            sub={live?.followerTrend ? "por dia · últimos 30 dias" : "últimos 6 meses"}
          />
          <div className="glass chart-card">
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-line ll-blue" />
                {live?.followerTrend
                  ? "Novos seguidores por dia"
                  : "Novos seguidores por mês"}
              </span>
            </div>
            <FollowersTrendChart
              labels={live?.followerTrend?.labels}
              values={live?.followerTrend?.values}
            />
          </div>
        </div>
      )}

      <PostsInPeriod
        posts={live?.posts}
        totals={live?.postsTotals}
      />

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
              <b>Conectado à Meta:</b> métricas orgânicas da conta{" "}
              <b>@{live.username}</b> via Graph API, atualizadas a cada hora. A
              série de novos seguidores cobre os últimos 30 dias (limite da
              API); <b>Visualizações</b> é a métrica que substituiu Impressões.
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
