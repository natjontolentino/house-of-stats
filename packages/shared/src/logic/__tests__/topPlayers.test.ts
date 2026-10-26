import { describe, it, expect } from "vitest";
import { minimumGamesForRanking, rankTopPlayers } from "../topPlayers";
import type { PlayerSeasonLine } from "../seasonStats";

function line(over: Partial<PlayerSeasonLine>): PlayerSeasonLine {
  return {
    playerId: "p",
    teamId: "A",
    gamesPlayed: 4,
    pointsPerGame: 0,
    reboundsPerGame: 0,
    assistsPerGame: 0,
    efficiencyPerGame: 0,
    ...over,
  } as PlayerSeasonLine;
}

describe("minimumGamesForRanking", () => {
  it("is half the team's games, rounded up, and never below one", () => {
    expect(minimumGamesForRanking(0)).toBe(1);
    expect(minimumGamesForRanking(1)).toBe(1);
    expect(minimumGamesForRanking(3)).toBe(2);
    expect(minimumGamesForRanking(4)).toBe(2);
    expect(minimumGamesForRanking(10)).toBe(5);
  });
});

describe("rankTopPlayers", () => {
  it("orders by EFF per game, best first, with 1-based ranks", () => {
    const ranked = rankTopPlayers(
      [line({ playerId: "a", efficiencyPerGame: 12 }), line({ playerId: "b", efficiencyPerGame: 20 }), line({ playerId: "c", efficiencyPerGame: 15 })],
      { A: 4 },
    );
    expect(ranked.map((r) => [r.rank, r.line.playerId])).toEqual([
      [1, "b"],
      [2, "c"],
      [3, "a"],
    ]);
  });

  it("leaves out players who played under half of their own team's games", () => {
    const ranked = rankTopPlayers(
      [
        line({ playerId: "starter", teamId: "A", gamesPlayed: 4, efficiencyPerGame: 10 }),
        line({ playerId: "oneGame", teamId: "A", gamesPlayed: 1, efficiencyPerGame: 40 }),
        line({ playerId: "otherTeam", teamId: "B", gamesPlayed: 1, efficiencyPerGame: 8 }),
      ],
      { A: 4, B: 2 },
    );
    expect(ranked.map((r) => r.line.playerId)).toEqual(["starter", "otherTeam"]);
  });

  it("breaks an EFF tie by points, rebounds, assists, then player id", () => {
    const tie = { efficiencyPerGame: 10 };
    expect(rankTopPlayers([line({ playerId: "a", ...tie, pointsPerGame: 5 }), line({ playerId: "b", ...tie, pointsPerGame: 9 })], { A: 4 })[0].line.playerId).toBe("b");
    expect(rankTopPlayers([line({ playerId: "a", ...tie, reboundsPerGame: 1 }), line({ playerId: "b", ...tie, reboundsPerGame: 6 })], { A: 4 })[0].line.playerId).toBe("b");
    expect(rankTopPlayers([line({ playerId: "a", ...tie, assistsPerGame: 1 }), line({ playerId: "b", ...tie, assistsPerGame: 6 })], { A: 4 })[0].line.playerId).toBe("b");
    const ids = [line({ playerId: "z", ...tie }), line({ playerId: "m", ...tie })];
    expect(rankTopPlayers(ids, { A: 4 })[0].line.playerId).toBe("m");
    expect(rankTopPlayers([...ids].reverse(), { A: 4 })[0].line.playerId).toBe("m");
  });

  it("returns at most the limit, and fewer when not enough players qualify", () => {
    const many = Array.from({ length: 15 }, (_, i) => line({ playerId: `p${i}`, efficiencyPerGame: i }));
    expect(rankTopPlayers(many, { A: 4 })).toHaveLength(10);
    expect(rankTopPlayers(many, { A: 4 }, 3)).toHaveLength(3);
    expect(rankTopPlayers(many.slice(0, 2), { A: 4 })).toHaveLength(2);
  });

  it("doesn't change the list it was given", () => {
    const input = [line({ playerId: "a", efficiencyPerGame: 1 }), line({ playerId: "b", efficiencyPerGame: 9 })];
    rankTopPlayers(input, { A: 4 });
    expect(input.map((p) => p.playerId)).toEqual(["a", "b"]);
  });
});
