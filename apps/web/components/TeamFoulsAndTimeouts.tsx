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
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 16 }}>
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
  return (
    <div style={{ flex: 1, textAlign: align }}>
      <div style={{ fontSize: 12, color: statusColor(team.penaltyStatus), fontWeight: 600 }}>
        {name} fouls: {team.teamFoulCount}
        {team.penaltyStatus === "red" ? " — Penalty" : team.penaltyStatus === "amber" ? " — Bonus next foul" : ""}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        {team.timeoutBoxes.map((box) => (
          <span
            key={box.slot_index}
            title={box.status}
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              border: box.status === "locked" ? "1px dashed var(--border)" : "1px solid var(--border)",
              background: box.status === "used" ? "var(--muted)" : "transparent",
              color: box.status === "used" ? "white" : "var(--muted)",
            }}
          >
            {box.status === "used" ? "✓" : box.status === "expired" ? "✕" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
