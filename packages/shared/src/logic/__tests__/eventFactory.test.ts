import { describe, it, expect } from "vitest";
import { validateSubstitution } from "../eventFactory";
import { computeLiveGameState } from "../gameState";
import { DEFAULT_LEAGUE_SETTINGS } from "../../types/settings";
import { makeEventBuilder, PERIOD_MS } from "./testHelpers";

/**
 * Regression coverage for the "six players on court" bug found in real
 * device testing (Fix Round 1, A3): the name-tap swap didn't verify that
 * exactly one of the two tapped players was actually on court, so tapping
 * two bench players in a row silently added a 6th player without removing
 * anyone (a substitution event's player_out was simply never on the court
 * set, so removing it was a no-op while player_in still got added).
 */
describe("validateSubstitution (spec 6.5 — a substitution is an atomic swap)", () => {
  const onCourt = ["p1", "p2", "p3", "p4", "p5"];

  it("accepts a normal swap: out-player on court, in-player on the bench", () => {
    expect(validateSubstitution(onCourt, "p1", "p6", [])).toEqual({ valid: true });
  });

  it("rejects when the supposed out-player is not actually on court (the six-on-court bug)", () => {
    // Both p6 and p7 are bench players — this is exactly the invalid pair a
    // mis-tap could produce.
    const result = validateSubstitution(onCourt, "p6", "p7", []);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("out_not_on_court");
  });

  it("rejects when the supposed in-player is already on court", () => {
    // Both p1 and p2 are on court — swapping them would remove one without
    // a real replacement.
    const result = validateSubstitution(onCourt, "p1", "p2", []);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("in_already_on_court");
  });

  it("rejects subbing in a disqualified player", () => {
    const result = validateSubstitution(onCourt, "p1", "p6", ["p6"]);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("in_disqualified");
  });
});

describe("on-court count stays exactly five through every substitution path", () => {
  const HOME = "home";
  const AWAY = "away";
  const roster = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];

  function buildState(extraEvents: Array<[string, string | null, string | null, Record<string, unknown>]>) {
    const event = makeEventBuilder();
    const events = [
      event("lineup_set", HOME, null, { player_ids: ["p1", "p2", "p3", "p4", "p5"] }, PERIOD_MS, 1),
      event("lineup_set", AWAY, null, { player_ids: ["a1", "a2", "a3", "a4", "a5"] }, PERIOD_MS, 1),
      event("period_start", null, null, { period: 1 }, PERIOD_MS, 1),
      ...extraEvents.map(([type, teamId, playerId, payload]) => event(type as never, teamId, playerId, payload, PERIOD_MS, 1)),
    ];
    return computeLiveGameState({
      game: { home_team_id: HOME, away_team_id: AWAY, status: "in_progress" },
      allEvents: events,
      rosterByTeam: { [HOME]: roster, [AWAY]: ["a1", "a2", "a3", "a4", "a5", "a6"] },
      settings: DEFAULT_LEAGUE_SETTINGS,
    });
  }

  it("stays at five after a single valid substitution", () => {
    const state = buildState([["substitution", HOME, null, { player_in: "p6", player_out: "p1" }]]);
    expect(state.home.onCourtPlayerIds).toHaveLength(5);
  });

  it("would NOT stay at five if an invalid bench-to-bench swap were ever recorded — proving the app-level guard (not the reducer) must reject it before this event exists", () => {
    // The reducer itself has no opinion on whether an event was valid to
    // record — it just replays the log. This confirms that if the mobile
    // app's guard were bypassed, the resulting state really would be
    // broken (6 on court), which is exactly why validateSubstitution must
    // run before performSubstitution ever calls appendEvent.
    const state = buildState([["substitution", HOME, null, { player_in: "p6", player_out: "p7" }]]);
    expect(state.home.onCourtPlayerIds).toHaveLength(6);
  });

  it("stays at five across a bench-stat-cell prompt substitution followed by the stat", () => {
    const state = buildState([
      ["substitution", HOME, null, { player_in: "p6", player_out: "p2" }],
      ["shot_made", HOME, "p6", { points: 2 }],
    ]);
    expect(state.home.onCourtPlayerIds).toHaveLength(5);
    expect(state.home.onCourtPlayerIds).toContain("p6");
    expect(state.home.onCourtPlayerIds).not.toContain("p2");
  });

  it("stays at five across a disqualification sub-in", () => {
    const state = buildState([
      ["foul_personal", HOME, "p3", {}],
      ["foul_personal", HOME, "p3", {}],
      ["foul_personal", HOME, "p3", {}],
      ["foul_personal", HOME, "p3", {}],
      ["foul_personal", HOME, "p3", {}], // fouled out at 5
      ["substitution", HOME, null, { player_in: "p6", player_out: "p3" }],
    ]);
    expect(state.home.onCourtPlayerIds).toHaveLength(5);
    expect(state.home.disqualifiedPlayerIds).toEqual(["p3"]);
    expect(state.home.onCourtPlayerIds).not.toContain("p3");
  });
});
