import { describe, it, expect } from "vitest";
import { computeShotZoneStats, zoneTone, SHOT_ZONES } from "../shotZones";
import { validateEventPayload } from "../../types/events";
import type { GameEvent } from "../../types/entities";

let seq = 0;

function base(eventType: string, over: Partial<GameEvent> = {}): GameEvent {
  seq += 1;
  return {
    id: `id${seq}`,
    client_uuid: `u${seq}`,
    game_id: "g",
    sequence: seq,
    event_type: eventType,
    team_id: "A",
    player_id: "p1",
    period: 1,
    clock_ms: null,
    payload: {},
    recorded_by_device_id: "d",
    recorded_by_user_id: null,
    voided_by_event_id: null,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  } as unknown as GameEvent;
}

function shot(made: boolean, points: 2 | 3, over: Partial<GameEvent> = {}): GameEvent {
  return base(made ? "shot_made" : "shot_missed", { payload: { points }, ...over });
}

/** The zone tag the tracker adds right after a shot. */
function tag(target: GameEvent, zone: string): GameEvent {
  return base("shot_zone", {
    team_id: target.team_id,
    player_id: target.player_id,
    payload: { shot_client_uuid: target.client_uuid, zone },
  });
}

function voidOf(target: GameEvent): GameEvent {
  return base("event_voided", { team_id: null, player_id: null, payload: { voids_client_uuid: target.client_uuid } });
}

describe("computeShotZoneStats", () => {
  it("tallies attempts, makes and percentage per zone", () => {
    const a = shot(true, 2);
    const b = shot(true, 2);
    const c = shot(false, 2);
    const d = shot(false, 3);
    const stats = computeShotZoneStats([a, tag(a, "paint"), b, tag(b, "paint"), c, tag(c, "paint"), d, tag(d, "corner_left")]);
    expect(stats.zones.paint).toEqual({ attempts: 3, makes: 2, pct: 2 / 3 });
    expect(stats.zones.corner_left).toEqual({ attempts: 1, makes: 0, pct: 0 });
    expect(stats.zones.top_key).toEqual({ attempts: 0, makes: 0, pct: null });
    expect(stats.total).toEqual({ attempts: 4, makes: 2, pct: 0.5 });
  });

  it("counts shots with no tag as unzoned but still in the total", () => {
    const a = shot(true, 3);
    const b = shot(false, 2);
    const stats = computeShotZoneStats([a, b, tag(b, "mid_top")]);
    expect(stats.unzoned).toEqual({ attempts: 1, makes: 1, pct: 1 });
    expect(stats.total.attempts).toBe(2);
  });

  it("does not trust a zone that contradicts the shot value", () => {
    const a = shot(true, 3);
    const stats = computeShotZoneStats([a, tag(a, "paint")]);
    expect(stats.zones.paint.attempts).toBe(0);
    expect(stats.unzoned.attempts).toBe(1);
  });

  it("uses the latest tag when a shot was re-tagged", () => {
    const a = shot(true, 2);
    const stats = computeShotZoneStats([a, tag(a, "mid_left"), tag(a, "mid_right")]);
    expect(stats.zones.mid_left.attempts).toBe(0);
    expect(stats.zones.mid_right.attempts).toBe(1);
  });

  it("drops a voided shot, and falls back to unzoned when only the tag is voided", () => {
    const gone = shot(true, 2);
    const kept = shot(false, 2);
    const keptTag = tag(kept, "paint");
    const stats = computeShotZoneStats([gone, tag(gone, "paint"), voidOf(gone), kept, keptTag, voidOf(keptTag)]);
    expect(stats.total.attempts).toBe(1);
    expect(stats.zones.paint.attempts).toBe(0);
    expect(stats.unzoned.attempts).toBe(1);
  });

  it("filters by player and by team", () => {
    const events = [
      shot(true, 2, { player_id: "p1", team_id: "A" }),
      shot(true, 2, { player_id: "p2", team_id: "A" }),
      shot(true, 2, { player_id: "p3", team_id: "B" }),
    ];
    expect(computeShotZoneStats(events, { playerId: "p1" }).total.attempts).toBe(1);
    expect(computeShotZoneStats(events, { teamId: "A" }).total.attempts).toBe(2);
  });

  it("reports every zone even when empty", () => {
    const stats = computeShotZoneStats([]);
    expect(Object.keys(stats.zones).sort()).toEqual([...SHOT_ZONES].sort());
  });
});

describe("zoneTone", () => {
  const line = (attempts: number, makes: number) => ({ attempts, makes, pct: attempts ? makes / attempts : null });
  it("buckets by FG%", () => {
    expect(zoneTone(line(0, 0))).toBe("none");
    expect(zoneTone(line(10, 3))).toBe("cold");
    expect(zoneTone(line(3, 1))).toBe("warm");
    expect(zoneTone(line(10, 5))).toBe("hot");
  });
});

describe("shot_zone payload", () => {
  it("accepts a known zone and rejects an unknown one", () => {
    expect(validateEventPayload("shot_zone", { shot_client_uuid: "u1", zone: "top_key" })).toEqual({
      shot_client_uuid: "u1",
      zone: "top_key",
    });
    expect(() => validateEventPayload("shot_zone", { shot_client_uuid: "u1", zone: "half_court" })).toThrow();
    expect(() => validateEventPayload("shot_zone", { zone: "paint" })).toThrow();
  });
});
