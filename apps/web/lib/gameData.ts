import { createSupabaseClient } from "./supabaseClient";
import type { Game, GameEvent, Player, RosterEntry, Team, League } from "@courtstats/shared";
import { resolveLeagueSettings } from "@courtstats/shared";

export interface GameBundle {
  game: Game;
  league: League;
  homeTeam: Team;
  awayTeam: Team;
  players: Record<string, Player>;
  rosterByTeam: Record<string, string[]>;
  jerseyByPlayer: Record<string, string>;
  events: GameEvent[];
  settings: ReturnType<typeof resolveLeagueSettings>;
}

export async function fetchGameBundle(gameId: string): Promise<GameBundle | null> {
  const supabase = createSupabaseClient();

  const { data: game, error: gameError } = await supabase
    .from("game")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();
  if (gameError || !game) return null;

  const [{ data: homeTeam }, { data: awayTeam }] = await Promise.all([
    supabase.from("team").select("*").eq("id", game.home_team_id).single(),
    supabase.from("team").select("*").eq("id", game.away_team_id).single(),
  ]);
  if (!homeTeam || !awayTeam) return null;

  const { data: season } = await supabase
    .from("season")
    .select("league_id")
    .eq("id", game.season_id)
    .single();
  if (!season) return null;

  const { data: league } = await supabase
    .from("league")
    .select("*")
    .eq("id", season.league_id)
    .single();
  if (!league) return null;

  const { data: rosterEntries } = await supabase
    .from("roster_entry")
    .select("*")
    .in("team_id", [game.home_team_id, game.away_team_id]);

  const playerIds = (rosterEntries ?? []).map((r: RosterEntry) => r.player_id);
  const { data: playerRows } = await supabase.from("player").select("*").in("id", playerIds);

  const players: Record<string, Player> = {};
  (playerRows ?? []).forEach((p: Player) => (players[p.id] = p));

  const rosterByTeam: Record<string, string[]> = {
    [game.home_team_id]: [],
    [game.away_team_id]: [],
  };
  const jerseyByPlayer: Record<string, string> = {};
  (rosterEntries ?? []).forEach((r: RosterEntry) => {
    rosterByTeam[r.team_id] = rosterByTeam[r.team_id] ?? [];
    rosterByTeam[r.team_id].push(r.player_id);
    jerseyByPlayer[r.player_id] = r.jersey_number;
  });

  const { data: events } = await supabase
    .from("game_event")
    .select("*")
    .eq("game_id", gameId)
    .order("sequence", { ascending: true });

  return {
    game: game as Game,
    league: league as League,
    homeTeam: homeTeam as Team,
    awayTeam: awayTeam as Team,
    players,
    rosterByTeam,
    jerseyByPlayer,
    events: (events ?? []) as GameEvent[],
    settings: resolveLeagueSettings(league.settings),
  };
}

/** Freshness (spec 7.5): time since the most recent event synced for this game. */
export function lastSyncedAt(events: GameEvent[]): Date | null {
  if (events.length === 0) return null;
  return new Date(events[events.length - 1].created_at);
}

export const FRESHNESS_STALE_AFTER_MS = 2 * 60 * 1000;
