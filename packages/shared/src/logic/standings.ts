/**
 * Team standings — spec 8.1 "Standings" page and section 10's
 * `standings_tiebreakers` setting (previously declared but never consumed
 * by any computation — this is that computation). Built from one
 * TeamGameResult per finalized game a team played, not from raw events:
 * the final score for each game already comes from the single shared
 * computeBoxScore/computeLiveGameState call for that game.
 */

export interface TeamGameResult {
  gameId: string;
  teamId: string;
  opponentTeamId: string;
  pointsFor: number;
  pointsAgainst: number;
  /** ISO timestamp — determines chronological order for the streak. */
  playedAt: string;
}

export interface StandingsRow {
  teamId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  differential: number;
  /** "W3", "L2", or "-" for a team with no decided games yet. */
  streak: string;
}

function computeStreak(resultsChronological: TeamGameResult[]): string {
  if (resultsChronological.length === 0) return "-";
  const last = resultsChronological[resultsChronological.length - 1];
  const lastWon = last.pointsFor > last.pointsAgainst;
  let count = 0;
  for (let i = resultsChronological.length - 1; i >= 0; i--) {
    const won = resultsChronological[i].pointsFor > resultsChronological[i].pointsAgainst;
    if (won !== lastWon) break;
    count++;
  }
  return `${lastWon ? "W" : "L"}${count}`;
}

function buildRow(teamId: string, results: TeamGameResult[]): StandingsRow {
  const chronological = [...results].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const wins = results.filter((r) => r.pointsFor > r.pointsAgainst).length;
  // Ties (pointsFor === pointsAgainst) don't happen in basketball at a real
  // final buzzer, but the type doesn't rule it out (e.g. a game finalized
  // early) -- count a tie as neither a win nor a loss rather than silently
  // misclassifying it as one.
  const losses = results.filter((r) => r.pointsFor < r.pointsAgainst).length;
  const pointsFor = results.reduce((s, r) => s + r.pointsFor, 0);
  const pointsAgainst = results.reduce((s, r) => s + r.pointsAgainst, 0);
  const decided = wins + losses;
  return {
    teamId,
    gamesPlayed: results.length,
    wins,
    losses,
    winPct: decided > 0 ? wins / decided : 0,
    pointsFor,
    pointsAgainst,
    differential: pointsFor - pointsAgainst,
    streak: computeStreak(chronological),
  };
}

/** Did `a` beat `b` more often than `b` beat `a`, considering only games between exactly this pair? Spec 10's "head_to_head" tiebreaker. */
function headToHeadWinner(a: string, b: string, allResults: TeamGameResult[]): string | null {
  let aWins = 0;
  let bWins = 0;
  for (const r of allResults) {
    if (r.teamId === a && r.opponentTeamId === b && r.pointsFor > r.pointsAgainst) aWins++;
    if (r.teamId === b && r.opponentTeamId === a && r.pointsFor > r.pointsAgainst) bWins++;
  }
  if (aWins === bWins) return null;
  return aWins > bWins ? a : b;
}

export function computeStandings(
  allResults: TeamGameResult[],
  tiebreakers: Array<"head_to_head" | "point_differential">,
): StandingsRow[] {
  const byTeam = new Map<string, TeamGameResult[]>();
  for (const r of allResults) {
    if (!byTeam.has(r.teamId)) byTeam.set(r.teamId, []);
    byTeam.get(r.teamId)!.push(r);
  }

  const rows = Array.from(byTeam.entries()).map(([teamId, results]) => buildRow(teamId, results));

  return rows.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;

    for (const breaker of tiebreakers) {
      if (breaker === "head_to_head") {
        const winner = headToHeadWinner(a.teamId, b.teamId, allResults);
        if (winner === a.teamId) return -1;
        if (winner === b.teamId) return 1;
      } else if (breaker === "point_differential") {
        if (b.differential !== a.differential) return b.differential - a.differential;
      }
    }
    // Final, deterministic fallback so equally-ranked teams don't reorder
    // between renders (points for, then team id for total stability).
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return a.teamId.localeCompare(b.teamId);
  });
}
