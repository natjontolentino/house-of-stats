import { describe, it, expect } from "vitest";
import { computeEfficiency, selectPlayerOfGame } from "../efficiency";

describe("computeEfficiency (spec 9.1)", () => {
  it("matches the FIBA EFF formula exactly", () => {
    // EFF = (PTS+REB+AST+STL+BLK) - (FGA-FGM) - (FTA-FTM) - TO
    const eff = computeEfficiency({
      points: 20,
      reboundsTotal: 10,
      assists: 5,
      steals: 2,
      blocks: 1,
      fieldGoalAttempted: 15,
      fieldGoalMade: 8,
      ftAttempted: 4,
      ftMade: 3,
      turnovers: 3,
    });
    // (20+10+5+2+1) - (15-8) - (4-3) - 3 = 38 - 7 - 1 - 3 = 27
    expect(eff).toBe(27);
  });

  it("is zero for a player with no events", () => {
    expect(
      computeEfficiency({
        points: 0,
        reboundsTotal: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fieldGoalAttempted: 0,
        fieldGoalMade: 0,
        ftAttempted: 0,
        ftMade: 0,
        turnovers: 0,
      }),
    ).toBe(0);
  });
});

describe("selectPlayerOfGame (spec 9.1)", () => {
  const winner = { playerId: "winner-star", teamId: "winners", efficiency: 27, points: 20, reboundsTotal: 10, assists: 5 };
  const loser = { playerId: "loser-star", teamId: "losers", efficiency: 40, points: 30, reboundsTotal: 15, assists: 8 };

  it("restricts to the winning team by default", () => {
    const pog = selectPlayerOfGame([winner, loser], { winningTeamId: "winners", restrictToWinningTeam: true });
    expect(pog?.playerId).toBe("winner-star");
    expect(pog?.isOverride).toBe(false);
  });

  it("picks the higher-efficiency player league-wide when not restricted", () => {
    const pog = selectPlayerOfGame([winner, loser], { winningTeamId: "winners", restrictToWinningTeam: false });
    expect(pog?.playerId).toBe("loser-star");
  });

  it("breaks ties by points, then rebounds, then assists", () => {
    const a = { playerId: "a", teamId: "t", efficiency: 20, points: 15, reboundsTotal: 5, assists: 2 };
    const b = { playerId: "b", teamId: "t", efficiency: 20, points: 18, reboundsTotal: 5, assists: 2 };
    const pog = selectPlayerOfGame([a, b], { winningTeamId: null, restrictToWinningTeam: false });
    expect(pog?.playerId).toBe("b"); // higher points wins the tie
  });

  it("an organizer override always wins and is flagged as such", () => {
    const pog = selectPlayerOfGame([winner, loser], {
      winningTeamId: "winners",
      restrictToWinningTeam: true,
      organizerOverridePlayerId: "loser-star",
    });
    expect(pog?.playerId).toBe("loser-star");
    expect(pog?.isOverride).toBe(true);
  });
});
