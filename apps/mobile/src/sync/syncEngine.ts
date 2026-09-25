import { supabase } from "./supabaseClient";
import { getUnsyncedEvents, markEventsSynced } from "../db/localDb";
import { isPracticeGameId } from "../state/practiceMode";

export type SyncStatus = "synced" | "pending" | "offline";

let lastSyncError = false;
let lastHeartbeatAt = 0;

/** device.last_seen_at (spec 5.1) — a cheap signal for the organizer's sync-health dashboard (8.2). */
async function touchDeviceHeartbeat(deviceId: string, deviceToken: string, gameId: string) {
  const now = Date.now();
  if (now - lastHeartbeatAt < 60_000) return;
  lastHeartbeatAt = now;
  try {
    // Also renews this device's lock on the game it is tracking (spec 7.2).
    await supabase.rpc("device_heartbeat", { p_device_id: deviceId, p_token: deviceToken, p_game_id: gameId });
  } catch {
    // best-effort only
  }
}

/**
 * Background push (spec 7.4): appends unsynced local events to the server
 * in batches whenever a connection exists. The server dedupes on
 * client_uuid (unique constraint, on conflict do nothing), so a retried
 * write is never double-applied. Practice games (6.15) never sync.
 */
export async function pushUnsyncedEvents(gameId: string, deviceId: string, deviceToken: string): Promise<SyncStatus> {
  if (isPracticeGameId(gameId)) return "synced";

  touchDeviceHeartbeat(deviceId, deviceToken, gameId);

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
      client_uuid: e.client_uuid,
      created_at: e.created_at,
    }));

    // The server stamps recorded_by_device_id from the authenticated device.
    const { error } = await supabase.rpc("device_push_events", {
      p_device_id: deviceId,
      p_token: deviceToken,
      p_events: batch,
    });

    if (error) {
      lastSyncError = true;
      return "offline";
    }
    await markEventsSynced(batch.map((b) => b.client_uuid));
  }

  lastSyncError = false;
  return "pending";
}
