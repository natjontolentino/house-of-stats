import Link from "next/link";
import { displayPlayerName, minimumGamesForRanking, rankTopPlayers } from "@courtstats/shared";
import type { SeasonStatsResult } from "../lib/seasonData";
import { PlayerAvatar } from "./PlayerAvatar";

function one(value: number): string {
  return value.toFixed(1);
}

/**
 * The league's top players by efficiency (EFF) per game. EFF rolls points,
 * rebounds, assists, steals and blocks into one number and subtracts misses
 * and turnovers, so it is the closest thing to an overall rating.
 */
export function TopPlayersTable({ stats, leagueSlug }: { stats: SeasonStatsResult; leagueSlug: string }) {
  const gamesByTeam = Object.fromEntries(stats.teamStats.map((t) => [t.teamId, t.gamesPlayed]));
  const ranked = rankTopPlayers(stats.players, gamesByTeam, 10);
  const mostTeamGames = Math.max(0, ...stats.teamStats.map((t) => t.gamesPlayed));

  if (ranked.length === 0) {
    return (
      <p className="card" style={{ padding: 16, color: "var(--muted)", marginBottom: 28 }}>
        The top 10 appears once players have played at least half of their team&apos;s games.
      </p>
    );
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div className="card" style={{ overflowX: "auto", padding: "4px 4px" }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Team</th>
              <th>GP</th>
              <th>PTS</th>
              <th>REB</th>
              <th>AST</th>
              <th>EFF</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ rank, line }) => {
              const player = stats.playersById[line.playerId];
              return (
                <tr key={line.playerId}>
                  <td style={{ fontWeight: 800 }}>{rank}</td>
                  <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    <Link
                      href={`/players/${line.playerId}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "inherit", textDecoration: "none" }}
                    >
                      <PlayerAvatar name={player?.full_name ?? "?"} photoUrl={player?.photo_url} size={26} />
                      {player ? displayPlayerName(player, stats.settings) : "?"}
                    </Link>
                  </td>
                  <td>{stats.teamsById[line.teamId]?.short_name ?? "?"}</td>
                  <td>{line.gamesPlayed}</td>
                  <td>{one(line.pointsPerGame)}</td>
                  <td>{one(line.reboundsPerGame)}</td>
                  <td>{one(line.assistsPerGame)}</td>
                  <td style={{ fontWeight: 800 }}>{one(line.efficiencyPerGame)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "8px 2px 0" }}>
        Ranked by EFF per game = (PTS + REB + AST + STL + BLK) − missed shots − missed free throws − turnovers. Players need to have
        played at least half of their team&apos;s games (currently {minimumGamesForRanking(mostTeamGames)} of {mostTeamGames}).{" "}
        <Link href={`/leagues/${leagueSlug}/stats`}>All player averages →</Link>
      </p>
    </div>
  );
}
