import { supabase } from "./supabaseClient";
import { resolveLeagueSettings, type GameEvent } from "@courtstats/shared";
import { cacheGameBundle, insertLocalEvent, getEventsForGame, type CachedGameBundle } from "../db/localDb";
import { isPracticeGameId } from "../state/practiceMode";

/** Another device holds a live lock on this game (spec 7.2). */
export class GameLockedError extends Error {
  constructor(public readonly holderLabel: string | null) {
    super("Game is being tracked by another device.");
  }
}

/** The server rejected the lock claim outright (not a network failure). */
export class GameClaimError extends Error {}

/**
 * Pre-game step 2 (spec 6.13): downloads both rosters and claims the game
 * lock. Also pulls any events that already synced for this game (spec 7.3
 * handover: a second device claiming a released lock continues from every
 * event that had synced).
 */
export async function downloadAndClaimGame(
  gameId: string,
  deviceId: string,
  deviceToken: string,
  options: { claimLock?: boolean; takeover?: boolean } = {},
): Promise<CachedGameBundle> {
  const claimLock = options.claimLock ?? true;
  const { data: game, error: gameError } = await supabase.from("game").select("*").eq("id", gameId).single();
  if (gameError || !game) throw new Error("Could not download game — check connection.");

  // Spec 7.2: one device owns a game. Checked before anything is cached so a
  // refused claim leaves no trace on this device. Skipped when only borrowing
  // a real game's roster as a practice-mode template (spec 6.15). If the
  // server can't be reached the claim is skipped rather than blocking — a
  // game must stay trackable offline (spec principle 1) — and the heartbeat
  // picks the lock up on the first sync.
  if (claimLock) {
    const { data: claim, error: claimError } = await supabase
      .rpc("device_claim_game", {
        p_device_id: deviceId,
        p_token: deviceToken,
        p_game_id: gameId,
        p_takeover: options.takeover ?? false,
      })
      .single();
    // A failed request has no error code and falls through (offline). An error
    // the server itself returned (bad token, missing function, wrong league)
    // means the lock is NOT working, so it must not be mistaken for offline.
    if (claimError?.code) {
      throw new GameClaimError(claimError.message);
    }
    const row = claim as { result: string; holder_label: string | null } | null;
    if (row?.result === "locked") {
      throw new GameLockedError(row.holder_label);
    }
  }

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
  const template = await downloadAndClaimGame(templateGameId, "unused", "unused", { claimLock: false });
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
