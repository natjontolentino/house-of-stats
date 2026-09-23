import { describe, it, expect } from "vitest";
import { computePlayerSeasonStats, meetsAttemptThreshold } from "../seasonStats";
import type { PlayerBoxLine } from "../boxScore";

function line(overrides: Partial<PlayerBoxLine>): PlayerBoxLine {
  return {
    playerId: "p1",
    teamId: "t1",
    points: 0,
    twoPointMade: 0,
    twoPointAttempted: 0,
    threePointMade: 0,
    threePointAttempted: 0,
    ftMade: 0,
    ftAttempted: 0,
    fieldGoalMade: 0,
    fieldGoalAttempted: 0,
    fieldGoalPct: null,
    threePointPct: null,
    ftPct: null,
    reboundsOffensive: 0,
    reboundsDefensive: 0,
    reboundsTotal: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    personalFouls: 0,
    wtLevel: 0,
    wtLabel: "",
    plusMinus: 0,
    minutesMs: null,
    efficiency: 0,
    fouledOut: false,
    ejected: false,
    onCourt: false,
    ...overrides,
  };
}

describe("computePlayerSeasonStats", () => {
  it("returns null for no games", () => {
    expect(computePlayerSeasonStats([])).toBeNull();
  });

  it("sums totals and divides by games actually played", () => {
    const games = [
      line({ points: 20, reboundsTotal: 5, fieldGoalMade: 8, fieldGoalAttempted: 10 }),
      line({ points: 10, reboundsTotal: 3, fieldGoalMade: 4, fieldGoalAttempted: 6 }),
    ];
    const season = computePlayerSeasonStats(games)!;
    expect(season.gamesPlayed).toBe(2);
    expect(season.points).toBe(30);
    expect(season.pointsPerGame).toBe(15);
    expect(season.reboundsTotal).toBe(8);
    expect(season.reboundsPerGame).toBe(4);
  });

  it("excludes a game the player didn't appear in from games-played and the average, but still no-ops safely", () => {
    const games = [
      line({ points: 20, fieldGoalAttempted: 10, fieldGoalMade: 8 }),
      line({}), // fully zero line -- rostered but never appeared (e.g. did-not-play)
      line({ points: 10, fieldGoalAttempted: 6, fieldGoalMade: 4 }),
    ];
    const season = computePlayerSeasonStats(games)!;
    expect(season.gamesPlayed).toBe(2);
    expect(season.points).toBe(30);
    expect(season.pointsPerGame).toBe(15);
  });

  it("uses minutesMs to decide appearance when the league tracks a clock", () => {
    const games = [
      line({ points: 12, minutesMs: 10 * 60_000 }),
      line({ points: 0, minutesMs: 0 }), // on the roster, clock tracked, but never checked in
    ];
    const season = computePlayerSeasonStats(games)!;
    expect(season.gamesPlayed).toBe(1);
    expect(season.pointsPerGame).toBe(12);
    expect(season.minutesPerGameMs).toBe(10 * 60_000);
  });

  it("computes percentages from summed makes/attempts, not an average of per-game percentages", () => {
    // Game 1: 1/1 (100%). Game 2: 0/3 (0%). Combined = 1/4 = 25%.
    // A naive average-of-percentages would wrongly give (100 + 0) / 2 = 50%.
    const games = [
      line({ fieldGoalMade: 1, fieldGoalAttempted: 1, points: 2 }),
      line({ fieldGoalMade: 0, fieldGoalAttempted: 3 }),
    ];
    const season = computePlayerSeasonStats(games)!;
    expect(season.fieldGoalMade).toBe(1);
    expect(season.fieldGoalAttempted).toBe(4);
    expect(season.fieldGoalPct).toBeCloseTo(0.25);
  });

  it("keeps playerId/teamId from the input lines", () => {
    const games = [line({ playerId: "p9", teamId: "t9", points: 4, fieldGoalAttempted: 2, fieldGoalMade: 2 })];
    const season = computePlayerSeasonStats(games)!;
    expect(season.playerId).toBe("p9");
    expect(season.teamId).toBe("t9");
  });
});

describe("meetsAttemptThreshold", () => {
  it("scales the floor with games played by default", () => {
    expect(meetsAttemptThreshold(6, 3, "scaled")).toBe(true); // 3 games * 2/game = 6 needed
    expect(meetsAttemptThreshold(5, 3, "scaled")).toBe(false);
  });

  it("uses a fixed number when configured", () => {
    expect(meetsAttemptThreshold(10, 1, 10)).toBe(true);
    expect(meetsAttemptThreshold(9, 100, 10)).toBe(false);
  });
});
