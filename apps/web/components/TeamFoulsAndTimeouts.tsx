import type { GameBundle } from "../lib/gameData";
import type { LiveGameState } from "@courtstats/shared";

function statusColor(status: "normal" | "amber" | "red"): string {
  if (status === "red") return "var(--red)";
  if (status === "amber") return "var(--amber)";
  return "var(--muted)";
}

export function TeamFoulsAndTimeouts({
  bundle,
  liveState,
}: {
  bundle: GameBundle;
  liveState: LiveGameState;
}) {
  return (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", marginTop: 14, gap: 16, padding: "14px 18px" }}>
      <TeamPanel name={bundle.awayTeam.short_name} team={liveState.away} />
      <TeamPanel name={bundle.homeTeam.short_name} team={liveState.home} align="right" />
    </div>
  );
}

function TeamPanel({
  name,
  team,
  align = "left",
}: {
  name: string;
  team: LiveGameState["home"];
  align?: "left" | "right";
}) {
  const color = statusColor(team.penaltyStatus);
  return (
    <div style={{ flex: 1, textAlign: align }}>
      <div style={{ fontSize: 12.5, color, fontWeight: 700 }}>
        {name} fouls: {team.teamFoulCount}
        {team.penaltyStatus === "red" ? " — Penalty" : team.penaltyStatus === "amber" ? " — Bonus next foul" : ""}
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 6, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        {team.timeoutBoxes.map((box) => (
          <span
            key={box.slot_index}
            title={box.status}
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              border:
                box.status === "locked"
                  ? "1px dashed var(--border-strong)"
                  : box.status === "used" || box.status === "expired"
                    ? `1.5px solid ${color === "var(--muted)" ? "var(--red)" : color}`
                    : "1.5px solid var(--border-strong)",
              background: box.status === "used" ? "var(--red-bg)" : box.status === "locked" ? "var(--bg)" : "transparent",
              color: box.status === "used" || box.status === "expired" ? "var(--red)" : "var(--muted-light)",
              opacity: box.status === "locked" ? 0.6 : 1,
            }}
          >
            {box.status === "used" ? "✓" : box.status === "expired" ? "✕" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
