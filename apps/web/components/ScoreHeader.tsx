import type { GameBundle } from "../lib/gameData";
import type { LiveGameState } from "@courtstats/shared";

function minutesAgo(date: Date): number {
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

export function ScoreHeader({
  bundle,
  liveState,
  gameStatus,
  isStale,
  lastEventAt,
}: {
  bundle: GameBundle;
  liveState: LiveGameState;
  gameStatus: string;
  isStale: boolean;
  lastEventAt: Date | null;
}) {
  const isFinal = gameStatus === "finalized";
  const hasStarted = lastEventAt !== null;

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        background: "linear-gradient(155deg, var(--navy), var(--navy-light))",
        borderRadius: "var(--radius)",
        padding: "22px 20px",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <TeamScore name={bundle.awayTeam.name} short={bundle.awayTeam.short_name} score={liveState.away.score} />

      <div style={{ textAlign: "center", minWidth: 92 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          {isFinal ? "Final" : hasStarted ? `Period ${liveState.currentPeriod}` : "Upcoming"}
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5 }}>
          {isFinal ? (
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Game complete</span>
          ) : !hasStarted ? (
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Not started</span>
          ) : isStale ? (
            <span className="badge badge--stale">{`Updated ${minutesAgo(lastEventAt)}m ago`}</span>
          ) : (
            <span className="badge badge--live">Live</span>
          )}
        </div>
      </div>

      <TeamScore name={bundle.homeTeam.name} short={bundle.homeTeam.short_name} score={liveState.home.score} />
    </header>
  );
}

function TeamScore({ name, short, score }: { name: string; short: string; score: number }) {
  return (
    <div style={{ textAlign: "center", minWidth: 92 }}>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 600 }} title={name}>
        {short}
      </div>
      <div style={{ marginTop: 2, fontSize: 40, fontVariantNumeric: "tabular-nums", fontWeight: 800, color: "white", lineHeight: 1 }}>
        {score}
      </div>
    </div>
  );
}
