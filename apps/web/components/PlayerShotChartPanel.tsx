"use client";

import { useState } from "react";
import type { ShotZoneStats } from "@courtstats/shared";
import { ShotChart } from "./ShotChart";
import type { ZoneStatsByScope } from "../lib/playerPage";

/**
 * Shot chart for a player's page: this player or their whole team, across the
 * season or any single game. Everything is precomputed on the server so the
 * browser never downloads a season's worth of raw events.
 */
export function PlayerShotChartPanel({
  playerName,
  playerZones,
  teamZones,
  games,
}: {
  playerName: string;
  playerZones: ZoneStatsByScope;
  teamZones: ZoneStatsByScope;
  games: Array<{ gameId: string; label: string }>;
}) {
  const [scope, setScope] = useState<"player" | "team">("player");
  const [range, setRange] = useState<string>("season"); // "season" or a game id

  const zones = scope === "player" ? playerZones : teamZones;
  const stats: ShotZoneStats = range === "season" ? zones.season : (zones.byGame[range] ?? zones.season);

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="seg" role="group" aria-label="Whose shots">
          <button type="button" className={`seg__btn${scope === "player" ? " seg__btn--on" : ""}`} onClick={() => setScope("player")}>
            {playerName}
          </button>
          <button type="button" className={`seg__btn${scope === "team" ? " seg__btn--on" : ""}`} onClick={() => setScope("team")}>
            Whole team
          </button>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
          Showing
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--panel)", color: "var(--text)", fontSize: 13 }}
          >
            <option value="season">Whole season</option>
            {games.map((g) => (
              <option key={g.gameId} value={g.gameId}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ShotChart
        stats={stats}
        emptyMessage={range === "season" ? "No shots recorded this season yet." : "No shots recorded in this game."}
      />
    </div>
  );
}
