import { createGameEvent } from "../eventFactory";
import type { GameEvent } from "../../types/entities";
import type { EventType } from "../../types/events";

/**
 * Builds a fully-formed GameEvent for tests, with an auto-incrementing
 * sequence and a unique client_uuid — mirrors what the mobile app's
 * appendEvent actually constructs, so tests exercise the real event shape.
 */
export function makeEventBuilder() {
  let seq = 1;
  let uuidCounter = 0;

  return function event(
    eventType: EventType,
    teamId: string | null,
    playerId: string | null,
    payload: Record<string, unknown>,
    clockMs: number | null,
    period: number,
  ): GameEvent {
    const evt = createGameEvent({
      gameId: "test-game",
      sequence: seq++,
      eventType: eventType as never,
      teamId,
      playerId,
      period,
      clockMs,
      payload: payload as never,
      recordedByDeviceId: "test-device",
      recordedByUserId: null,
      generateUuid: () => `uuid-${uuidCounter++}`,
    });
    return { ...evt, id: evt.client_uuid } as GameEvent;
  };
}

export const PERIOD_MS = 10 * 60_000;
