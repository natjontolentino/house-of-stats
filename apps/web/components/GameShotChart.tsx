"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { computeShotZoneStats, type GameEvent } from "@courtstats/shared";
import { ShotChart } from "./ShotChart";

/**
 * One game's shot chart for a player, with a switch to the player's whole
 * team. Computed in the browser from the events the game page already holds,
 * so it stays live as plays come in. The season view lives on the player's
 * own page (linked below) since it needs every game's events.
 */
export function GameShotChart({
  events,
  playerId,
  teamId,
  playerName,
}: {
  events: GameEvent[];
  playerId: string;
  teamId: string;
  playerName: string;
}) {
  const [scope, setScope] = useState<"player" | "team">("player");
  const stats = useMemo(
    () => computeShotZoneStats(events, scope === "player" ? { playerId } : { teamId }),
    [events, scope, playerId, teamId],
  );

  return (
    <div style={{ padding: "10px 6px 16px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <div className="seg" role="group" aria-label="Whose shots">
          <button type="button" className={`seg__btn${scope === "player" ? " seg__btn--on" : ""}`} onClick={() => setScope("player")}>
            {playerName}
          </button>
          <button type="button" className={`seg__btn${scope === "team" ? " seg__btn--on" : ""}`} onClick={() => setScope("team")}>
            Whole team
          </button>
        </div>
      </div>
      <ShotChart
        stats={stats}
        emptyMessage={scope === "player" ? "No shots recorded for this player in this game." : "No shots recorded for this team yet."}
      />
      <p style={{ textAlign: "center", fontSize: 13, margin: "12px 0 0" }}>
        <Link href={`/players/${playerId}`}>Season shot chart and averages →</Link>
      </p>
    </div>
  );
}
