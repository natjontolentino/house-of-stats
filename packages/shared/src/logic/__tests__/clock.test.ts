import { describe, it, expect } from "vitest";
import { computeMinutesMsForPlayer } from "../clock";
import { makeEventBuilder, PERIOD_MS } from "./testHelpers";

describe("computeMinutesMsForPlayer", () => {
  it("returns null when the clock is off (no clock_ms readings at all)", () => {
    const event = makeEventBuilder();
    const events = [
      event("lineup_set", "home", null, { player_ids: ["p1", "p2", "p3", "p4", "p5"] }, null, 1),
      event("substitution", "home", null, { player_in: "p6", player_out: "p1" }, null, 1),
    ];
    expect(computeMinutesMsForPlayer("p6", events)).toBeNull();
  });

  it("credits a simple sub-in to sub-out stint within one period", () => {
    const event = makeEventBuilder();
    const events = [
      event("substitution", "home", null, { player_in: "p1", player_out: "p2" }, 400_000, 1),
      event("substitution", "home", null, { player_in: "p2", player_out: "p1" }, 250_000, 1),
    ];
    expect(computeMinutesMsForPlayer("p1", events)).toBe(150_000);
  });

  it("credits a player on court when the period ends (spec 6.9)", () => {
    const event = makeEventBuilder();
    const events = [
      event("lineup_set", "home", null, { player_ids: ["p1", "p2", "p3", "p4", "p5"] }, PERIOD_MS, 1),
      event("period_end", null, null, { period: 1 }, 0, 1),
    ];
    expect(computeMinutesMsForPlayer("p1", events)).toBe(PERIOD_MS);
  });

  it("carries a player across a period boundary when no lineup_set exists for the new period", () => {
    // There is only ever one lineup_set, at game start (spec 6.13) — a
    // player who stays on court must keep accumulating minutes through
    // period_start events in later periods, not just the first one.
    const event = makeEventBuilder();
    const events = [
      event("lineup_set", "home", null, { player_ids: ["p1", "p2", "p3", "p4", "p5"] }, PERIOD_MS, 1),
      event("period_end", null, null, { period: 1 }, 0, 1),
      event("period_start", null, null, { period: 2 }, PERIOD_MS, 2),
      event("period_end", null, null, { period: 2 }, 0, 2),
    ];
    expect(computeMinutesMsForPlayer("p1", events)).toBe(PERIOD_MS * 2);
  });

  it("does not carry a player across the boundary once they've been subbed out", () => {
    const event = makeEventBuilder();
    const events = [
      event("lineup_set", "home", null, { player_ids: ["p1", "p2", "p3", "p4", "p5"] }, PERIOD_MS, 1),
      event("substitution", "home", null, { player_in: "p6", player_out: "p1" }, 100_000, 1),
      event("period_end", null, null, { period: 1 }, 0, 1),
      event("period_start", null, null, { period: 2 }, PERIOD_MS, 2),
      event("period_end", null, null, { period: 2 }, 0, 2),
    ];
    // p1 played 10:00 - 1:40 = 8:20 of period 1, then sat the rest of the game
    expect(computeMinutesMsForPlayer("p1", events)).toBe(PERIOD_MS - 100_000);
  });

  it("does not credit a stint while the clock is stopped between two identical readings", () => {
    // A stopped clock never changes its reading, so two events sharing the
    // same clock_ms contribute zero duration on their own — the tracker
    // does not need a perfect clock, only one correct at substitution time.
    const event = makeEventBuilder();
    const events = [
      event("substitution", "home", null, { player_in: "p1", player_out: "p2" }, 300_000, 1),
      event("foul_personal", "home", "p3", {}, 300_000, 1), // clock stopped, same reading
      event("substitution", "home", null, { player_in: "p2", player_out: "p1" }, 300_000, 1),
    ];
    expect(computeMinutesMsForPlayer("p1", events)).toBe(0);
  });
});
