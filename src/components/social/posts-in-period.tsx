import type { CSSProperties } from "react";
import { type PostType, postsInPeriod, postsTotals } from "@/lib/social-data";

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

/** Curtidas + comentários lado a lado (coração vermelho, balão azul). */
function EngagementStats({
  likes,
  comments,
  bold,
}: {
  likes: number;
  comments: number;
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
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 18 }}>
      <span style={chip}>
        <svg
          viewBox="0 0 24 24"
          {...sw}
          style={{ width: 17, height: 17, color: "var(--accent-red)" }}
          aria-hidden="true"
        >
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
        {likes}
      </span>
      <span style={chip}>
        <svg
          viewBox="0 0 24 24"
          {...sw}
          style={{ width: 17, height: 17, color: "var(--accent-blue)" }}
          aria-hidden="true"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 20.5l1.4-4.2A8.4 8.4 0 1 1 21 11.5z" />
        </svg>
        {comments}
      </span>
    </div>
  );
}

/** Lista de posts do período, no estilo do painel de social media. */
export function PostsInPeriod() {
  return (
    <div className="section">
      <div className="glass card">
        <div className="section-head flush" style={{ alignItems: "center" }}>
          <span className="section-title">
            Posts no período{" "}
            <span className="muted" style={{ fontWeight: 500 }}>
              ({postsTotals.count})
            </span>
          </span>
          <EngagementStats
            likes={postsTotals.likes}
            comments={postsTotals.comments}
            bold
          />
        </div>

        <div className="list" style={{ marginTop: 14 }}>
          {postsInPeriod.map((post) => (
            <div className="list-row" key={post.datetime}>
              <span style={iconBox}>
                <MediaIcon type={post.type} />
              </span>
              <div className="list-main">
                <div className="list-name">
                  {post.datetime}{" "}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    {post.type}
                  </span>
                </div>
              </div>
              <EngagementStats likes={post.likes} comments={post.comments} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
