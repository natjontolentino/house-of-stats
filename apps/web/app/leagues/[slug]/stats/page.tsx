import Link from "next/link";
import { notFound } from "next/navigation";
import { displayPlayerName } from "@courtstats/shared";
import { fetchLeagueBySlug } from "../../../../lib/leaguePage";
import { PLAYER_COLUMNS, TEAM_COLUMNS, sortRows } from "../../../../lib/seasonColumns";
import { TeamLogo } from "../../../../components/TeamLogo";

export const dynamic = "force-dynamic";

function headerHref(slug: string, playerSort: string, teamSort: string, change: { sort?: string; tsort?: string }) {
  const params = new URLSearchParams({ sort: playerSort, tsort: teamSort, ...change });
  return `/leagues/${slug}/stats?${params.toString()}`;
}

export default async function SeasonStatsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { sort?: string; tsort?: string };
}) {
  const data = await fetchLeagueBySlug(params.slug);
  if (!data) notFound();
  const { league, season, stats } = data;

  const playerSort = PLAYER_COLUMNS.some((c) => c.key === searchParams.sort) ? searchParams.sort! : "pts";
  const teamSort = TEAM_COLUMNS.some((c) => c.key === searchParams.tsort) ? searchParams.tsort! : "pts";

  const players = stats ? sortRows(stats.players, PLAYER_COLUMNS, playerSort, "pts") : [];
  const teams = stats ? sortRows(stats.teamStats, TEAM_COLUMNS, teamSort, "pts") : [];
  const teamsById = stats?.teamsById ?? {};
  const hasData = players.length > 0;

  return (
    <main className="page">
      <p style={{ margin: "4px 0 8px", fontSize: 13 }}>
        <Link href={`/leagues/${league.slug}`}>← {league.name}</Link>
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Season stats</h1>
        {hasData && (
          <a href={`/api/leagues/${league.slug}/season.pdf`} className="button-secondary">
            Download PDF
          </a>
        )}
      </div>
      <p style={{ color: "var(--muted)", margin: "0 0 20px", fontSize: 14 }}>
        {league.name}
        {season ? ` · ${season.name}` : ""} · per-game averages from finalized games. Click a column to sort.
      </p>

      {!hasData ? (
        <p className="card" style={{ padding: 16, color: "var(--muted)" }}>
          No finalized games yet — season stats will appear once the first game is finalized.
        </p>
      ) : (
        <>
          <h2 className="section-title">Team averages</h2>
          <div className="card" style={{ overflowX: "auto", padding: "4px 4px", marginBottom: 28 }}>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  {TEAM_COLUMNS.map((c) => (
                    <th key={c.key}>
                      <Link
                        href={headerHref(league.slug, playerSort, teamSort, { tsort: c.key })}
                        style={{ color: "inherit", fontWeight: c.key === teamSort ? 800 : undefined }}
                      >
                        {c.label}
                        {c.key === teamSort ? " ▾" : ""}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => {
                  const team = teamsById[t.teamId];
                  return (
                    <tr key={t.teamId}>
                      <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <TeamLogo url={team?.logo_url} />
                          {team?.name ?? "?"}
                        </span>
                      </td>
                      {TEAM_COLUMNS.map((c) => (
                        <td key={c.key}>{c.format(t)}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 className="section-title">Player averages</h2>
          <div className="card" style={{ overflowX: "auto", padding: "4px 4px" }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Team</th>
                  {PLAYER_COLUMNS.map((c) => (
                    <th key={c.key}>
                      <Link
                        href={headerHref(league.slug, playerSort, teamSort, { sort: c.key })}
                        style={{ color: "inherit", fontWeight: c.key === playerSort ? 800 : undefined }}
                      >
                        {c.label}
                        {c.key === playerSort ? " ▾" : ""}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  const player = stats!.playersById[p.playerId];
                  return (
                    <tr key={p.playerId}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        {player ? displayPlayerName(player, stats!.settings) : "?"}
                      </td>
                      <td>{teamsById[p.teamId]?.short_name ?? "?"}</td>
                      {PLAYER_COLUMNS.map((c) => (
                        <td key={c.key}>{c.format(p)}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 10 }}>
            GP = games played. MIN shows a dash when the league ran without a game clock. Percentages are total makes
            over total attempts, and a dash means no attempts. EFF = (PTS + REB + AST + STL + BLK) − missed FG − missed
            FT − TO, per game.
          </p>
        </>
      )}
    </main>
  );
}
