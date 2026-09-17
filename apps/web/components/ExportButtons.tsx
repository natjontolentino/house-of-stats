"use client";

export function ExportButtons({ gameId }: { gameId: string }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
      <a
        href={`/api/games/${gameId}/export.pdf`}
        target="_blank"
        rel="noreferrer"
        style={secondaryButtonStyle}
      >
        PDF scoresheet
      </a>
      <a
        href={`/api/games/${gameId}/export.jpg`}
        target="_blank"
        rel="noreferrer"
        style={primaryButtonStyle}
      >
        Share graphic
      </a>
    </div>
  );
}

const buttonBase: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  padding: "11px 14px",
  borderRadius: "var(--radius-sm)",
  textDecoration: "none",
  fontSize: 13.5,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonBase,
  border: "1px solid var(--border-strong)",
  background: "var(--panel)",
  color: "var(--text)",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonBase,
  border: "1px solid var(--accent-dark)",
  background: "var(--accent)",
  color: "white",
};
