"use client";

export function ExportButtons({ gameId }: { gameId: string }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
      <a
        href={`/api/games/${gameId}/export.pdf`}
        target="_blank"
        rel="noreferrer"
        style={buttonStyle}
      >
        Download PDF scoresheet
      </a>
      <a
        href={`/api/games/${gameId}/export.jpg`}
        target="_blank"
        rel="noreferrer"
        style={buttonStyle}
      >
        Share graphic (JPEG)
      </a>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--panel)",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 600,
};
