import { fetchSeasonStats } from "../../lib/seasonData";
import { TeamLogo } from "../../components/TeamLogo";
import { SEED_SEASON_ID } from "@courtstats/shared";

export const dynamic = "force-dynamic";

function streakColor(streak: string): string {
  if (streak.startsWith("W")) return "var(--green)";
  if (streak.startsWith("L")) return "var(--red)";
  return "var(--muted)";
}

/**
 * Real standings (spec 8.1), computed from every finalized game's actual
 * score via the shared computeStandings -- not placeholder data. Scoped to
 * the one seeded season for now; a season/league picker is Phase 2 work
 * once there's more than one to choose from.
 */
export default async function StandingsPage() {
  const { standings, teamsById } = await fetchSeasonStats(SEED_SEASON_ID);

  return (
    <main className="page">
      <h1 style={{ fontSize: 24, margin: "4px 0 4px" }}>Standings</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 20px", fontSize: 14 }}>
        Computed from every finalized game this season.
      </p>

      {standings.length === 0 ? (
        <p className="card" style={{ padding: 16, color: "var(--muted)" }}>
          No finalized games yet this season — standings will appear once the first game is finalized.
        </p>
      ) : (
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
      )}
    </main>
  );
}
