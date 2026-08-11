import type { CSSProperties } from "react";
import {
  type PostRow,
  type PostType,
  postsInPeriod,
  postsTotals,
} from "@/lib/social-data";

const sw = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Ícone do tipo de mídia do post. */
function MediaIcon({ type }: { type: PostType }) {
  if (type === "Video") {
    return (
      <svg viewBox="0 0 24 24" {...sw} aria-hidden="true">
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="M16 10l6-3v10l-6-3z" />
      </svg>
    );
  }
  if (type === "Carousel Album") {
    return (
      <svg viewBox="0 0 24 24" {...sw} aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  // Image
  return (
    <svg viewBox="0 0 24 24" {...sw} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

const iconBox: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: "1px solid rgba(16,24,40,0.08)",
  background: "#fff",
  color: "var(--text-3)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

/**
 * Curtidas, comentários, compartilhamentos e salvamentos lado a lado.
 * Compartilhamentos/salvamentos só aparecem quando o dado existe (insights).
 */
function EngagementStats({
  likes,
  comments,
  shares,
  saves,
  bold,
}: {
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  bold?: boolean;
}) {
  const chip: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    fontWeight: bold ? 700 : 600,
    color: "var(--text-1)",
    fontVariantNumeric: "tabular-nums",
  };
  const icon = (color: string): CSSProperties => ({
    width: 17,
    height: 17,
    color,
  });
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
      <span style={chip} title="Curtidas">
        <svg viewBox="0 0 24 24" {...sw} style={icon("var(--accent-red)")} aria-hidden="true">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
        {likes}
      </span>
      <span style={chip} title="Comentários">
        <svg viewBox="0 0 24 24" {...sw} style={icon("var(--accent-blue)")} aria-hidden="true">
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 20.5l1.4-4.2A8.4 8.4 0 1 1 21 11.5z" />
        </svg>
        {comments}
      </span>
      {shares !== undefined && (
        <span style={chip} title="Compartilhamentos">
          <svg viewBox="0 0 24 24" {...sw} style={icon("var(--accent-green)")} aria-hidden="true">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          {shares}
        </span>
      )}
      {saves !== undefined && (
        <span style={chip} title="Salvamentos">
          <svg viewBox="0 0 24 24" {...sw} style={icon("var(--accent-orange)")} aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {saves}
        </span>
      )}
    </div>
  );
}

const thumbStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 9,
  objectFit: "cover",
  border: "1px solid rgba(16,24,40,0.08)",
  flexShrink: 0,
  background: "#f6f7f9",
};

/**
 * Lista de posts do período, no estilo do painel de social media.
 * Sem props usa os dados ilustrativos. Posts com permalink abrem no Instagram.
 */
export function PostsInPeriod({
  posts = postsInPeriod,
  totals = postsTotals,
}: {
  posts?: PostRow[];
  totals?: {
    count: number;
    likes: number;
    comments: number;
    shares?: number;
    saves?: number;
  };
}) {
  return (
    <div className="section">
      <div className="glass card">
        <div className="section-head flush" style={{ alignItems: "center" }}>
          <span className="section-title">
            Posts no período{" "}
            <span className="muted" style={{ fontWeight: 500 }}>
              ({totals.count})
            </span>
          </span>
          <EngagementStats
            likes={totals.likes}
            comments={totals.comments}
            shares={totals.shares}
            saves={totals.saves}
            bold
          />
        </div>

        <div className="list" style={{ marginTop: 14 }}>
          {posts.map((post, i) => {
            const content = (
              <>
                {post.thumb ? (
                  // A CDN do Instagram assina a URL e ela expira; next/image
                  // não agrega aqui e exigiria liberar domínios variáveis.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.thumb} alt="" style={thumbStyle} />
                ) : (
                  <span style={iconBox}>
                    <MediaIcon type={post.type} />
                  </span>
                )}
                <div className="list-main">
                  <div className="list-name">
                    {post.datetime}{" "}
                    <span className="muted" style={{ fontWeight: 400 }}>
                      {post.type}
                    </span>
                  </div>
                </div>
                <EngagementStats
                  likes={post.likes}
                  comments={post.comments}
                  shares={post.shares}
                  saves={post.saves}
                />
              </>
            );
            return post.permalink ? (
              <a
                className="list-row"
                key={i}
                href={post.permalink}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {content}
              </a>
            ) : (
              <div className="list-row" key={i}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
