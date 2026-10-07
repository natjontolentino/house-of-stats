import { createSupabaseClient } from "./supabaseClient";
import type { Game, GameEvent, League, Player, RosterEntry, Season, Team } from "@courtstats/shared";
import {
  resolveLeagueSettings,
  computeLiveGameState,
  computePlayerSeasonStats,
  computeShotZoneStats,
  displayPlayerName,
  type PlayerBoxLine,
  type PlayerSeasonLine,
  type ShotZoneStats,
} from "@courtstats/shared";

export interface PlayerGameRow {
  gameId: string;
  playedAt: string;
  status: Game["status"];
  isHome: boolean;
  opponent: Pick<Team, "id" | "name" | "short_name" | "logo_url">;
  teamScore: number;
  opponentScore: number;
  /** Null when the player was on the roster but didn't appear in the log. */
  line: PlayerBoxLine | null;
}

export interface ZoneStatsByScope {
  season: ShotZoneStats;
  byGame: Record<string, ShotZoneStats>;
}

export interface PlayerProfile {
  player: Player;
  displayName: string;
  jersey: string | null;
  team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
  league: Pick<League, "id" | "name" | "slug"> | null;
  season: Pick<Season, "id" | "name"> | null;
  seasonLine: PlayerSeasonLine | null;
  games: PlayerGameRow[];
  /** Zone stats for the player themself and for their team as a whole, per game and across the season. */
  playerZones: ZoneStatsByScope;
  teamZones: ZoneStatsByScope;
}

/** A player's most recent season (by start date) is the one their page shows. */
export async function fetchPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  const supabase = createSupabaseClient();

  const { data: player } = await supabase.from("player").select("*").eq("id", playerId).maybeSingle();
  if (!player) return null;

  const { data: entries } = await supabase.from("roster_entry").select("*").eq("player_id", playerId);
  const rosterEntries = (entries ?? []) as RosterEntry[];

  const emptyZones = (): ZoneStatsByScope => ({ season: computeShotZoneStats([]), byGame: {} });
  const bare = (): PlayerProfile => ({
    player: player as Player,
    displayName: player.full_name,
    jersey: null,
    team: null,
    league: null,
    season: null,
    seasonLine: null,
    games: [],
    playerZones: emptyZones(),
    teamZones: emptyZones(),
  });
  if (rosterEntries.length === 0) return bare();

  const { data: seasonRows } = await supabase
    .from("season")
    .select("*")
    .in("id", rosterEntries.map((e) => e.season_id));
  const seasons = ((seasonRows ?? []) as Season[]).sort((a, b) => (a.starts_on < b.starts_on ? 1 : -1));
  const season = seasons[0];
  const entry = rosterEntries.find((e) => e.season_id === season?.id);
  if (!season || !entry) return bare();

  const [{ data: league }, { data: team }, { data: games }, { data: seasonRoster }, { data: seasonTeams }] = await Promise.all([
    supabase.from("league").select("*").eq("id", season.league_id).maybeSingle(),
    supabase.from("team").select("*").eq("id", entry.team_id).maybeSingle(),
    supabase
      .from("game")
      .select("*")
      .eq("season_id", season.id)
      .neq("status", "scheduled")
      .or(`home_team_id.eq.${entry.team_id},away_team_id.eq.${entry.team_id}`)
      .order("scheduled_at", { ascending: false }),
    supabase.from("roster_entry").select("*").eq("season_id", season.id),
    supabase.from("team").select("id, name, short_name, logo_url").eq("season_id", season.id),
  ]);

  const settings = resolveLeagueSettings(league?.settings);
  const teamsById: Record<string, PlayerGameRow["opponent"]> = {};
  (seasonTeams ?? []).forEach((t) => (teamsById[t.id] = t));
  const rosterByTeam: Record<string, string[]> = {};
  ((seasonRoster ?? []) as RosterEntry[]).forEach((r) => (rosterByTeam[r.team_id] ??= []).push(r.player_id));

  // One request per game: the database caps a single response at 1000 rows.
  const gameList = (games ?? []) as Game[];
  const eventResults = await Promise.all(
    gameList.map((g) => supabase.from("game_event").select("*").eq("game_id", g.id).order("sequence", { ascending: true })),
  );

  const rows: PlayerGameRow[] = [];
  const playerByGame: Record<string, ShotZoneStats> = {};
  const teamByGame: Record<string, ShotZoneStats> = {};
  const allEvents: GameEvent[] = [];
  const seasonLines: PlayerBoxLine[] = [];

  gameList.forEach((game, i) => {
    const events = (eventResults[i].data ?? []) as GameEvent[];
    allEvents.push(...events);
    const liveState = computeLiveGameState({
      game: { home_team_id: game.home_team_id, away_team_id: game.away_team_id, status: game.status },
      allEvents: events,
      rosterByTeam: {
        [game.home_team_id]: rosterByTeam[game.home_team_id] ?? [],
        [game.away_team_id]: rosterByTeam[game.away_team_id] ?? [],
      },
      settings,
    });
    const isHome = game.home_team_id === entry.team_id;
    const opponentId = isHome ? game.away_team_id : game.home_team_id;
    const line = liveState.players[playerId] ?? null;
    // Season averages only count finished games, like every other season stat.
    if (line && game.status === "finalized") seasonLines.push(line);

    rows.push({
      gameId: game.id,
      playedAt: game.finalized_at ?? game.scheduled_at,
      status: game.status,
      isHome,
      opponent: teamsById[opponentId] ?? { id: opponentId, name: "Opponent", short_name: "OPP", logo_url: null },
      teamScore: isHome ? liveState.home.score : liveState.away.score,
      opponentScore: isHome ? liveState.away.score : liveState.home.score,
      line,
    });
    playerByGame[game.id] = computeShotZoneStats(events, { playerId });
    teamByGame[game.id] = computeShotZoneStats(events, { teamId: entry.team_id });
  });

  const seasonLine = computePlayerSeasonStats(seasonLines);

  return {
    player: player as Player,
    displayName: displayPlayerName(player as Player, settings),
    jersey: entry.jersey_number,
    team: team ?? null,
    league: league ? { id: league.id, name: league.name, slug: league.slug } : null,
    season: { id: season.id, name: season.name },
    seasonLine: seasonLine && seasonLine.gamesPlayed > 0 ? seasonLine : null,
    games: rows,
    playerZones: { season: computeShotZoneStats(allEvents, { playerId }), byGame: playerByGame },
    teamZones: { season: computeShotZoneStats(allEvents, { teamId: entry.team_id }), byGame: teamByGame },
  };
}

