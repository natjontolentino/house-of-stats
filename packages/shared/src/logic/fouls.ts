/**
 * The W/T ladder — spec section 6.6. This is a state machine, not a counter:
 * level 0 (blank) -> 1 (W) -> 2 (T) -> 3 (T2), stepped up by tap, down by long-press.
 */
import type { GameEvent } from "../types/entities";
import type { LeagueSettings } from "../types/settings";

export type WtLevel = 0 | 1 | 2 | 3;

export interface WtState {
  level: WtLevel;
  /** Number of `technical` events reached — each one individually adds +1 PF and +1 team foul. */
  technicalCount: number;
}

/**
 * Replay warning/technical events (already filtered to one player or the
 * team row, and already excluding voided events) into the current ladder level.
 * Each `warning` event steps to level 1, each `technical` event steps to the
 * next technical ordinal (2 then 3). This does not itself decrement —
 * long-press "step down" is recorded as its own event_voided targeting the
 * most recent warning/technical event for that subject, so replay naturally
 * reflects it once voided events are excluded.
 */
export function computeWtLadder(
  events: Array<Pick<GameEvent, "event_type" | "payload">>,
): WtState {
  let level: WtLevel = 0;
  let technicalCount = 0;
  for (const evt of events) {
    if (evt.event_type === "warning") {
      level = 1;
    } else if (evt.event_type === "technical") {
      technicalCount += 1;
      const ordinal = (evt.payload as { ordinal: 1 | 2 }).ordinal;
      level = ordinal === 1 ? 2 : 3;
    }
  }
  return { level, technicalCount };
}

export function wtLevelLabel(level: WtLevel): "" | "W" | "T" | "T2" {
  return level === 0 ? "" : level === 1 ? "W" : level === 2 ? "T" : "T2";
}

/**
 * A player's total PF (spec 6.6): personal fouls plus one foul per
 * technical reached (each technical individually adds +1) — unless the
 * league has "technical counts toward personal fouls" turned off (spec 10,
 * e.g. NBA rules), in which case technicals never add to PF.
 */
export function computePlayerFoulTotal(
  foulPersonalCount: number,
  wtState: WtState,
  settings: Pick<LeagueSettings, "technical_counts_toward_personal_fouls">,
): number {
  return foulPersonalCount + (settings.technical_counts_toward_personal_fouls ? wtState.technicalCount : 0);
}

/**
 * Long-pressing the PF cell voids the most recent `foul_personal` event.
 * Refuse (spec 6.6) when there is no such event to void — i.e. the only
 * foul contributing to PF came from the W/T ladder, not a personal foul tap.
 */
export function canDecrementPersonalFoul(foulPersonalCount: number): boolean {
  return foulPersonalCount > 0;
}

export const PF_FROM_TECHNICAL_MESSAGE =
  "That foul came from the technical. Remove it in the W/T column.";
