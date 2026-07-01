import { FollowersTrendChart } from "@/components/charts/followers-trend";
import { Metrics, PageHead, Pill, SectionHead } from "@/components/dashboard/ui";
import { socialByNetwork, socialMetrics } from "@/lib/social-data";

export const metadata = { title: "FlyTop OS · Social Media" };

export default function SocialPage() {
  return (
    <>
      <PageHead
        eyebrow="Marketing · presença"
        title="Social Media"
        sub="Audiência, alcance e engajamento · maio 2026"
        right={<Pill tone="blue">Gestão Elev</Pill>}
      />

      <Metrics metrics={socialMetrics} />

      <div className="section">
        <SectionHead title="Tendência de novos seguidores" sub="últimos 6 meses" />
        <div className="glass chart-card">
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-line ll-blue" />
              Novos seguidores por mês
            </span>
          </div>
          <FollowersTrendChart />
        </div>
      </div>

      <div className="section">
        <div className="glass card">
          <SectionHead title="Por rede social" sub="maio 2026" flush />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Rede</th>
                  <th className="r">Seguidores</th>
                  <th className="r">Novos</th>
                  <th className="r">Posts</th>
                  <th className="r">Engajamento</th>
                </tr>
              </thead>
              <tbody>
                {socialByNetwork.map((row) => (
                  <tr key={row.network}>
                    <td>{row.network}</td>
                    <td className="r">{row.followers}</td>
                    <td className="r">{row.newFollowers}</td>
                    <td className="r">{row.posts}</td>
                    <td className="r">{row.engagement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
          <b>Presença orgânica:</b> seguidores, alcance e impressões vêm das redes
          sociais. <b>Novos seguidores</b> e a <b>tendência</b> mostram o ritmo de
          crescimento da audiência mês a mês.
        </div>
      </div>
    </>
  );
}
