import type { StandingsRow, Team } from "@courtstats/shared";
import { TeamLogo } from "./TeamLogo";

function streakColor(streak: string): string {
  if (streak.startsWith("W")) return "var(--green)";
  if (streak.startsWith("L")) return "var(--red)";
  return "var(--muted)";
}

export function StandingsTable({ standings, teamsById }: { standings: StandingsRow[]; teamsById: Record<string, Team> }) {
  return (
    <div className="card" style={{ overflowX: "auto", padding: "4px 4px" }}>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>GP</th>
            <th>W</th>
            <th>L</th>
            <th>PCT</th>
            <th>PF</th>
            <th>PA</th>
            <th>DIFF</th>
            <th>Streak</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const team = teamsById[row.teamId];
            return (
              <tr key={row.teamId}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 700 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <TeamLogo url={team?.logo_url} />
                    {team?.name ?? row.teamId}
                  </span>
                </td>
                <td>{row.gamesPlayed}</td>
                <td>{row.wins}</td>
                <td>{row.losses}</td>
                <td>{row.winPct.toFixed(3).replace(/^0/, "")}</td>
                <td>{row.pointsFor}</td>
                <td>{row.pointsAgainst}</td>
                <td>{row.differential > 0 ? `+${row.differential}` : row.differential}</td>
                <td style={{ color: streakColor(row.streak), fontWeight: 700 }}>{row.streak}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
