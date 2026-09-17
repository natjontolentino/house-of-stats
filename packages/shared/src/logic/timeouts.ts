/**
 * Timeout boxes — spec section 6.8. Five boxes per team: the first
 * `timeouts_first_half` are first-half boxes, the next `timeouts_second_half`
 * are second-half boxes (locked/dashed until the second half begins), and
 * each overtime period appends `overtime_timeouts_per_period` more boxes.
 */
import type { GameEvent } from "../types/entities";
import type { LeagueSettings } from "../types/settings";

export type TimeoutBoxStatus = "available" | "used" | "expired" | "locked";

export interface TimeoutBox {
  slot_index: number;
  status: TimeoutBoxStatus;
}

interface TimeoutSettings
  extends Pick<
    LeagueSettings,
    | "timeouts_first_half"
    | "timeouts_second_half"
    | "overtime_timeouts_per_period"
    | "period_structure_quarters"
  > {}

export function regulationHalfBoundaryPeriod(settings: TimeoutSettings): number {
  return settings.period_structure_quarters / 2;
}

export function totalTimeoutBoxes(
  settings: TimeoutSettings,
  currentPeriod: number,
): number {
  const regulation = settings.timeouts_first_half + settings.timeouts_second_half;
  const otPeriods = Math.max(0, currentPeriod - settings.period_structure_quarters);
  return regulation + otPeriods * settings.overtime_timeouts_per_period;
}

/** True once the game clock has moved into the second half or later. */
export function isSecondHalfOrLater(period: number, settings: TimeoutSettings): boolean {
  return period > regulationHalfBoundaryPeriod(settings);
}

export function computeTimeoutBoxes(
  events: Array<Pick<GameEvent, "event_type" | "payload">>,
  currentPeriod: number,
  settings: TimeoutSettings,
): TimeoutBox[] {
  const used = new Set<number>();
  const expired = new Set<number>();
  for (const evt of events) {
    const slot = (evt.payload as { slot_index: number } | undefined)?.slot_index;
    if (slot === undefined) continue;
    if (evt.event_type === "timeout") used.add(slot);
    if (evt.event_type === "timeout_expired") expired.add(slot);
  }

  const firstHalfCount = settings.timeouts_first_half;
  const secondHalfStart = firstHalfCount;
  const secondHalfEnd = firstHalfCount + settings.timeouts_second_half;
  const total = totalTimeoutBoxes(settings, currentPeriod);
  const secondHalfBegun = isSecondHalfOrLater(currentPeriod, settings);

  const boxes: TimeoutBox[] = [];
  for (let i = 0; i < total; i++) {
    let status: TimeoutBoxStatus;
    if (used.has(i)) {
      status = "used";
    } else if (expired.has(i)) {
      status = "expired";
    } else if (i >= secondHalfStart && i < secondHalfEnd && !secondHalfBegun) {
      status = "locked";
    } else {
      status = "available";
    }
    boxes.push({ slot_index: i, status });
  }
  return boxes;
}

/**
 * Called by the tracker app when it processes a period_end crossing the
 * regulation half boundary: returns the slot indices that must have a
 * timeout_expired event written for them (unused first-half boxes only).
 */
export function slotsToExpireAtHalftime(
  events: Array<Pick<GameEvent, "event_type" | "payload">>,
  settings: TimeoutSettings,
): number[] {
  const used = new Set<number>();
  const expired = new Set<number>();
  for (const evt of events) {
    const slot = (evt.payload as { slot_index: number } | undefined)?.slot_index;
    if (slot === undefined) continue;
    if (evt.event_type === "timeout") used.add(slot);
    if (evt.event_type === "timeout_expired") expired.add(slot);
  }
  const toExpire: number[] = [];
  for (let i = 0; i < settings.timeouts_first_half; i++) {
    if (!used.has(i) && !expired.has(i)) toExpire.push(i);
  }
  return toExpire;
}
