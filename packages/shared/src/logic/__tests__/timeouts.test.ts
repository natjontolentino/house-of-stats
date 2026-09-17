import { describe, it, expect } from "vitest";
import { computeTimeoutBoxes, slotsToExpireAtHalftime } from "../timeouts";
import { DEFAULT_LEAGUE_SETTINGS } from "../../types/settings";
import { makeEventBuilder } from "./testHelpers";

describe("computeTimeoutBoxes (spec 6.8)", () => {
  it("locks second-half boxes during the first half", () => {
    const event = makeEventBuilder();
    const events = [event("timeout", "home", null, { slot_index: 0 }, null, 1)];
    const boxes = computeTimeoutBoxes(events, 1, DEFAULT_LEAGUE_SETTINGS);

    expect(boxes.map((b) => b.status)).toEqual(["used", "available", "locked", "locked", "locked"]);
  });

  it("unlocks second-half boxes once the second half begins", () => {
    const event = makeEventBuilder();
    const events = [
      event("timeout", "home", null, { slot_index: 0 }, null, 1),
      event("timeout_expired", "home", null, { slot_index: 1 }, null, 2),
    ];
    const boxes = computeTimeoutBoxes(events, 3, DEFAULT_LEAGUE_SETTINGS);

    expect(boxes.map((b) => b.status)).toEqual(["used", "expired", "available", "available", "available"]);
  });

  it("adds exactly one extra box per overtime period", () => {
    const boxes5 = computeTimeoutBoxes([], 5, DEFAULT_LEAGUE_SETTINGS); // OT1
    expect(boxes5).toHaveLength(6);
    const boxes6 = computeTimeoutBoxes([], 6, DEFAULT_LEAGUE_SETTINGS); // OT2
    expect(boxes6).toHaveLength(7);
  });

  it("marks a used box as used even after halftime", () => {
    const event = makeEventBuilder();
    const events = [event("timeout", "home", null, { slot_index: 2 }, null, 3)];
    const boxes = computeTimeoutBoxes(events, 3, DEFAULT_LEAGUE_SETTINGS);
    expect(boxes[2].status).toBe("used");
  });
});

describe("slotsToExpireAtHalftime (spec 6.8)", () => {
  it("expires unused first-half boxes only", () => {
    const event = makeEventBuilder();
    const events = [event("timeout", "home", null, { slot_index: 0 }, null, 1)];
    expect(slotsToExpireAtHalftime(events, DEFAULT_LEAGUE_SETTINGS)).toEqual([1]);
  });

  it("expires nothing when both first-half boxes were used", () => {
    const event = makeEventBuilder();
    const events = [
      event("timeout", "home", null, { slot_index: 0 }, null, 1),
      event("timeout", "home", null, { slot_index: 1 }, null, 2),
    ];
    expect(slotsToExpireAtHalftime(events, DEFAULT_LEAGUE_SETTINGS)).toEqual([]);
  });
});
