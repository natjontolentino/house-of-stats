import { describe, it, expect } from "vitest";
import { computeTeamFoulsForPeriod, computePenaltyBoxStatus } from "../derive";
import { makeEventBuilder } from "./testHelpers";

describe("computeTeamFoulsForPeriod (spec 5.3, 6.7)", () => {
  const event = makeEventBuilder();
  const events = [
    event("foul_personal", "home", "p1", {}, null, 1),
    event("foul_personal", "home", "p1", {}, null, 1),
    event("foul_personal", "home", "p1", {}, null, 1),
    event("foul_personal", "home", "p2", {}, null, 4),
    event("foul_personal", "home", "p2", {}, null, 4),
    event("foul_personal", "home", "p3", {}, null, 5), // OT1
  ];

  it("resets team fouls independently for each regulation period", () => {
    expect(computeTeamFoulsForPeriod(events, "home", 1, 4)).toBe(3);
    expect(computeTeamFoulsForPeriod(events, "home", 4, 4)).toBe(2);
  });

  it("continues accumulating from Q4 through overtime instead of resetting (spec 6.7)", () => {
    expect(computeTeamFoulsForPeriod(events, "home", 5, 4)).toBe(3); // Q4's 2 + OT1's 1
  });

  it("does not count a bench/team-row technical toward team fouls", () => {
    const event2 = makeEventBuilder();
    const withBenchTechnical = [
      event2("foul_personal", "home", "p1", {}, null, 1),
      event2("technical", "home", null, { target: "bench", ordinal: 1 }, null, 1), // player_id null = bench
    ];
    expect(computeTeamFoulsForPeriod(withBenchTechnical, "home", 1, 4)).toBe(1);
  });

  it("counts an individual player's technical toward team fouls", () => {
    const event2 = makeEventBuilder();
    const withPlayerTechnical = [
      event2("foul_personal", "home", "p1", {}, null, 1),
      event2("technical", "home", "p1", { target: "player", ordinal: 1 }, null, 1),
    ];
    expect(computeTeamFoulsForPeriod(withPlayerTechnical, "home", 1, 4)).toBe(2);
  });
});

describe("computePenaltyBoxStatus (spec 6.7)", () => {
  it("is normal below the amber threshold", () => {
    expect(computePenaltyBoxStatus(3, 5)).toBe("normal");
  });

  it("goes amber one foul before the penalty (the table raises one foul early)", () => {
    expect(computePenaltyBoxStatus(4, 5)).toBe("amber");
  });

  it("goes red at the penalty threshold or above", () => {
    expect(computePenaltyBoxStatus(5, 5)).toBe("red");
    expect(computePenaltyBoxStatus(7, 5)).toBe("red");
  });
});
