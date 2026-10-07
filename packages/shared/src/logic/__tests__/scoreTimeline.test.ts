import { describe, it, expect } from "vitest";
import { computeScoreTimeline } from "../scoreByPeriod";

const evt = (sequence: number, event_type: string, team_id: string | null, payload: Record<string, unknown> = {}) => ({
  client_uuid: `u${sequence}`,
  sequence,
  event_type,
  team_id,
  payload,
});

describe("computeScoreTimeline", () => {
  it("tracks the running score per event for both teams", () => {
    const t = computeScoreTimeline(
      [
        evt(1, "shot_made", "H", { points: 2 }),
        evt(2, "rebound", "A", { kind: "defensive" }),
        evt(3, "shot_made", "A", { points: 3 }),
        evt(4, "free_throw_made", "H"),
        evt(5, "shot_missed", "H", { points: 2 }),
      ],
      "H",
      "A",
    );
    expect(t.get("u1")).toEqual({ home: 2, away: 0 });
    expect(t.get("u2")).toEqual({ home: 2, away: 0 });
    expect(t.get("u3")).toEqual({ home: 2, away: 3 });
    expect(t.get("u4")).toEqual({ home: 3, away: 3 });
    expect(t.get("u5")).toEqual({ home: 3, away: 3 });
  });

  it("orders by sequence even when given out of order", () => {
    const t = computeScoreTimeline([evt(2, "shot_made", "H", { points: 3 }), evt(1, "shot_made", "H", { points: 2 })], "H", "A");
    expect(t.get("u1")).toEqual({ home: 2, away: 0 });
    expect(t.get("u2")).toEqual({ home: 5, away: 0 });
  });
});
