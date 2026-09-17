/**
 * Event types and payloads — spec section 5.2. This is the complete list.
 * Do not add event types here without updating the spec; the mobile app,
 * the reducer, and the server must never diverge on this union.
 */
import { z } from "zod";

export const EVENT_TYPES = [
  "period_start",
  "period_end",
  "clock_sync",
  "clock_start",
  "clock_stop",
  "shot_made",
  "shot_missed",
  "free_throw_made",
  "free_throw_missed",
  "rebound",
  "assist",
  "steal",
  "block",
  "turnover",
  "foul_personal",
  "warning",
  "technical",
  "substitution",
  "timeout",
  "timeout_expired",
  "ejection",
  "lineup_set",
  "game_finalized",
  "event_voided",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const period = z.object({ period: z.number().int().positive() });
const clockMs = z.object({ clock_ms: z.number().int().nonnegative() });
const points = z.object({ points: z.union([z.literal(2), z.literal(3)]) });
const reboundPayload = z.object({
  kind: z.enum(["offensive", "defensive"]),
  team_rebound: z.boolean(),
});
const turnoverPayload = z.object({ team_turnover: z.boolean() });
const warningPayload = z.object({ target: z.enum(["player", "bench"]) });
const technicalPayload = z.object({
  target: z.enum(["player", "bench"]),
  ordinal: z.union([z.literal(1), z.literal(2)]),
});
const substitutionPayload = z.object({
  player_in: z.string(),
  player_out: z.string(),
});
const timeoutPayload = z.object({ slot_index: z.number().int().nonnegative() });
const ejectionPayload = z.object({ reason: z.string() });
const lineupSetPayload = z.object({ player_ids: z.array(z.string()).length(5) });
const eventVoidedPayload = z.object({
  voids_client_uuid: z.string(),
  reason: z.string().optional(),
});
const empty = z.object({});

export const EVENT_PAYLOAD_SCHEMAS = {
  period_start: period,
  period_end: period,
  clock_sync: clockMs,
  clock_start: empty,
  clock_stop: empty,
  shot_made: points,
  shot_missed: points,
  free_throw_made: empty,
  free_throw_missed: empty,
  rebound: reboundPayload,
  assist: empty,
  steal: empty,
  block: empty,
  turnover: turnoverPayload,
  foul_personal: empty,
  warning: warningPayload,
  technical: technicalPayload,
  substitution: substitutionPayload,
  timeout: timeoutPayload,
  timeout_expired: timeoutPayload,
  ejection: ejectionPayload,
  lineup_set: lineupSetPayload,
  game_finalized: empty,
  event_voided: eventVoidedPayload,
} satisfies Record<EventType, z.ZodTypeAny>;

export type PayloadOf<T extends EventType> = z.infer<(typeof EVENT_PAYLOAD_SCHEMAS)[T]>;

export interface NewGameEvent<T extends EventType = EventType> {
  client_uuid: string;
  game_id: string;
  sequence: number;
  event_type: T;
  team_id: string | null;
  player_id: string | null;
  period: number;
  clock_ms: number | null;
  payload: PayloadOf<T>;
  recorded_by_device_id: string;
  recorded_by_user_id: string | null;
  voided_by_event_id: null;
  created_at: string;
}

export function validateEventPayload<T extends EventType>(
  eventType: T,
  payload: unknown,
): PayloadOf<T> {
  const schema = EVENT_PAYLOAD_SCHEMAS[eventType];
  return schema.parse(payload) as PayloadOf<T>;
}
