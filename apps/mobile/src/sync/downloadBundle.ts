import { supabase } from "./supabaseClient";
import { resolveLeagueSettings, type GameEvent } from "@courtstats/shared";
import { cacheGameBundle, insertLocalEvent, getEventsForGame, type CachedGameBundle } from "../db/localDb";
import { isPracticeGameId } from "../state/practiceMode";

/**
 * Pre-game step 2 (spec 6.13): downloads both rosters and claims the game
 * lock. Also pulls any events that already synced for this game (spec 7.3
 * handover: a second device claiming a released lock continues from every
 * event that had synced).
 */
export async function downloadAndClaimGame(
  gameId: string,
  deviceId: string,
  options: { claimLock?: boolean } = {},
): Promise<CachedGameBundle> {
  const claimLock = options.claimLock ?? true;
  const { data: game, error: gameError } = await supabase.from("game").select("*").eq("id", gameId).single();
  if (gameError || !game) throw new Error("Could not download game — check connection.");

  const [{ data: homeTeam }, { data: awayTeam }] = await Promise.all([
    supabase.from("team").select("*").eq("id", game.home_team_id).single(),
    supabase.from("team").select("*").eq("id", game.away_team_id).single(),
  ]);
  // These are FK-guaranteed to exist once `game` fetched successfully; a
  // null here means a dropped request on this specific call, not missing
  // data — surface it as a network failure so the caller falls back to the
  // cached bundle instead of continuing with a malformed one.
  if (!homeTeam || !awayTeam) throw new Error("Could not download team data — check connection.");

  const { data: season } = await supabase.from("season").select("league_id").eq("id", game.season_id).single();
  if (!season) throw new Error("Could not download season data — check connection.");
  const { data: league } = await supabase.from("league").select("*").eq("id", season.league_id).single();
  if (!league) throw new Error("Could not download league data — check connection.");

  const { data: rosterEntries } = await supabase
    .from("roster_entry")
    .select("*")
    .in("team_id", [game.home_team_id, game.away_team_id]);

  const playerIds = (rosterEntries ?? []).map((r) => r.player_id);
  const { data: playerRows } = await supabase.from("player").select("*").in("id", playerIds);

  const players: Record<string, unknown> = {};
  (playerRows ?? []).forEach((p) => (players[p.id] = p));

  const rosterByTeam: Record<string, string[]> = {
    [game.home_team_id]: [],
    [game.away_team_id]: [],
  };
  const jerseyByPlayer: Record<string, string> = {};
  (rosterEntries ?? []).forEach((r) => {
    rosterByTeam[r.team_id].push(r.player_id);
    jerseyByPlayer[r.player_id] = r.jersey_number;
  });

  const bundle: CachedGameBundle = {
    game,
    homeTeam,
    awayTeam,
    players,
    rosterByTeam,
    jerseyByPlayer,
    settings: resolveLeagueSettings(league.settings),
  };

  await cacheGameBundle(gameId, bundle, isPracticeGameId(gameId));

  // Pull any events that already synced (handover recovery, spec 7.3).
  const localExisting = await getEventsForGame(gameId);
  const localClientUuids = new Set(localExisting.map((e) => e.client_uuid));
  const { data: remoteEvents } = await supabase
    .from("game_event")
    .select("*")
    .eq("game_id", gameId)
    .order("sequence", { ascending: true });
  for (const evt of (remoteEvents ?? []) as GameEvent[]) {
    if (localClientUuids.has(evt.client_uuid)) continue;
    await insertLocalEvent({
      client_uuid: evt.client_uuid,
      game_id: evt.game_id,
      sequence: evt.sequence,
      event_type: evt.event_type,
      team_id: evt.team_id,
      player_id: evt.player_id,
      period: evt.period,
      clock_ms: evt.clock_ms,
      payload: evt.payload,
      recorded_by_device_id: evt.recorded_by_device_id,
      recorded_by_user_id: evt.recorded_by_user_id,
      created_at: evt.created_at,
    });
  }

  // Best-effort lock claim — a game must still be trackable fully offline
  // (spec principle 1), so a failure here does not block anything. Skipped
  // entirely when only borrowing a real game's roster as a practice-mode
  // template (spec 6.15) — that must never touch the real game's lock/status.
  if (claimLock) {
    try {
      await supabase
        .from("game")
        .update({
          locked_by_device_id: deviceId,
          lock_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: game.status === "scheduled" ? "in_progress" : game.status,
        })
        .eq("id", gameId);
    } catch {
      // offline — proceed with the cached bundle; lock claim retried on next sync.
    }
  }

  return bundle;
}

/**
 * Practice mode (spec 6.15): a game flagged as practice that syncs nowhere
 * and appears in no statistics. Reuses the seeded rosters (downloaded once)
 * but gets its own local-only id, and the sync engine skips it entirely.
 */
export async function createPracticeGameBundle(
  templateGameId: string,
  practiceGameId: string,
): Promise<CachedGameBundle> {
  const template = await downloadAndClaimGame(templateGameId, "unused", { claimLock: false });
  const practiceGame = {
    ...(template.game as Record<string, unknown>),
    id: practiceGameId,
    status: "scheduled",
    locked_by_device_id: null,
  };
  const bundle: CachedGameBundle = { ...template, game: practiceGame };
  await cacheGameBundle(practiceGameId, bundle, true);
  return bundle;
}

/** Renews the lock while this device holds it (spec 7.2). Best-effort. */
export async function renewGameLock(gameId: string, deviceId: string): Promise<void> {
  try {
    await supabase
      .from("game")
      .update({ locked_by_device_id: deviceId, lock_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() })
      .eq("id", gameId);
  } catch {
    // offline — fine, retried on next tick.
  }
}
