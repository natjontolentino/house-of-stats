import { createSupabaseClient } from "./supabaseClient";
import type { Game, GameEvent, Player, Team } from "@courtstats/shared";
import {
  resolveLeagueSettings,
  computeLiveGameState,
  computePlayerSeasonStats,
  computeStandings,
  computeTeamSeasonStats,
  computeTeamTotalsFromPlayers,
  type PlayerBoxLine,
  type PlayerSeasonLine,
  type StandingsRow,
  type TeamGameTotals,
  type TeamSeasonLine,
} from "@courtstats/shared";

export interface SeasonStatsResult {
  players: PlayerSeasonLine[];
  teamStats: TeamSeasonLine[];
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
    return { players: [], teamStats: [], standings: [], playersById: {}, teamsById: {}, settings: resolveLeagueSettings(null) };
  }

  // Independent lookups run together instead of one after another -- each one
  // is a network round trip to the database.
  const [{ data: league }, { data: games }, { data: teamRows }, { data: rosterEntries }] = await Promise.all([
    supabase.from("league").select("*").eq("id", season.league_id).single(),
    supabase.from("game").select("*").eq("season_id", seasonId).eq("status", "finalized"),
    supabase.from("team").select("*").eq("season_id", seasonId),
    supabase.from("roster_entry").select("*").eq("season_id", seasonId),
  ]);
  const settings = resolveLeagueSettings(league?.settings);
  const finalizedGames = (games ?? []) as Game[];
  const teams = (teamRows ?? []) as Team[];
  const teamsById: Record<string, Team> = {};
  teams.forEach((t) => (teamsById[t.id] = t));

  if (finalizedGames.length === 0) {
    return { players: [], teamStats: [], standings: [], playersById: {}, teamsById, settings };
  }

  const rosterByTeam: Record<string, string[]> = {};
  (rosterEntries ?? []).forEach((r) => {
    (rosterByTeam[r.team_id] ??= []).push(r.player_id);
  });
  const playerIds = Array.from(new Set((rosterEntries ?? []).map((r) => r.player_id)));

  // Plays are fetched one game at a time, in parallel: the database returns at
  // most 1000 rows per request, which a whole season's plays would exceed and
  // silently truncate.
  const [{ data: playerRows }, eventResults] = await Promise.all([
    supabase.from("player").select("*").in("id", playerIds),
    Promise.all(
      finalizedGames.map((g) =>
        supabase.from("game_event").select("*").eq("game_id", g.id).order("sequence", { ascending: true }),
      ),
    ),
  ]);
  const playersById: Record<string, Player> = {};
  (playerRows ?? []).forEach((p: Player) => (playersById[p.id] = p));

  const eventsByGame = new Map<string, GameEvent[]>();
  finalizedGames.forEach((g, i) => eventsByGame.set(g.id, (eventResults[i].data ?? []) as GameEvent[]));

  const linesByPlayer = new Map<string, PlayerBoxLine[]>();
  const teamResults: Parameters<typeof computeStandings>[0] = [];
  const teamGameTotals: TeamGameTotals[] = [];

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

    for (const teamId of [game.home_team_id, game.away_team_id]) {
      const totals = computeTeamTotalsFromPlayers(teamId, liveState.players, liveState.teams[teamId]);
      const opponentScore = (teamId === game.home_team_id ? liveState.away : liveState.home).score;
      teamGameTotals.push({
        teamId,
        gameId: game.id,
        points: totals.points,
        pointsAgainst: opponentScore,
        fieldGoalMade: totals.fieldGoalMade,
        fieldGoalAttempted: totals.fieldGoalAttempted,
        threePointMade: totals.threePointMade,
        threePointAttempted: totals.threePointAttempted,
        ftMade: totals.ftMade,
        ftAttempted: totals.ftAttempted,
        reboundsOffensive: totals.reboundsOffensive,
        reboundsDefensive: totals.reboundsDefensive,
        assists: totals.assists,
        steals: totals.steals,
        blocks: totals.blocks,
        turnovers: totals.turnovers,
        personalFouls: totals.personalFouls,
      });
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

  return { players, teamStats: computeTeamSeasonStats(teamGameTotals), standings, playersById, teamsById, settings };
}
