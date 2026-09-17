import type { EventType, NewGameEvent, PayloadOf } from "../types/events";
import { validateEventPayload } from "../types/events";

export interface CreateEventParams<T extends EventType> {
  gameId: string;
  sequence: number;
  eventType: T;
  teamId: string | null;
  playerId: string | null;
  period: number;
  clockMs: number | null;
  payload: PayloadOf<T>;
  recordedByDeviceId: string;
  recordedByUserId: string | null;
  generateUuid: () => string;
  now?: () => string;
}

export function createGameEvent<T extends EventType>(
  params: CreateEventParams<T>,
): NewGameEvent<T> {
  const payload = validateEventPayload(params.eventType, params.payload);
  return {
    client_uuid: params.generateUuid(),
    game_id: params.gameId,
    sequence: params.sequence,
    event_type: params.eventType,
    team_id: params.teamId,
    player_id: params.playerId,
    period: params.period,
    clock_ms: params.clockMs,
    payload,
    recorded_by_device_id: params.recordedByDeviceId,
    recorded_by_user_id: params.recordedByUserId,
    voided_by_event_id: null,
    created_at: (params.now ?? (() => new Date().toISOString()))(),
  };
}

/** A player who has fouled out or been ejected cannot be substituted in (spec 6.5). */
export function canSubstituteIn(playerId: string, disqualifiedPlayerIds: string[]): boolean {
  return !disqualifiedPlayerIds.includes(playerId);
}

export const SUBSTITUTE_DISQUALIFIED_MESSAGE =
  "This player has fouled out or been ejected and cannot re-enter.";

/**
 * Shown when a stat is attempted for a disqualified player who is still
 * marked on-court because the tracker chose "Later" on the disqualification
 * prompt (spec 6.6) instead of picking a substitute immediately.
 */
export const DISQUALIFIED_PLAYER_STAT_MESSAGE =
  "This player has fouled out or been ejected. Choose a substitute before recording more stats.";
