import { describe, it, expect } from "vitest";
import { computeLiveGameState } from "../gameState";
import { DEFAULT_LEAGUE_SETTINGS } from "../../types/settings";
import { makeEventBuilder, PERIOD_MS } from "./testHelpers";

/**
 * Integration test: a realistic multi-period game (substitutions crossing
 * period boundaries, technicals building to an ejection, an undo) run
 * through the full reducer. Every expected value below was hand-calculated
 * and cross-checked before being written — see spec 6.9, 6.6, 6.12.
 */
describe("computeLiveGameState — full game scenario", () => {
  const HOME = "home";
  const AWAY = "away";
  const P1 = "p1";
  const P2 = "p2"; // subs in for P3 during Q2, and again in Q3
  const P3 = "p3"; // starts, subbed out mid-Q2, ejected in Q3 via 2 technicals
  const P4 = "p4";
  const P5 = "p5";
  const P6 = "p6"; // never touched by a substitution — stays on court all 4 periods
  const A1 = "a1";
  const A2 = "a2";
  const A3 = "a3";
  const A4 = "a4";
  const A5 = "a5";

  const event = makeEventBuilder();

  const events = [
    // Pre-game
    event("lineup_set", HOME, null, { player_ids: [P1, P3, P4, P5, P6] }, PERIOD_MS, 1),
    event("lineup_set", AWAY, null, { player_ids: [A1, A2, A3, A4, A5] }, PERIOD_MS, 1),
    event("period_start", null, null, { period: 1 }, PERIOD_MS, 1),

    // Q1
    event("shot_made", HOME, P1, { points: 2 }, 550_000, 1),
    event("assist", HOME, P6, {}, 550_000, 1),
    event("shot_missed", AWAY, A1, { points: 3 }, 500_000, 1),
    event("rebound", HOME, P6, { kind: "defensive", team_rebound: false }, 498_000, 1),
    event("foul_personal", HOME, P3, {}, 400_000, 1),
    event("period_end", null, null, { period: 1 }, 0, 1),
    event("period_start", null, null, { period: 2 }, PERIOD_MS, 2),

    // Q2: P3 subs out for P2 partway through
    event("substitution", HOME, null, { player_in: P2, player_out: P3 }, 300_000, 2),
    event("shot_made", HOME, P6, { points: 3 }, 250_000, 2),
    event("period_end", null, null, { period: 2 }, 0, 2),
    event("period_start", null, null, { period: 3 }, PERIOD_MS, 3),

    // Q3: P3 re-enters, racks up two technicals (ejection), P2 comes back in
    event("substitution", HOME, null, { player_in: P3, player_out: P2 }, 600_000, 3),
    event("warning", HOME, P3, { target: "player" }, 500_000, 3),
    event("technical", HOME, P3, { target: "player", ordinal: 1 }, 450_000, 3),
    event("technical", HOME, P3, { target: "player", ordinal: 2 }, 400_000, 3),
    event("substitution", HOME, null, { player_in: P2, player_out: P3 }, 390_000, 3),
    event("period_end", null, null, { period: 3 }, 0, 3),
    event("period_start", null, null, { period: 4 }, PERIOD_MS, 4),

    // Q4: record a shot, then undo it — exactly as the mobile app's undo()
    // does, by targeting the preceding event's client_uuid.
    event("shot_made", AWAY, A2, { points: 2 }, 500_000, 4),
  ];
  const awayShotQ4 = events[events.length - 1];
  events.push(
    event("event_voided", null, null, { voids_client_uuid: awayShotQ4.client_uuid, reason: "undo" }, 500_000, 4),
    event("period_end", null, null, { period: 4 }, 0, 4),
  );

  const state = computeLiveGameState({
    game: { home_team_id: HOME, away_team_id: AWAY, status: "in_progress" },
    allEvents: events,
    rosterByTeam: { [HOME]: [P1, P2, P3, P4, P5, P6], [AWAY]: [A1, A2, A3, A4, A5] },
    settings: DEFAULT_LEAGUE_SETTINGS,
  });

  it("computes the score, excluding the undone shot", () => {
    expect(state.home.score).toBe(5); // 2 + 3
    expect(state.away.score).toBe(0); // the 2PT was undone
  });

  it("tracks the current period", () => {
    expect(state.currentPeriod).toBe(4);
  });

  it("credits a player who never subs out with minutes across all 4 periods (spec 6.9)", () => {
    // 4 full 10-minute quarters = 40:00 — this is the cross-period carry-over
    // fix: period_end alone must not silently stop crediting a player who
    // stays on court into the next period.
    expect(state.players[P6].minutesMs).toBe(40 * 60_000);
  });

  it("credits a player with multiple partial stints across periods", () => {
    // Q1 full (10:00) + Q2 partial (10:00 - 5:00 = 5:00) + Q3 partial
    // (10:00 - 6:30 = 3:30) = 18:30
    expect(state.players[P3].minutesMs).toBe((10 + 5 + 3.5) * 60_000);
  });

  it("credits a player who re-enters immediately at a period boundary, leaves, then plays on into the next period", () => {
    // Q2 stint (5:00) + Q3 carry-in immediately subbed back out (0:00) +
    // Q3 re-entry through period end (6:30) + carried into Q4 and credited
    // a full quarter there since Q4 also closes with a period_end (10:00)
    // = 21:30
    expect(state.players[P2].minutesMs).toBe(21.5 * 60_000);
  });

  it("escalates the W/T ladder and ejects at the second technical (spec 6.6)", () => {
    const p3 = state.players[P3];
    expect(p3.wtLevel).toBe(3);
    expect(p3.wtLabel).toBe("T2");
    // 1 personal foul + 2 technicals (each technical adds +1 PF) = 3
    expect(p3.personalFouls).toBe(3);
    expect(p3.ejected).toBe(true);
  });

  it("removes the ejected player from the on-court set", () => {
    expect(state.home.onCourtPlayerIds.sort()).toEqual([P1, P2, P4, P5, P6].sort());
    expect(state.home.disqualifiedPlayerIds).toEqual([P3]);
  });

  it("undo reverses the most recent action of any kind (spec 6.12)", () => {
    expect(state.players[A2].points).toBe(0);
  });
});
