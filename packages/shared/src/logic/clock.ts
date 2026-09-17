/**
 * Minutes played — spec section 6.9. The game clock counts down within a
 * period. Minutes depend only on the clock reading at substitutions: sum the
 * duration between the clock_ms reading when a player enters the court and
 * the reading when they leave, across all periods. A player on court when a
 * period ends is credited to the end of the period (clock_ms = 0). Because
 * each stint uses two absolute readings rather than elapsed wall time, drift
 * between substitutions never accumulates, and a stopped clock contributes
 * zero duration on its own (its reading does not change while stopped).
 */
import type { GameEvent } from "../types/entities";

interface MinutesEvent {
  event_type: GameEvent["event_type"];
  period: number;
  clock_ms: number | null;
  player_id: string | null;
  payload: unknown;
}

/**
 * Returns total on-court milliseconds for one player, or null if the clock
 * is off for this game (no clock_ms readings), per "no clock, no minutes".
 */
export function computeMinutesMsForPlayer(
  playerId: string,
  orderedEvents: MinutesEvent[],
): number | null {
  let onCourtSinceMs: number | null = null;
  // A player who is still on court when a period ends keeps playing into
  // the next period unless subbed out — there is no separate lineup_set for
  // period 2+ (spec 6.13 only calls for one at game start), so period_start
  // must re-baseline anyone this flag says was never subbed out.
  let carryingAcrossBreak = false;
  let totalMs = 0;
  let sawAnyClock = false;

  for (const evt of orderedEvents) {
    if (evt.event_type === "lineup_set") {
      const playerIds = (evt.payload as { player_ids: string[] }).player_ids;
      if (playerIds.includes(playerId)) {
        if (evt.clock_ms !== null) sawAnyClock = true;
        onCourtSinceMs = evt.clock_ms;
      }
      continue;
    }
    if (evt.event_type === "substitution") {
      const { player_in, player_out } = evt.payload as {
        player_in: string;
        player_out: string;
      };
      if (evt.clock_ms !== null) sawAnyClock = true;
      if (player_in === playerId) {
        onCourtSinceMs = evt.clock_ms;
        carryingAcrossBreak = false;
      } else if (player_out === playerId) {
        if (onCourtSinceMs !== null && evt.clock_ms !== null) {
          totalMs += Math.max(0, onCourtSinceMs - evt.clock_ms);
        }
        onCourtSinceMs = null;
        carryingAcrossBreak = false;
      }
      continue;
    }
    if (evt.event_type === "period_end") {
      if (onCourtSinceMs !== null) {
        totalMs += Math.max(0, onCourtSinceMs);
        onCourtSinceMs = null;
        carryingAcrossBreak = true;
      }
      continue;
    }
    if (evt.event_type === "period_start") {
      if (carryingAcrossBreak) {
        if (evt.clock_ms !== null) sawAnyClock = true;
        onCourtSinceMs = evt.clock_ms;
        carryingAcrossBreak = false;
      }
      continue;
    }
  }

  return sawAnyClock ? totalMs : null;
}

export function msToMinutesDisplay(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Sync adjustment deltas offered by the Sync control (spec 6.9). */
export const CLOCK_SYNC_ADJUSTMENTS_MS = [-60_000, -10_000, 10_000, 60_000] as const;

/**
 * Event types that always stop the real clock, per the auto-pause rule
 * (spec 6.9): a personal foul, a technical, a timeout, and period end.
 */
export const AUTO_PAUSE_EVENT_TYPES = new Set([
  "foul_personal",
  "technical",
  "timeout",
  "period_end",
]);
