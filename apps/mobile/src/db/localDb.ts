import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { initSchema } from "./schema";
import type { EventType, GameEvent, LeagueSettings } from "@courtstats/shared";

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("courtstats.db").then(async (db) => {
      await initSchema(db);
      return db;
    });
  }
  return dbPromise;
}

interface LocalEventRow {
  client_uuid: string;
  game_id: string;
  sequence: number;
  event_type: string;
  team_id: string | null;
  player_id: string | null;
  period: number;
  clock_ms: number | null;
  payload: string;
  recorded_by_device_id: string;
  recorded_by_user_id: string | null;
  created_at: string;
  synced: number;
}

function rowToGameEvent(row: LocalEventRow): GameEvent {
  return {
    id: row.client_uuid,
    game_id: row.game_id,
    sequence: row.sequence,
    event_type: row.event_type as EventType,
    team_id: row.team_id,
    player_id: row.player_id,
    period: row.period,
    clock_ms: row.clock_ms,
    payload: JSON.parse(row.payload),
    recorded_by_device_id: row.recorded_by_device_id,
    recorded_by_user_id: row.recorded_by_user_id,
    client_uuid: row.client_uuid,
    created_at: row.created_at,
    voided_by_event_id: null,
  };
}

export async function insertLocalEvent(event: {
  client_uuid: string;
  game_id: string;
  sequence: number;
  event_type: string;
  team_id: string | null;
  player_id: string | null;
  period: number;
  clock_ms: number | null;
  payload: unknown;
  recorded_by_device_id: string;
  recorded_by_user_id: string | null;
  created_at: string;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO local_game_event
      (client_uuid, game_id, sequence, event_type, team_id, player_id, period, clock_ms, payload, recorded_by_device_id, recorded_by_user_id, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      event.client_uuid,
      event.game_id,
      event.sequence,
      event.event_type,
      event.team_id,
      event.player_id,
      event.period,
      event.clock_ms,
      JSON.stringify(event.payload),
      event.recorded_by_device_id,
      event.recorded_by_user_id,
      event.created_at,
    ],
  );
}

export async function getEventsForGame(gameId: string): Promise<GameEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LocalEventRow>(
    `SELECT * FROM local_game_event WHERE game_id = ? ORDER BY sequence ASC`,
    [gameId],
  );
  return rows.map(rowToGameEvent);
}

export async function getUnsyncedEvents(gameId: string): Promise<GameEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LocalEventRow>(
    `SELECT * FROM local_game_event WHERE game_id = ? AND synced = 0 ORDER BY sequence ASC`,
    [gameId],
  );
  return rows.map(rowToGameEvent);
}

export async function markEventsSynced(clientUuids: string[]): Promise<void> {
  if (clientUuids.length === 0) return;
  const db = await getDb();
  const placeholders = clientUuids.map(() => "?").join(",");
  await db.runAsync(
    `UPDATE local_game_event SET synced = 1 WHERE client_uuid IN (${placeholders})`,
    clientUuids,
  );
}

/** Drops events that never reached the server -- used when another device took over the game, since re-sending them would collide with the new owner's events. */
export async function discardUnsyncedEventsForGame(gameId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM local_game_event WHERE game_id = ? AND synced = 0`, [gameId]);
}

export interface CachedGameBundle {
  game: unknown;
  homeTeam: unknown;
  awayTeam: unknown;
  players: Record<string, unknown>;
  rosterByTeam: Record<string, string[]>;
  jerseyByPlayer: Record<string, string>;
  settings: LeagueSettings;
}

export async function cacheGameBundle(
  gameId: string,
  bundle: CachedGameBundle,
  isPractice: boolean,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO local_game_cache (game_id, bundle_json, is_practice, cached_at) VALUES (?, ?, ?, ?)`,
    [gameId, JSON.stringify(bundle), isPractice ? 1 : 0, new Date().toISOString()],
  );
}

export async function getCachedGameBundle(gameId: string): Promise<CachedGameBundle | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ bundle_json: string }>(
    `SELECT bundle_json FROM local_game_cache WHERE game_id = ?`,
    [gameId],
  );
  return row ? JSON.parse(row.bundle_json) : null;
}

export async function getAllCachedGameIds(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ game_id: string }>(`SELECT game_id FROM local_game_cache`);
  return rows.map((r) => r.game_id);
}
