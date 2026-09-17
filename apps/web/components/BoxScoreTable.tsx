import type { GameBundle } from "../lib/gameData";
import type { LiveGameState } from "@courtstats/shared";
import { computeTeamTotalsFromPlayers, msToMinutesDisplay, displayPlayerName } from "@courtstats/shared";

function pctDisplay(pct: number | null): string {
  return pct === null ? "-" : `${Math.round(pct * 100)}%`;
}

export function BoxScoreTable({
  bundle,
  teamId,
  liveState,
}: {
  bundle: GameBundle;
  teamId: string;
  liveState: LiveGameState;
}) {
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
            <th>MIN</th>
          </tr>
        </thead>
        <tbody>
          {playerIds.map((playerId) => {
            const p = liveState.players[playerId];
            const player = bundle.players[playerId];
            if (!p || !player) return null;
            return (
              <tr key={playerId} style={{ opacity: p.onCourt ? 1 : 0.55 }}>
                <td>{bundle.jerseyByPlayer[playerId]}</td>
                <td>{displayPlayerName(player, bundle.settings)}</td>
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
                <td>{p.minutesMs !== null ? msToMinutesDisplay(p.minutesMs) : "-"}</td>
              </tr>
            );
          })}
          <tr style={{ fontStyle: "italic", background: "rgba(0,0,0,0.025)" }}>
            <td></td>
            <td>Team</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>
              {teamLine?.reboundsOffensive ?? 0}/{teamLine?.reboundsDefensive ?? 0}
            </td>
            <td></td>
            <td></td>
            <td></td>
            <td>{teamLine?.turnovers ?? 0}</td>
            <td></td>
            <td>{teamLine?.benchWtLabel}</td>
            <td></td>
            <td></td>
          </tr>
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
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
