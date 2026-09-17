import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Local SQLite is the source of truth during a game (spec 4, principle 1).
 * Every write lands here first, always; sync pushes unsynced rows out
 * whenever a connection exists (7.4).
 */
export async function initSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS local_game_event (
      client_uuid TEXT PRIMARY KEY NOT NULL,
      game_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      team_id TEXT,
      player_id TEXT,
      period INTEGER NOT NULL,
      clock_ms INTEGER,
      payload TEXT NOT NULL,
      recorded_by_device_id TEXT NOT NULL,
      recorded_by_user_id TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      UNIQUE (game_id, sequence)
    );

    CREATE INDEX IF NOT EXISTS idx_local_game_event_game
      ON local_game_event (game_id, sequence);

    CREATE INDEX IF NOT EXISTS idx_local_game_event_unsynced
      ON local_game_event (synced);

    CREATE TABLE IF NOT EXISTS local_game_cache (
      game_id TEXT PRIMARY KEY NOT NULL,
      bundle_json TEXT NOT NULL,
      is_practice INTEGER NOT NULL DEFAULT 0,
      cached_at TEXT NOT NULL
    );
  `);
}
