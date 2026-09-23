import { createSupabaseClient } from "./supabaseClient";
import type { Game, GameEvent, Player, Team } from "@courtstats/shared";
import {
  resolveLeagueSettings,
  computeLiveGameState,
  computePlayerSeasonStats,
  computeStandings,
  type PlayerBoxLine,
  type PlayerSeasonLine,
  type StandingsRow,
} from "@courtstats/shared";

export interface SeasonStatsResult {
  players: PlayerSeasonLine[];
  standings: StandingsRow[];
  playersById: Record<string, Player>;
  teamsById: Record<string, Team>;
  settings: ReturnType<typeof resolveLeagueSettings>;
}

/**
 * Assembles season-wide stats the same way the single-game page assembles a
 * game's: fetch the raw event log per game, run it through the one shared
 * computeLiveGameState, and only aggregate the *output* across games
 * (computePlayerSeasonStats / computeStandings, both in packages/shared) --
 * never re-derive a stat from events directly here.
 */
export async function fetchSeasonStats(seasonId: string): Promise<SeasonStatsResult> {
  const supabase = createSupabaseClient();

  const { data: season } = await supabase.from("season").select("league_id").eq("id", seasonId).single();
  if (!season) {
    return { players: [], standings: [], playersById: {}, teamsById: {}, settings: resolveLeagueSettings(null) };
  }

  const { data: league } = await supabase.from("league").select("*").eq("id", season.league_id).single();
  const settings = resolveLeagueSettings(league?.settings);

  const { data: games } = await supabase
    .from("game")
    .select("*")
    .eq("season_id", seasonId)
    .eq("status", "finalized");
  const finalizedGames = (games ?? []) as Game[];

  const { data: teamRows } = await supabase.from("team").select("*").eq("season_id", seasonId);
  const teams = (teamRows ?? []) as Team[];
  const teamsById: Record<string, Team> = {};
  teams.forEach((t) => (teamsById[t.id] = t));

  if (finalizedGames.length === 0) {
    return { players: [], standings: [], playersById: {}, teamsById, settings };
  }

  const teamIds = teams.map((t) => t.id);
  const { data: rosterEntries } = await supabase.from("roster_entry").select("*").in("team_id", teamIds);
  const rosterByTeam: Record<string, string[]> = {};
  (rosterEntries ?? []).forEach((r) => {
    (rosterByTeam[r.team_id] ??= []).push(r.player_id);
  });

  const playerIds = Array.from(new Set((rosterEntries ?? []).map((r) => r.player_id)));
  const { data: playerRows } = await supabase.from("player").select("*").in("id", playerIds);
  const playersById: Record<string, Player> = {};
  (playerRows ?? []).forEach((p: Player) => (playersById[p.id] = p));

  const gameIds = finalizedGames.map((g) => g.id);
  const { data: allEvents } = await supabase
    .from("game_event")
    .select("*")
    .in("game_id", gameIds)
    .order("sequence", { ascending: true });
  const eventsByGame = new Map<string, GameEvent[]>();
  ((allEvents ?? []) as GameEvent[]).forEach((e) => {
    if (!eventsByGame.has(e.game_id)) eventsByGame.set(e.game_id, []);
    eventsByGame.get(e.game_id)!.push(e);
  });

  const linesByPlayer = new Map<string, PlayerBoxLine[]>();
  const teamResults: Parameters<typeof computeStandings>[0] = [];

  for (const game of finalizedGames) {
    const events = eventsByGame.get(game.id) ?? [];
    const gameRosterByTeam = {
      [game.home_team_id]: rosterByTeam[game.home_team_id] ?? [],
      [game.away_team_id]: rosterByTeam[game.away_team_id] ?? [],
    };
    const liveState = computeLiveGameState({
      game: { home_team_id: game.home_team_id, away_team_id: game.away_team_id, status: game.status },
      allEvents: events,
      rosterByTeam: gameRosterByTeam,
      settings,
    });

    for (const player of Object.values(liveState.players)) {
      if (!linesByPlayer.has(player.playerId)) linesByPlayer.set(player.playerId, []);
      linesByPlayer.get(player.playerId)!.push(player);
    }

    const playedAt = game.finalized_at ?? game.scheduled_at;
    teamResults.push(
      {
        gameId: game.id,
        teamId: game.home_team_id,
        opponentTeamId: game.away_team_id,
        pointsFor: liveState.home.score,
        pointsAgainst: liveState.away.score,
        playedAt,
      },
      {
        gameId: game.id,
        teamId: game.away_team_id,
        opponentTeamId: game.home_team_id,
        pointsFor: liveState.away.score,
        pointsAgainst: liveState.home.score,
        playedAt,
      },
    );
  }

  const players = Array.from(linesByPlayer.values())
    .map((lines) => computePlayerSeasonStats(lines))
    .filter((p): p is PlayerSeasonLine => p !== null && p.gamesPlayed > 0);

  const standings = computeStandings(teamResults, settings.standings_tiebreakers);

  return { players, standings, playersById, teamsById, settings };
}
