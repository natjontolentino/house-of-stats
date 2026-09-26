import Link from "next/link";
import { fetchSeasonStats } from "../../lib/seasonData";
import { fetchLeagueSummaries } from "../../lib/leagueSummary";
import { StandingsTable } from "../../components/StandingsTable";

export const dynamic = "force-dynamic";

/** Standings for every active league, each computed from that league's finalized games via the shared computeStandings. */
export default async function StandingsPage() {
  const leagues = await fetchLeagueSummaries();
  const results = await Promise.all(
    leagues.map(async (l) => ({ league: l, stats: l.seasonId ? await fetchSeasonStats(l.seasonId) : null })),
  );

  return (
    <main className="page">
      <h1 style={{ fontSize: 24, margin: "4px 0 4px" }}>Standings</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 20px", fontSize: 14 }}>
        Computed from every finalized game this season.
      </p>

      {results.map(({ league, stats }) => (
        <section key={league.id} style={{ marginBottom: 28 }}>
          <h2 className="section-title">
            <Link href={`/leagues/${league.slug}`} style={{ color: "inherit" }}>
              {league.name}
            </Link>
            {league.seasonName ? ` · ${league.seasonName}` : ""}
          </h2>
          {stats && stats.standings.length > 0 ? (
            <StandingsTable standings={stats.standings} teamsById={stats.teamsById} />
          ) : (
            <p className="card" style={{ padding: 16, color: "var(--muted)" }}>
              No finalized games yet — standings will appear once the first game is finalized.
            </p>
          )}
        </section>
      ))}
    </main>
  );
}
