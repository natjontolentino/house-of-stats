import { supabase } from "./supabaseClient";
import { getUnsyncedEvents, markEventsSynced } from "../db/localDb";
import { isPracticeGameId } from "../state/practiceMode";

export type SyncStatus = "synced" | "pending" | "offline";

let lastSyncError = false;
let lastHeartbeatAt = 0;

/** device.last_seen_at (spec 5.1) — a cheap signal for the organizer's sync-health dashboard (8.2). */
async function touchDeviceHeartbeat(deviceId: string) {
  const now = Date.now();
  if (now - lastHeartbeatAt < 60_000) return;
  lastHeartbeatAt = now;
  try {
    await supabase.from("device").update({ last_seen_at: new Date().toISOString() }).eq("id", deviceId);
  } catch {
    // best-effort only
  }
}

/**
 * Background push (spec 7.4): appends unsynced local events to the server
 * in batches whenever a connection exists. The server dedupes on
 * client_uuid (a unique constraint + ignoreDuplicates upsert), so a retried
 * write is never double-applied. Practice games (6.15) never sync.
 */
export async function pushUnsyncedEvents(gameId: string, deviceId: string): Promise<SyncStatus> {
  if (isPracticeGameId(gameId)) return "synced";

  touchDeviceHeartbeat(deviceId);

  const unsynced = await getUnsyncedEvents(gameId);
  if (unsynced.length === 0) {
    return lastSyncError ? "offline" : "synced";
  }

  const BATCH_SIZE = 50;
  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE).map((e) => ({
      game_id: e.game_id,
      sequence: e.sequence,
      event_type: e.event_type,
      team_id: e.team_id,
      player_id: e.player_id,
      period: e.period,
      clock_ms: e.clock_ms,
      payload: e.payload,
      recorded_by_device_id: e.recorded_by_device_id,
      recorded_by_user_id: e.recorded_by_user_id,
      client_uuid: e.client_uuid,
      created_at: e.created_at,
    }));

    const { error } = await supabase
      .from("game_event")
      .upsert(batch, { onConflict: "client_uuid", ignoreDuplicates: true });

    if (error) {
      lastSyncError = true;
      return "offline";
    }
    await markEventsSynced(batch.map((b) => b.client_uuid));
  }

  lastSyncError = false;
  return "pending";
}

export function startSyncLoop(getActiveGameId: () => string | null, deviceId: string, intervalMs = 5000): () => void {
  const id = setInterval(() => {
    const gameId = getActiveGameId();
    if (gameId) {
      pushUnsyncedEvents(gameId, deviceId).catch(() => {
        lastSyncError = true;
      });
    }
  }, intervalMs);
  return () => clearInterval(id);
}
