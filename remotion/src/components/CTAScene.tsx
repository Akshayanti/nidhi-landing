import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { BRAND, TYPE, type CTABlock } from "../data";

interface Props {
  cta: CTABlock;
  /** Path to the deeper article ("blog/<slug>"). Rendered as the READ row. */
  blogPath: string;
  /**
   * Optional paired free tool. When present, the READ row becomes a tool
   * pointer ("FREE TOOL · {cta} · nidhi.today{url}") instead of a generic
   * blog URL. Higher signal for the funnel: the viewer sees what the tool
   * does AND where it lives.
   */
  relatedTool?: { url: string; label: string; cta: string };
  /**
   * Optional one-line teaser describing what the blog post delivers beyond
   * the reel. Used as the subtext line in the READ row when no relatedTool
   * is paired ("READ THE FULL POST · {reelPromise} · nidhi.today/blog/X").
   * Without this, the READ row falls back to URL-only ("FULL ARTICLE").
   */
  reelPromise?: string;
}

const CTA_ICON: Record<string, string> = {
  save: "↓",   // bookmark / save down
  tag: "@",    // tag someone
  share: "↗",  // share / outward
  poll: "?",   // poll
};

/**
 * Closing frame.
 *
 * Composition (top → bottom):
 *   1. Big icon (save / tag / share / poll)
 *   2. Big headline (the primary action)
 *   3. Optional subtext (4-10 word reason)
 *   4. Hairline divider
 *   5. READ row (PLAYBOOK.md:413-440 — closer slide always carries a READ)
 *      "FULL ARTICLE" small caps + nidhi.today/<blogPath>
 *   6. Handle row: @nidhi.today + optional "+ FOLLOW" badge with follow ask
 */
export function CTAScene({ cta, blogPath, relatedTool, reelPromise }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineAppear = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const iconScale = spring({ frame: frame - 4, fps, config: { damping: 11, stiffness: 160 } });
  const subAppear = spring({ frame: frame - 14, fps, config: { damping: 14, stiffness: 110 } });
  const readAppear = spring({ frame: frame - 22, fps, config: { damping: 14, stiffness: 110 } });
  const handleAppear = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 110 } });
  const followBadgeAppear = spring({ frame: frame - 36, fps, config: { damping: 12, stiffness: 160 } });

  // Resolve the READ row contents. Priority: relatedTool > reelPromise > fallback.
  // Tool pointer wins because it's the strongest funnel: a free, brand-owned
  // tool addressing the reel's exact problem. The promise line gives a reason
  // to click through when no tool is paired. Fallback keeps the row valid for
  // posts with neither (PLAYBOOK requires a READ pointer on the closer).
  const readRow = (() => {
    if (relatedTool?.url && relatedTool.cta) {
      const path = relatedTool.url.startsWith("/") ? relatedTool.url : `/${relatedTool.url}`;
      return {
        eyebrow: "FREE TOOL",
        line: relatedTool.cta,
        url: `nidhi.today${path}`.replace(/\/+$/, ""),
      };
    }
    const blogUrl = `nidhi.today/${blogPath}`.replace(/\/+$/, "");
    if (reelPromise && reelPromise.trim()) {
      return { eyebrow: "READ THE FULL POST", line: reelPromise.trim(), url: blogUrl };
    }
    return { eyebrow: "FULL ARTICLE", line: null, url: blogUrl };
  })();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 280,
        paddingBottom: 380,
        paddingLeft: 80,
        paddingRight: 80,
      }}
    >
      <div
        style={{
          fontFamily: TYPE.display,
          fontSize: 200,
          fontWeight: 900,
          color: "#9FE9DD",
          lineHeight: 0.85,
          marginBottom: 16,
          transform: `scale(${iconScale})`,
        }}
      >
        {CTA_ICON[cta.approved] ?? "↓"}
      </div>

      <h1
        style={{
          fontFamily: TYPE.display,
          fontSize: TYPE.ctaPrimary,
          fontWeight: 800,
          color: "var(--ink)",
          margin: 0,
          textAlign: "center",
          padding: "0 40px",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          opacity: headlineAppear,
          transform: `translateY(${(1 - headlineAppear) * 18}px)`,
          maxWidth: "100%",
        }}
      >
        {cta.onscreenText}
      </h1>

      {cta.subtext && (
        <div
          style={{
            fontFamily: TYPE.ui,
            fontSize: TYPE.ctaSubtext,
            fontWeight: 500,
            color: "var(--ink-soft)",
            marginTop: 24,
            textAlign: "center",
            padding: "0 40px",
            lineHeight: 1.3,
            opacity: subAppear,
            transform: `translateY(${(1 - subAppear) * 12}px)`,
            maxWidth: 880,
          }}
        >
          {cta.subtext}
        </div>
      )}

      {/* Hairline divider */}
      <div
        style={{
          width: 220,
          height: 1,
          background: "rgba(159,233,221,0.45)",
          marginTop: 60,
          marginBottom: 36,
          transformOrigin: "center",
          transform: `scaleX(${readAppear})`,
        }}
      />

      {/* READ row — required by PLAYBOOK.md:413-440. Contextual: tool > promise > fallback. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          opacity: readAppear,
          transform: `translateY(${(1 - readAppear) * 10}px)`,
          maxWidth: 880,
          padding: "0 40px",
        }}
      >
        <div
          style={{
            fontFamily: TYPE.ui,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "0.28em",
            color: "#9FE9DD",
          }}
        >
          {readRow.eyebrow}
        </div>
        {readRow.line && (
          <div
            style={{
              fontFamily: TYPE.ui,
              fontSize: 32,
              fontWeight: 500,
              color: "var(--ink)",
              textAlign: "center",
              lineHeight: 1.3,
              letterSpacing: "0.005em",
            }}
          >
            {readRow.line}
          </div>
        )}
        <div
          style={{
            fontFamily: TYPE.ui,
            fontSize: 36,
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "0.01em",
            marginTop: readRow.line ? 4 : 0,
            wordBreak: "break-word",
          }}
        >
          {readRow.url}
        </div>
      </div>

      {/* Handle + follow badge */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          marginTop: 64,
          opacity: handleAppear,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontFamily: TYPE.ui,
              fontSize: TYPE.handle,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "var(--ink)",
            }}
          >
            {cta.handle}
          </span>
          {cta.followAsk && (
            <span
              style={{
                fontFamily: TYPE.ui,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "0.16em",
                color: BRAND.ink,
                background: "#9FE9DD",
                padding: "8px 16px",
                borderRadius: 999,
                opacity: followBadgeAppear,
                transform: `scale(${0.9 + followBadgeAppear * 0.1})`,
              }}
            >
              + FOLLOW
            </span>
          )}
        </div>
        {cta.followAsk && (
          <div
            style={{
              fontFamily: TYPE.ui,
              fontSize: 26,
              fontWeight: 500,
              color: "rgba(250,247,242,0.62)",
              letterSpacing: "0.04em",
              textAlign: "center",
              maxWidth: 700,
              opacity: followBadgeAppear,
            }}
          >
            {cta.followAsk}
          </div>
        )}
      </div>
    </div>
  );
}
