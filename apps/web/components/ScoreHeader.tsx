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

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "16px 20px",
      }}
    >
      <TeamScore name={bundle.awayTeam.name} short={bundle.awayTeam.short_name} score={liveState.away.score} />

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>
          {isFinal ? "Final" : `Period ${liveState.currentPeriod}`}
        </div>
        <div style={{ marginTop: 4, fontSize: 13 }}>
          {isFinal ? (
            <span style={{ color: "var(--muted)" }}>Game complete</span>
          ) : isStale ? (
            <span style={{ color: "var(--amber)" }}>
              {lastEventAt ? `Last updated ${minutesAgo(lastEventAt)} min ago` : "Not started"}
            </span>
          ) : (
            <span style={{ color: "var(--green)" }}>● Live</span>
          )}
        </div>
      </div>

      <TeamScore name={bundle.homeTeam.name} short={bundle.homeTeam.short_name} score={liveState.home.score} />
    </header>
  );
}

function TeamScore({ name, short, score }: { name: string; short: string; score: number }) {
  return (
    <div style={{ textAlign: "center", minWidth: 100 }}>
      <div style={{ fontSize: 13, color: "var(--muted)" }} title={name}>
        {short}
      </div>
      <div style={{ fontSize: 32, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{score}</div>
    </div>
  );
}
