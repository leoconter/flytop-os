import { AdsEfficiencyChart } from "@/components/charts/ads-efficiency";
import { Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import type { Metric } from "@/lib/dashboard-data";
import { formatRange, PARAM_FROM, PARAM_TO, resolveRange } from "@/lib/date-range";
import {
  type AdsCampaignRow,
  type AdsRegion,
  fmtMoney,
  fmtMoneyCompact,
  getAdsInsights,
  LEADS_TERM,
} from "@/lib/meta/ads";
import { fmtCompact, fmtInt } from "@/lib/meta/instagram";
import {
  adsByCampaign,
  adsByRegion,
  adsMetrics,
  communityMetrics,
  resultMetrics,
  type AdsRow,
} from "@/lib/ads-data";

export const metadata = { title: "FlyTop OS · Métricas de Ads" };

/** Cache das buscas na Marketing API: 1h. */
export const revalidate = 3600;

/** Tabela de recorte dos dados ilustrativos (mesmas colunas do mockup). */
function MockBreakdownTable({
  title,
  sub,
  firstCol,
  rows,
}: {
  title: string;
  sub: string;
  firstCol: string;
  rows: AdsRow[];
}) {
  return (
    <div className="section">
      <div className="glass card">
        <SectionHead title={title} sub={sub} flush />
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table>
            <thead>
              <tr>
                <th>{firstCol}</th>
                <th className="r">Investimento</th>
                <th className="r">Cliques Whats</th>
                <th className="r">Entradas</th>
                <th className="r">CPA final</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td className="r private">{row.investment}</td>
                  <td className="r">{row.clicks}</td>
                  <td className="r">{row.entries}</td>
                  <td className="r private">{row.cpa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Tabela de campanhas com dados reais da Marketing API. */
function CampaignTable({
  title,
  sub,
  rows,
  currency,
}: {
  title: string;
  sub: string;
  rows: AdsCampaignRow[];
  currency: string;
}) {
  return (
    <div className="section">
      <div className="glass card">
        <SectionHead title={title} sub={sub} flush />
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table>
            <thead>
              <tr>
                <th>Campanha</th>
                <th className="r">Investimento</th>
                <th className="r">Alcance</th>
                <th className="r">Cliques no link</th>
                <th className="r">Conversões</th>
                <th className="r">CPA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td className="r private">{fmtMoney(row.spend, currency)}</td>
                  <td className="r">{fmtInt(row.reach)}</td>
                  <td className="r">{fmtInt(row.linkClicks)}</td>
                  <td className="r">{fmtInt(row.conversions)}</td>
                  <td className="r private">
                    {row.cpa !== null ? (
                      fmtMoney(row.cpa, currency, 2)
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
  );
}

/** Recorte por praça (SP / RJ) das campanhas de captação. */
function RegionTable({
  regions,
  currency,
  totalSpend,
}: {
  regions: AdsRegion[];
  currency: string;
  totalSpend: number;
}) {
  return (
    <div className="section">
      <div className="glass card">
        <SectionHead
          title="Por praça"
          sub="campanhas de captação por região no nome"
          flush
        />
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table>
            <thead>
              <tr>
                <th>Praça</th>
                <th className="r">Campanhas</th>
                <th className="r">Investimento</th>
                <th className="r">Alcance</th>
                <th className="r">Cliques no link</th>
                <th className="r">Conversões</th>
                <th className="r">CPA</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r) => (
                <tr key={r.term}>
                  <td>
                    {r.label}{" "}
                    <span className="muted mono-cell">[{r.term}]</span>
                  </td>
                  <td className="r">{fmtInt(r.campaigns)}</td>
                  <td className="r private">
                    {fmtMoney(r.totals.spend, currency)}
                    {totalSpend > 0 && (
                      <small
                        style={{
                          display: "block",
                          fontSize: 11.5,
                          color: "var(--text-3)",
                        }}
                      >
                        {((r.totals.spend / totalSpend) * 100).toLocaleString("pt-BR", {
                          maximumFractionDigits: 0,
                        })}
                        % do total
                      </small>
                    )}
                  </td>
                  <td className="r">{fmtInt(r.totals.reach)}</td>
                  <td className="r">{fmtInt(r.totals.linkClicks)}</td>
                  <td className="r">{fmtInt(r.totals.conversions)}</td>
                  <td className="r private">
                    {r.totals.cpa !== null ? (
                      fmtMoney(r.totals.cpa, currency, 2)
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
  );
}

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ [PARAM_FROM]?: string; [PARAM_TO]?: string }>;
}) {
  const range = resolveRange(await searchParams);
  const live = await getAdsInsights(range);
  const periodLabel = formatRange(range);

  if (!live) {
    // Sem credenciais da Marketing API: mantém o mockup da Fase 1.
    return (
      <>
        <PageHead
          title="Métricas de Ads"
          sub="Investimento e captação de membros · dados ilustrativos"
          right={<Pill tone="blue">Aguardando conexão Meta Ads</Pill>}
        />
        <Metrics metrics={adsMetrics} />
        <div className="section">
          <SectionHead title="Resultado" sub="ação otimizada nos anúncios" />
          <Metrics metrics={resultMetrics} />
        </div>
        <div className="section">
          <SectionHead title="Comunidade" sub="o que acontece depois do clique" />
          <Metrics metrics={communityMetrics} />
        </div>
        <div className="section">
          <SectionHead title="Investimento e eficiência" sub="últimos 6 meses" />
          <div className="glass chart-card">
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-line ll-blue" />
                Investimento
              </span>
              <span className="legend-item">
                <span className="legend-line ll-orange" />
                CPA final (por membro)
              </span>
            </div>
            <AdsEfficiencyChart />
          </div>
        </div>
        <MockBreakdownTable
          title="Por região"
          sub="SP e RJ · maio 2026"
          firstCol="Região"
          rows={adsByRegion}
        />
        <MockBreakdownTable
          title="Por campanha"
          sub="maio 2026"
          firstCol="Campanha"
          rows={adsByCampaign}
        />
      </>
    );
  }

  const { leads, others, currency } = live;

  const mainMetrics: Metric[] = [
    {
      label: "Investimento",
      value: fmtMoneyCompact(leads.spend, currency),
      hint: "campanhas de captação",
      privateValue: true,
      info: `Gasto do período, só nas campanhas com "${LEADS_TERM}" no nome.`,
    },
    {
      label: "Alcance",
      value: fmtCompact(leads.reach),
      hint: "pessoas únicas",
      info: "Pessoas diferentes que viram os anúncios. Quem foi impactado por várias campanhas conta uma vez só.",
    },
    {
      label: "Impressões",
      value: fmtCompact(leads.impressions),
      hint: "exibições",
      info: "Quantas vezes os anúncios apareceram, contando repetições para a mesma pessoa.",
    },
    {
      label: "Conversões",
      value: fmtInt(leads.conversions),
      tone: "blue",
      hint: "cliques no WhatsApp da LP",
      info: "Cliques no botão de WhatsApp da landing page, que leva para a comunidade — o evento de pixel que estas campanhas otimizam. É intenção de entrar, não entrada confirmada: quem clica ainda pode não concluir.",
    },
    {
      label: "CPA",
      value: leads.cpa !== null ? fmtMoney(leads.cpa, currency, 2) : "—",
      tone: "green",
      hint: "por clique no WhatsApp",
      privateValue: true,
      info: "Investimento ÷ conversões: o custo de cada clique no botão de WhatsApp. Não é o custo por membro da comunidade — para isso falta cruzar com as entradas reais.",
    },
  ];

  const trafficMetrics: Metric[] = [
    {
      label: "Cliques no link",
      value: fmtInt(leads.linkClicks),
      hint: "saídas para a LP",
      info: "Cliques que levaram à página de destino. Não conta curtidas nem comentários.",
    },
    {
      label: "CPC",
      value: leads.cpc !== null ? fmtMoney(leads.cpc, currency, 2) : "—",
      hint: "por clique no link",
      privateValue: true,
      info: "Investimento ÷ cliques no link: o custo de cada visita.",
    },
    {
      label: "Visualizações da LP",
      value: fmtInt(leads.landingPageViews),
      hint: "página de destino carregada",
      info: "Quantas vezes a página de destino carregou. A diferença para os cliques é quem desistiu no caminho.",
    },
    {
      label: "CTR",
      value:
        leads.ctr !== null
          ? leads.ctr.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%"
          : "—",
      hint: "cliques ÷ impressões",
      info: "De cada 100 exibições, quantas viraram clique.",
    },
  ];

  const otherMetrics: Metric[] = [
    {
      label: "Investimento",
      value: fmtMoneyCompact(others.spend, currency),
      hint: "fora do filtro de captação",
      privateValue: true,
      info: `Gasto das campanhas sem "${LEADS_TERM}" no nome — impulsionamentos e engajamento.`,
    },
    {
      label: "Alcance",
      value: fmtCompact(others.reach),
      hint: "pessoas únicas",
      info: "Pessoas diferentes atingidas por essas campanhas.",
    },
    {
      label: "Cliques no link",
      value: fmtInt(others.linkClicks),
      hint: "no período",
      info: "Cliques para fora do anúncio. Sem o pixel de captação, não viram conversão aqui.",
    },
  ];

  const shareOfSpend =
    leads.spend + others.spend > 0
      ? (leads.spend / (leads.spend + others.spend)) * 100
      : null;

  return (
    <>
      <PageHead
        title="Métricas de Ads"
        sub={`Captação de membros · campanhas com "${LEADS_TERM}" no nome · ${periodLabel}`}
      />

      <Metrics metrics={mainMetrics} />

      <div className="section">
        <SectionHead title="Tráfego" sub="do anúncio até a página de destino" />
        <Metrics metrics={trafficMetrics} />
      </div>

      {live.daily && (
        <div className="section">
          <SectionHead title="Investimento e eficiência" sub="por dia · no período" />
          <div className="glass chart-card">
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-line ll-blue" />
                Investimento
              </span>
              <span className="legend-item">
                <span className="legend-line ll-orange" />
                CPA (por conversão)
              </span>
            </div>
            <AdsEfficiencyChart
              labels={live.daily.labels}
              investment={live.daily.spend}
              cpa={live.daily.cpa}
              cpaLabel="CPA"
            />
          </div>
        </div>
      )}

      {live.regions.length > 0 && (
        <RegionTable
          regions={live.regions}
          currency={currency}
          totalSpend={leads.spend}
        />
      )}

      <CampaignTable
        title="Campanhas de captação"
        sub={`${live.leadsCampaigns.length} campanhas · ${periodLabel}`}
        rows={live.leadsCampaigns}
        currency={currency}
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
          <b>Fonte:</b> Marketing API da Meta, atualizada a cada hora. Os números
          acima consideram <b>apenas as campanhas com &ldquo;{LEADS_TERM}&rdquo; no
          nome</b> — o corte é feito na própria API, então o alcance continua
          sendo de pessoas únicas (somar campanha a campanha contaria a mesma
          pessoa mais de uma vez). <b>Conversões</b> são os cliques no botão de
          WhatsApp da landing page e o <b>CPA</b> é o custo desse clique — não
          do membro que efetivamente entrou na comunidade.
        </div>
      </div>

      {live.otherCampaigns.length > 0 && (
        <>
          <div className="section" style={{ marginTop: 28 }}>
            <SectionHead
              title="Outras campanhas"
              sub={
                shareOfSpend !== null
                  ? `fora do filtro de captação · ${(100 - shareOfSpend).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do investimento`
                  : "fora do filtro de captação"
              }
            />
            <Metrics metrics={otherMetrics} />
          </div>

          <CampaignTable
            title="Detalhe por campanha"
            sub={`${live.otherCampaigns.length} campanhas sem "${LEADS_TERM}" no nome`}
            rows={live.otherCampaigns}
            currency={currency}
          />
        </>
      )}
    </>
  );
}
