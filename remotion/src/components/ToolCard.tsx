import type { CSSProperties } from "react";
import { BRAND, TYPE, type ToolCardData, type ToolCardRow } from "../data";

function toneColor(tone?: ToolCardRow["tone"]) {
  if (tone === "amber") return BRAND.amber;
  if (tone === "teal") return BRAND.teal;
  if (tone === "muted") return "#728099";
  return BRAND.ink;
}

export function ToolCard({
  card,
  compact = false,
  style,
}: {
  card: ToolCardData;
  compact?: boolean;
  style?: CSSProperties;
}) {
  const rows = card.rows.slice(0, 5);
  const width = compact ? 790 : 886;
  const height = compact ? (rows.length > 4 ? 620 : rows.length > 2 ? 560 : 410) : 930;
  const headerHeight = compact ? 78 : 128;
  const footHeight = card.footnote ? (compact ? 68 : 92) : compact ? 18 : 34;
  const rowHeight = (height - headerHeight - footHeight) / Math.max(1, rows.length);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        border: compact ? "none" : `3px solid ${BRAND.ink}`,
        borderRadius: compact ? 24 : 28,
        overflow: "hidden",
        background: BRAND.paper,
        color: BRAND.ink,
        boxShadow: compact ? "14px 16px 0 rgba(0,0,0,0.18)" : "12px 14px 0 rgba(0,33,113,0.09)",
        ...style,
      }}
    >
      <div
        style={{
          height: headerHeight,
          padding: compact ? "0 30px" : "0 36px",
          display: "flex",
          alignItems: "center",
          background: BRAND.ink,
          color: "#9FE9DD",
          fontFamily: TYPE.ui,
          fontSize: compact ? 20 : 24,
          fontWeight: 830,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        {card.title}
      </div>
      <div style={{ padding: compact ? "0 30px" : "0 36px" }}>
        {rows.map((row, index) => {
          const color = toneColor(row.tone);
          const isTotal = Boolean(row.total);
          const valueSize = row.valueSize === "small"
            ? (compact ? 30 : 38)
            : isTotal ? (compact ? 46 : 64) : (compact ? 42 : 58);
          return (
            <div
              key={`${row.label}-${row.value}`}
              style={{
                height: rowHeight,
                boxSizing: "border-box",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                alignItems: "center",
                gap: compact ? 24 : 32,
                borderTop: isTotal ? `${compact ? 3 : 4}px solid ${BRAND.ink}` : undefined,
                borderBottom: index < rows.length - 1 ? `2px solid ${BRAND.hairline}` : undefined,
                background: isTotal ? "rgba(0,137,123,0.065)" : undefined,
                marginLeft: isTotal ? (compact ? -30 : -36) : 0,
                marginRight: isTotal ? (compact ? -30 : -36) : 0,
                paddingLeft: isTotal ? (compact ? 30 : 36) : 0,
                paddingRight: isTotal ? (compact ? 30 : 36) : 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: compact ? 14 : 18, minWidth: 0 }}>
                <div style={{ width: compact ? 9 : 12, height: compact ? 46 : 72, flex: "none", borderRadius: 8, background: color }} />
                <div style={{ fontFamily: TYPE.ui, fontSize: compact ? 22 : 29, lineHeight: 1.14, fontWeight: isTotal ? 880 : 780, color }}>{row.label}</div>
              </div>
              <div style={{ fontFamily: TYPE.ui, fontSize: valueSize, lineHeight: 1, fontWeight: isTotal ? 900 : 850, letterSpacing: "-0.04em", color, whiteSpace: "nowrap" }}>{row.value}</div>
            </div>
          );
        })}
      </div>
      {card.footnote && (
        <div style={{ position: "absolute", left: compact ? 30 : 36, right: compact ? 30 : 36, bottom: compact ? 14 : 24, fontFamily: TYPE.ui, fontSize: compact ? 18 : 23, lineHeight: 1.28, fontWeight: 570, color: BRAND.inkMuted }}>
          {card.footnote}
        </div>
      )}
    </div>
  );
}
