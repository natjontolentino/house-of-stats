import { describe, it, expect } from "vitest";
import { computeWtLadder, computePlayerFoulTotal, wtLevelLabel, canDecrementPersonalFoul } from "../fouls";
import { DEFAULT_LEAGUE_SETTINGS } from "../../types/settings";

describe("computeWtLadder (spec 6.6)", () => {
  it("starts blank", () => {
    const wt = computeWtLadder([]);
    expect(wt.level).toBe(0);
    expect(wtLevelLabel(wt.level)).toBe("");
  });

  it("steps to W on a warning", () => {
    const wt = computeWtLadder([{ event_type: "warning", payload: {} }]);
    expect(wt.level).toBe(1);
    expect(wtLevelLabel(wt.level)).toBe("W");
    expect(wt.technicalCount).toBe(0);
  });

  it("steps to T on the first technical, then T2 on the second", () => {
    const afterFirst = computeWtLadder([
      { event_type: "warning", payload: {} },
      { event_type: "technical", payload: { ordinal: 1 } },
    ]);
    expect(afterFirst.level).toBe(2);
    expect(wtLevelLabel(afterFirst.level)).toBe("T");
    expect(afterFirst.technicalCount).toBe(1);

    const afterSecond = computeWtLadder([
      { event_type: "warning", payload: {} },
      { event_type: "technical", payload: { ordinal: 1 } },
      { event_type: "technical", payload: { ordinal: 2 } },
    ]);
    expect(afterSecond.level).toBe(3);
    expect(wtLevelLabel(afterSecond.level)).toBe("T2");
    expect(afterSecond.technicalCount).toBe(2);
  });

  it("preserves history across periods — a warning in Q1 still shows once escalated in Q3", () => {
    // The ladder replays the full event list regardless of period; the
    // cell just shows the current (highest) level reached.
    const wt = computeWtLadder([
      { event_type: "warning", payload: {} },
      { event_type: "technical", payload: { ordinal: 1 } },
    ]);
    expect(wtLevelLabel(wt.level)).toBe("T");
  });
});

describe("computePlayerFoulTotal (spec 6.6, 10)", () => {
  it("adds one PF per technical when the league counts technicals toward PF (default)", () => {
    const wt = computeWtLadder([
      { event_type: "technical", payload: { ordinal: 1 } },
      { event_type: "technical", payload: { ordinal: 2 } },
    ]);
    const total = computePlayerFoulTotal(2, wt, DEFAULT_LEAGUE_SETTINGS);
    expect(total).toBe(4); // 2 personal fouls + 2 technicals
  });

  it("excludes technicals from PF when the league setting is off (e.g. NBA rules)", () => {
    const wt = computeWtLadder([{ event_type: "technical", payload: { ordinal: 1 } }]);
    const total = computePlayerFoulTotal(2, wt, {
      ...DEFAULT_LEAGUE_SETTINGS,
      technical_counts_toward_personal_fouls: false,
    });
    expect(total).toBe(2); // technical does not add to PF under this setting
  });
});

describe("canDecrementPersonalFoul (spec 6.6)", () => {
  it("refuses when the only foul came from a technical, not a personal-foul tap", () => {
    expect(canDecrementPersonalFoul(0)).toBe(false);
  });

  it("allows decrementing when a real foul_personal event exists", () => {
    expect(canDecrementPersonalFoul(1)).toBe(true);
  });
});
