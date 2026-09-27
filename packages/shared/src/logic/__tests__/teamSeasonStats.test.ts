import { describe, it, expect } from "vitest";
import { computeTeamSeasonStats, type TeamGameTotals } from "../teamSeasonStats";

function game(overrides: Partial<TeamGameTotals>): TeamGameTotals {
  return {
    teamId: "A",
    gameId: "g1",
    points: 0,
    pointsAgainst: 0,
    fieldGoalMade: 0,
    fieldGoalAttempted: 0,
    threePointMade: 0,
    threePointAttempted: 0,
    ftMade: 0,
    ftAttempted: 0,
    reboundsOffensive: 0,
    reboundsDefensive: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    personalFouls: 0,
    ...overrides,
  };
}

describe("computeTeamSeasonStats", () => {
  it("averages per game and computes the point differential", () => {
    const [a] = computeTeamSeasonStats([
      game({ gameId: "g1", points: 80, pointsAgainst: 70 }),
      game({ gameId: "g2", points: 60, pointsAgainst: 70 }),
    ]);
    expect(a.gamesPlayed).toBe(2);
    expect(a.pointsPerGame).toBe(70);
    expect(a.pointsAgainstPerGame).toBe(70);
    expect(a.differentialPerGame).toBe(0);
  });

  it("computes percentages from summed makes and attempts, not an average of per-game percentages", () => {
    // Game 1: 1/1 (100%). Game 2: 1/9 (11%). Average of percentages would be ~56%; the real rate is 2/10.
    const [a] = computeTeamSeasonStats([
      game({ gameId: "g1", fieldGoalMade: 1, fieldGoalAttempted: 1 }),
      game({ gameId: "g2", fieldGoalMade: 1, fieldGoalAttempted: 9 }),
    ]);
    expect(a.fieldGoalPct).toBeCloseTo(0.2);
  });

  it("returns null percentages when a team never attempted", () => {
    const [a] = computeTeamSeasonStats([game({})]);
    expect(a.threePointPct).toBeNull();
    expect(a.ftPct).toBeNull();
  });

  it("includes team-level rebounds and turnovers and uses the standard efficiency formula", () => {
    const [a] = computeTeamSeasonStats([
      game({
        points: 50,
        fieldGoalMade: 20,
        fieldGoalAttempted: 40,
        ftMade: 5,
        ftAttempted: 10,
        reboundsOffensive: 5,
        reboundsDefensive: 15,
        assists: 10,
        steals: 4,
        blocks: 2,
        turnovers: 8,
      }),
    ]);
    expect(a.reboundsPerGame).toBe(20);
    // 50 + 20 + 10 + 4 + 2 - (40-20) - (10-5) - 8 = 53
    expect(a.efficiencyPerGame).toBe(53);
  });

  it("keeps teams separate", () => {
    const rows = computeTeamSeasonStats([
      game({ teamId: "A", points: 10 }),
      game({ teamId: "B", points: 30 }),
      game({ teamId: "A", gameId: "g2", points: 20 }),
    ]);
    expect(rows.find((r) => r.teamId === "A")?.pointsPerGame).toBe(15);
    expect(rows.find((r) => r.teamId === "B")?.pointsPerGame).toBe(30);
  });
});
