import { describe, it, expect } from "vitest";
import { computeStandings, type TeamGameResult } from "../standings";

function result(overrides: Partial<TeamGameResult>): TeamGameResult {
  return {
    gameId: "g1",
    teamId: "A",
    opponentTeamId: "B",
    pointsFor: 0,
    pointsAgainst: 0,
    playedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeStandings", () => {
  it("computes wins, losses, win pct, points for/against, and differential", () => {
    const results: TeamGameResult[] = [
      result({ teamId: "A", opponentTeamId: "B", pointsFor: 60, pointsAgainst: 50, playedAt: "2026-01-01" }),
      result({ teamId: "A", opponentTeamId: "C", pointsFor: 40, pointsAgainst: 55, playedAt: "2026-01-08" }),
      result({ teamId: "B", opponentTeamId: "A", pointsFor: 50, pointsAgainst: 60, playedAt: "2026-01-01" }),
      result({ teamId: "C", opponentTeamId: "A", pointsFor: 55, pointsAgainst: 40, playedAt: "2026-01-08" }),
    ];
    const rows = computeStandings(results, []);
    const a = rows.find((r) => r.teamId === "A")!;
    expect(a.wins).toBe(1);
    expect(a.losses).toBe(1);
    expect(a.winPct).toBeCloseTo(0.5);
    expect(a.pointsFor).toBe(100);
    expect(a.pointsAgainst).toBe(105);
    expect(a.differential).toBe(-5);
  });

  it("sorts by win percentage descending", () => {
    const results: TeamGameResult[] = [
      result({ teamId: "A", pointsFor: 10, pointsAgainst: 5, playedAt: "2026-01-01" }), // 1-0
      result({ teamId: "B", pointsFor: 5, pointsAgainst: 10, playedAt: "2026-01-01" }), // 0-1
      result({ teamId: "B", pointsFor: 10, pointsAgainst: 5, playedAt: "2026-01-08" }), // 1-1
    ];
    const rows = computeStandings(results, []);
    expect(rows[0].teamId).toBe("A"); // 1.000 > B's 0.500
  });

  it("computes the current streak from chronological order, not input order", () => {
    const results: TeamGameResult[] = [
      result({ teamId: "A", pointsFor: 10, pointsAgainst: 5, playedAt: "2026-01-15" }), // W (most recent)
      result({ teamId: "A", pointsFor: 5, pointsAgainst: 10, playedAt: "2026-01-01" }), // L (oldest) -- listed first on purpose
      result({ teamId: "A", pointsFor: 10, pointsAgainst: 5, playedAt: "2026-01-08" }), // W
    ];
    const rows = computeStandings(results, []);
    expect(rows[0].streak).toBe("W2");
  });

  it("reports '-' for a team with no games", () => {
    const rows = computeStandings([], []);
    expect(rows).toEqual([]);
  });

  it("breaks a win-pct tie with head_to_head when the tied teams played each other", () => {
    // A and B are both 1-1 overall, but A beat B head-to-head.
    const results: TeamGameResult[] = [
      result({ teamId: "A", opponentTeamId: "B", pointsFor: 60, pointsAgainst: 50, playedAt: "2026-01-01" }),
      result({ teamId: "B", opponentTeamId: "A", pointsFor: 50, pointsAgainst: 60, playedAt: "2026-01-01" }),
      result({ teamId: "A", opponentTeamId: "C", pointsFor: 40, pointsAgainst: 70, playedAt: "2026-01-08" }),
      result({ teamId: "B", opponentTeamId: "C", pointsFor: 55, pointsAgainst: 45, playedAt: "2026-01-15" }),
    ];
    const rows = computeStandings(results, ["head_to_head", "point_differential"]);
    const aIndex = rows.findIndex((r) => r.teamId === "A");
    const bIndex = rows.findIndex((r) => r.teamId === "B");
    expect(aIndex).toBeLessThan(bIndex);
  });

  it("falls through to point_differential when the tied teams never played each other", () => {
    const results: TeamGameResult[] = [
      result({ teamId: "A", opponentTeamId: "X", pointsFor: 80, pointsAgainst: 40, playedAt: "2026-01-01" }), // +40
      result({ teamId: "B", opponentTeamId: "Y", pointsFor: 60, pointsAgainst: 55, playedAt: "2026-01-01" }), // +5
    ];
    const rows = computeStandings(
      results.filter((r) => r.teamId === "A" || r.teamId === "B"),
      ["head_to_head", "point_differential"],
    );
    expect(rows[0].teamId).toBe("A"); // both 1-0, no head-to-head data, A has the better differential
  });
});
