"use client";

import { Fragment, useState } from "react";
import type { GameBundle } from "../lib/gameData";
import type { GameEvent, LiveGameState } from "@courtstats/shared";
import { computeTeamTotalsFromPlayers, msToMinutesDisplay, displayPlayerName } from "@courtstats/shared";
import { GameShotChart } from "./GameShotChart";

function pctDisplay(pct: number | null): string {
  return pct === null ? "-" : `${Math.round(pct * 100)}%`;
}

export function BoxScoreTable({
  bundle,
  teamId,
  liveState,
  events,
}: {
  bundle: GameBundle;
  teamId: string;
  liveState: LiveGameState;
  /** The game's events; each player's name expands into their shot chart. */
  events: GameEvent[];
}) {
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  const playerIds = bundle.rosterByTeam[teamId] ?? [];
  const teamLine = liveState.teams[teamId];
  const totals = computeTeamTotalsFromPlayers(teamId, liveState.players, teamLine);

  return (
    <div className="card" style={{ overflowX: "auto", padding: "4px 4px" }}>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>PTS</th>
            <th>2PT</th>
            <th>3PT</th>
            <th>FT</th>
            <th>REB</th>
            <th>AST</th>
            <th>STL</th>
            <th>BLK</th>
            <th>TO</th>
            <th>PF</th>
            <th>W/T</th>
            <th>+/-</th>
            <th>EFF</th>
            <th>MIN</th>
          </tr>
        </thead>
        <tbody>
          {playerIds.map((playerId) => {
            const p = liveState.players[playerId];
            const player = bundle.players[playerId];
            if (!p || !player) return null;
            const open = openPlayerId === playerId;
            const name = displayPlayerName(player, bundle.settings);
            return (
              <Fragment key={playerId}>
              <tr style={{ opacity: p.onCourt ? 1 : 0.55 }}>
                <td>{bundle.jerseyByPlayer[playerId]}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => setOpenPlayerId(open ? null : playerId)}
                    aria-expanded={open}
                    title="Show shot chart"
                    style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    {name}
                    <span aria-hidden="true" style={{ fontSize: 10, color: "var(--muted-light)" }}>
                      {open ? "▲" : "▼"}
                    </span>
                  </button>
                </td>
                <td>{p.points}</td>
                <td>
                  {p.twoPointMade}/{p.twoPointAttempted}
                </td>
                <td>
                  {p.threePointMade}/{p.threePointAttempted}
                </td>
                <td>
                  {p.ftMade}/{p.ftAttempted}
                </td>
                <td>{p.reboundsTotal}</td>
                <td>{p.assists}</td>
                <td>{p.steals}</td>
                <td>{p.blocks}</td>
                <td>{p.turnovers}</td>
                <td>{p.personalFouls}</td>
                <td>{p.wtLabel}</td>
                <td>{p.plusMinus > 0 ? `+${p.plusMinus}` : p.plusMinus}</td>
                <td>{p.efficiency}</td>
                <td>{p.minutesMs !== null ? msToMinutesDisplay(p.minutesMs) : "-"}</td>
              </tr>
              {open && (
                <tr>
                  <td colSpan={16} style={{ background: "rgba(0,0,0,0.02)" }}>
                    <GameShotChart events={events} playerId={playerId} teamId={teamId} playerName={name} />
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
          <tr style={{ fontWeight: 700, background: "rgba(0,0,0,0.04)" }}>
            <td></td>
            <td>Totals</td>
            <td>{totals.points}</td>
            <td>
              {totals.fieldGoalMade - totals.threePointMade}/
              {totals.fieldGoalAttempted - totals.threePointAttempted}
            </td>
            <td>
              {totals.threePointMade}/{totals.threePointAttempted} ({pctDisplay(
                totals.threePointAttempted > 0 ? totals.threePointMade / totals.threePointAttempted : null,
              )})
            </td>
            <td>
              {totals.ftMade}/{totals.ftAttempted}
            </td>
            <td>{totals.reboundsOffensive + totals.reboundsDefensive}</td>
            <td>{totals.assists}</td>
            <td>{totals.steals}</td>
            <td>{totals.blocks}</td>
            <td>{totals.turnovers}</td>
            <td>{totals.personalFouls}</td>
            <td>{teamLine?.benchWtLabel}</td>
            <td></td>
            <td>{playerIds.reduce((sum, id) => sum + (liveState.players[id]?.efficiency ?? 0), 0)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
