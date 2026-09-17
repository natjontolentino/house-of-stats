import { describe, it, expect } from "vitest";
import { computeValidationWarnings } from "../validation";
import { computeLiveGameState } from "../gameState";
import { DEFAULT_LEAGUE_SETTINGS } from "../../types/settings";
import { makeEventBuilder, PERIOD_MS } from "./testHelpers";

describe("computeValidationWarnings (spec 6.14)", () => {
  it("flags periods with no recorded events", () => {
    const event = makeEventBuilder();
    const events = [event("lineup_set", "home", null, { player_ids: ["p1", "p2", "p3", "p4", "p5"] }, null, 1)];

    const warnings = computeValidationWarnings({
      events,
      players: {},
      teams: {},
      periodsPlayed: 3,
    });

    const emptyPeriods = warnings.filter((w) => w.code === "period_no_events").map((w) => w.period);
    expect(emptyPeriods.sort()).toEqual([2, 3]);
  });

  it("does not flag a period that has at least one event", () => {
    const event = makeEventBuilder();
    const events = [event("shot_made", "home", "p1", { points: 2 }, null, 1)];
    const warnings = computeValidationWarnings({ events, players: {}, teams: {}, periodsPlayed: 1 });
    expect(warnings.some((w) => w.code === "period_no_events")).toBe(false);
  });

  it("flags a team with more than 5 players on court at some point", () => {
    // Two separate players subbed in without the matching player_out ever
    // having been on court — a data-entry mistake the tracker should be
    // warned about at review time (non-blocking, spec 6.14).
    const event = makeEventBuilder();
    const home = "home";
    const events = [
      event("lineup_set", home, null, { player_ids: ["p1", "p2", "p3", "p4", "p5"] }, PERIOD_MS, 1),
      event("substitution", home, null, { player_in: "p6", player_out: "ghost" }, 500_000, 1),
    ];
    const warnings = computeValidationWarnings({ events, players: {}, teams: {}, periodsPlayed: 1 });
    expect(warnings.some((w) => w.code === "on_court_count" && w.teamId === home)).toBe(true);
  });

  it("produces no warnings for a clean, fully-played game", () => {
    // Clock off (Phase 1's actual league default) — clock_ms is null
    // throughout, so minutesMs comes back null for everyone and the
    // minutes/events mismatch check (which only applies when a clock is in
    // use) can never fire. A clock-mode game would additionally need a
    // period_end to close out every player's on-court stint before review.
    const event = makeEventBuilder();
    const home = "home";
    const away = "away";
    const events = [
      event("lineup_set", home, null, { player_ids: ["p1", "p2", "p3", "p4", "p5"] }, null, 1),
      event("lineup_set", away, null, { player_ids: ["a1", "a2", "a3", "a4", "a5"] }, null, 1),
      event("period_start", null, null, { period: 1 }, null, 1),
      event("shot_made", home, "p1", { points: 2 }, null, 1),
      event("assist", home, "p2", {}, null, 1),
      event("shot_missed", away, "a1", { points: 2 }, null, 1),
      event("rebound", home, "p3", { kind: "defensive", team_rebound: false }, null, 1),
    ];
    const state = computeLiveGameState({
      game: { home_team_id: home, away_team_id: away, status: "in_progress" },
      allEvents: events,
      rosterByTeam: { [home]: ["p1", "p2", "p3", "p4", "p5"], [away]: ["a1", "a2", "a3", "a4", "a5"] },
      settings: DEFAULT_LEAGUE_SETTINGS,
    });
    const warnings = computeValidationWarnings({
      events,
      players: state.players,
      teams: state.teams,
      periodsPlayed: 1,
    });
    expect(warnings).toEqual([]);
  });
});
