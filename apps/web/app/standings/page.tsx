import { fetchSeasonStats } from "../../lib/seasonData";
import { StandingsTable } from "../../components/StandingsTable";
import { SEED_SEASON_ID } from "@courtstats/shared";

export const dynamic = "force-dynamic";

/**
 * Standings computed from every finalized game's actual score via the shared
 * computeStandings. This page is still scoped to the original seeded season;
 * every league's own standings are on its page at /leagues/[slug].
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
        <StandingsTable standings={standings} teamsById={teamsById} />
      )}
    </main>
  );
}
