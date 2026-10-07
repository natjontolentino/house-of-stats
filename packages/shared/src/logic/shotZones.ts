/**
 * Shot zones. A zone is an optional `shot_zone` event that points at a
 * shot_made / shot_missed event, so charts are derived from the event log like
 * every other stat — nothing here is stored. Shots with no tag (older games,
 * or a tracker who skipped the picker) simply count as "unzoned".
 */
import type { GameEvent } from "../types/entities";
import { filterVoidedEvents } from "./gameState";

export const SHOT_ZONES = [
  "paint",
  "mid_left",
  "mid_top",
  "mid_right",
  "corner_left",
  "wing_left",
  "top_key",
  "wing_right",
  "corner_right",
] as const;

export type ShotZone = (typeof SHOT_ZONES)[number];

export const TWO_POINT_ZONES: readonly ShotZone[] = ["paint", "mid_left", "mid_top", "mid_right"];
export const THREE_POINT_ZONES: readonly ShotZone[] = ["corner_left", "wing_left", "top_key", "wing_right", "corner_right"];

export const SHOT_ZONE_LABELS: Record<ShotZone, string> = {
  paint: "Paint",
  mid_left: "Mid-range left",
  mid_top: "Mid-range top",
  mid_right: "Mid-range right",
  corner_left: "Corner 3 left",
  wing_left: "Wing 3 left",
  top_key: "Top of the key 3",
  wing_right: "Wing 3 right",
  corner_right: "Corner 3 right",
};

export function isShotZone(value: unknown): value is ShotZone {
  return typeof value === "string" && (SHOT_ZONES as readonly string[]).includes(value);
}

/** Zones a shot of this value can legitimately come from. */
export function zonesForShot(points: 2 | 3): readonly ShotZone[] {
  return points === 2 ? TWO_POINT_ZONES : THREE_POINT_ZONES;
}

export interface ZoneLine {
  attempts: number;
  makes: number;
  /** 0-1, or null when there are no attempts. */
  pct: number | null;
}

export interface ShotZoneStats {
  zones: Record<ShotZone, ZoneLine>;
  /** Every counted shot, with or without a zone. */
  total: ZoneLine;
  /** Shots with no (or an invalid) zone, so the chart can say how much it isn't showing. */
  unzoned: ZoneLine;
}

export interface ShotZoneFilter {
  playerId?: string;
  teamId?: string;
}

function emptyLine(): { attempts: number; makes: number } {
  return { attempts: 0, makes: 0 };
}

function finish(line: { attempts: number; makes: number }): ZoneLine {
  return { ...line, pct: line.attempts > 0 ? line.makes / line.attempts : null };
}

/**
 * Tallies field-goal attempts per zone from raw events (voids are removed
 * here). A zone that doesn't match the shot's value (a 3 tagged "paint") is
 * treated as unzoned rather than trusted — the chart should never show a
 * three-pointer inside the arc.
 */
export function computeShotZoneStats(events: GameEvent[], filter: ShotZoneFilter = {}): ShotZoneStats {
  const zones = Object.fromEntries(SHOT_ZONES.map((z) => [z, emptyLine()])) as Record<ShotZone, { attempts: number; makes: number }>;
  const total = emptyLine();
  const unzoned = emptyLine();

  const visible = filterVoidedEvents(events);
  // Latest tag wins if a shot was re-tagged.
  const zoneByShot = new Map<string, unknown>();
  for (const evt of [...visible].sort((a, b) => a.sequence - b.sequence)) {
    if (evt.event_type !== "shot_zone") continue;
    const payload = evt.payload as { shot_client_uuid?: string; zone?: unknown };
    if (payload.shot_client_uuid) zoneByShot.set(payload.shot_client_uuid, payload.zone);
  }

  for (const evt of visible) {
    if (evt.event_type !== "shot_made" && evt.event_type !== "shot_missed") continue;
    if (filter.playerId && evt.player_id !== filter.playerId) continue;
    if (filter.teamId && evt.team_id !== filter.teamId) continue;

    const made = evt.event_type === "shot_made";
    total.attempts += 1;
    if (made) total.makes += 1;

    const points = (evt.payload as { points?: number }).points === 3 ? 3 : 2;
    const tagged = zoneByShot.get(evt.client_uuid);
    const zone = isShotZone(tagged) && zonesForShot(points).includes(tagged) ? tagged : null;
    const bucket = zone ? zones[zone] : unzoned;
    bucket.attempts += 1;
    if (made) bucket.makes += 1;
  }

  return {
    zones: Object.fromEntries(SHOT_ZONES.map((z) => [z, finish(zones[z])])) as Record<ShotZone, ZoneLine>,
    total: finish(total),
    unzoned: finish(unzoned),
  };
}

export type ZoneTone = "none" | "cold" | "warm" | "hot";

/** Chart colouring: no attempts is neutral, under 33% red, 33-49% amber, 50%+ green. */
export function zoneTone(line: ZoneLine): ZoneTone {
  if (line.attempts === 0 || line.pct === null) return "none";
  if (line.pct < 0.33) return "cold";
  if (line.pct < 0.5) return "warm";
  return "hot";
}
