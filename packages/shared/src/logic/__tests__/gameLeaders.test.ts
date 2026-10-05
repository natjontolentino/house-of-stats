import { describe, it, expect } from "vitest";
import { computeTeamLeaders, FG_PCT_LEADER_MIN_ATTEMPTS } from "../gameLeaders";

function line(overrides: Partial<Parameters<typeof computeTeamLeaders>[0][number]>) {
  return {
    playerId: "p",
    teamId: "A",
    points: 0,
    reboundsTotal: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    fieldGoalMade: 0,
    fieldGoalAttempted: 0,
    threePointMade: 0,
    efficiency: 0,
    ...overrides,
  };
}

describe("computeTeamLeaders", () => {
  it("picks the top player per category and only looks at the requested team", () => {
    const leaders = computeTeamLeaders(
      [
        line({ playerId: "a1", points: 12, assists: 2 }),
        line({ playerId: "a2", points: 20, assists: 6 }),
        line({ playerId: "b1", teamId: "B", points: 40, assists: 9 }),
      ],
      "A",
    );
    expect(leaders.points).toEqual({ playerId: "a2", value: 20 });
    expect(leaders.assists).toEqual({ playerId: "a2", value: 6 });
  });

  it("leaves a category blank when nobody on the team recorded any", () => {
    const leaders = computeTeamLeaders([line({ playerId: "a1", points: 5 })], "A");
    expect(leaders.blocks).toBeNull();
    expect(leaders.steals).toBeNull();
    expect(leaders.threePointMade).toBeNull();
    expect(leaders.points).not.toBeNull();
  });

  it("returns exactly one player on a tie, preferring the better overall game", () => {
    const leaders = computeTeamLeaders(
      [
        line({ playerId: "a1", steals: 3, efficiency: 5 }),
        line({ playerId: "a2", steals: 3, efficiency: 14 }),
      ],
      "A",
    );
    expect(leaders.steals?.playerId).toBe("a2");
  });

  it("breaks a full tie deterministically by player id", () => {
    const players = [line({ playerId: "a2", blocks: 2 }), line({ playerId: "a1", blocks: 2 })];
    expect(computeTeamLeaders(players, "A").blocks?.playerId).toBe("a1");
    expect(computeTeamLeaders([...players].reverse(), "A").blocks?.playerId).toBe("a1");
  });

  it("ranks FG% by percentage and ignores players under the minimum attempts", () => {
    const leaders = computeTeamLeaders(
      [
        line({ playerId: "few", fieldGoalMade: 1, fieldGoalAttempted: FG_PCT_LEADER_MIN_ATTEMPTS - 1 }),
        line({ playerId: "volume", fieldGoalMade: 6, fieldGoalAttempted: 12 }),
        line({ playerId: "efficient", fieldGoalMade: 4, fieldGoalAttempted: 5 }),
      ],
      "A",
    );
    expect(leaders.fieldGoalPct).toEqual({ playerId: "efficient", value: 0.8, made: 4, attempted: 5 });
  });

  it("leaves FG% blank when no one qualifies or no one made a shot", () => {
    expect(computeTeamLeaders([line({ playerId: "a1", fieldGoalAttempted: 8 })], "A").fieldGoalPct).toBeNull();
    expect(computeTeamLeaders([line({ playerId: "a1", fieldGoalMade: 1, fieldGoalAttempted: 2 })], "A").fieldGoalPct).toBeNull();
  });

  it("breaks an FG% tie by most makes", () => {
    const leaders = computeTeamLeaders(
      [
        line({ playerId: "a1", fieldGoalMade: 2, fieldGoalAttempted: 4 }),
        line({ playerId: "a2", fieldGoalMade: 5, fieldGoalAttempted: 10 }),
      ],
      "A",
    );
    expect(leaders.fieldGoalPct?.playerId).toBe("a2");
  });
});