export interface PlayerSearchHit {
  id: string;
  displayName: string;
  fullName: string;
  photoUrl: string | null;
  teamName: string | null;
  jersey: string | null;
  leagueName: string | null;
}

/** Characters that mean something inside a PostgREST filter, which a search term must not smuggle in. */
function cleanTerm(raw: string): string {
  return raw.replace(/[%,()*\\:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
}

export async function searchPlayers(rawQuery: string): Promise<PlayerSearchHit[]> {
  const term = cleanTerm(rawQuery);
  if (term.length < 2) return [];
  const supabase = createSupabaseClient();

  const { data: players } = await supabase
    .from("player")
    .select("*")
    .or(`full_name.ilike.%${term}%,nickname.ilike.%${term}%`)
    .order("full_name")
    .limit(30);
  const hits = (players ?? []) as Player[];
  if (hits.length === 0) return [];

  const { data: entries } = await supabase
    .from("roster_entry")
    .select("player_id, jersey_number, season_id, team_id")
    .in("player_id", hits.map((p) => p.id));
  const rosterEntries = entries ?? [];

  const [{ data: seasons }, { data: teams }, { data: leagues }] = await Promise.all([
    supabase.from("season").select("id, starts_on, league_id").in("id", Array.from(new Set(rosterEntries.map((e) => e.season_id)))),
    supabase.from("team").select("id, name").in("id", Array.from(new Set(rosterEntries.map((e) => e.team_id)))),
    supabase.from("league").select("id, name").in("id", Array.from(new Set(hits.map((p) => p.league_id)))),
  ]);
  const seasonById = new Map((seasons ?? []).map((s) => [s.id, s]));
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  const leagueById = new Map((leagues ?? []).map((l) => [l.id, l]));

  return hits.map((p) => {
    const mine = rosterEntries
      .filter((e) => e.player_id === p.id)
      .sort((a, b) => ((seasonById.get(a.season_id)?.starts_on ?? "") < (seasonById.get(b.season_id)?.starts_on ?? "") ? 1 : -1));
    const latest = mine[0];
    return {
      id: p.id,
      displayName: p.nickname || p.full_name,
      fullName: p.full_name,
      photoUrl: p.photo_url,
      teamName: latest ? (teamById.get(latest.team_id)?.name ?? null) : null,
      jersey: latest?.jersey_number ?? null,
      leagueName: leagueById.get(p.league_id)?.name ?? null,
    };
  });
}
