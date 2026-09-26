import { createSupabaseClient } from "./supabaseClient";
import { FRESHNESS_STALE_AFTER_MS } from "./gameData";
import { computeLiveGameState, resolveLeagueSettings, type Game, type GameEvent, type Team } from "@courtstats/shared";

export interface LiveGameSummary {
  gameId: string;
  status: "live" | "delayed";
  periodLabel: string;
  updatedAt: Date | null;
  awayTeam: string;
  awayScore: number;
  homeTeam: string;
  homeScore: number;
  leagueName: string;
  courtLabel: string | null;
}

function periodLabel(period: number, regulationPeriods: number): string {
  return period > regulationPeriods ? `OT${period - regulationPeriods}` : `Q${period}`;
}

/** Every in-progress game across all leagues, with score computed from its event log (same path as the game page). */
export async function fetchLiveGames(): Promise<LiveGameSummary[]> {
  const supabase = createSupabaseClient();

  const { data: gameRows } = await supabase
    .from("game")
    .select("*")
    .eq("status", "in_progress")
    .order("scheduled_at");
  const games = (gameRows ?? []) as Game[];
  if (games.length === 0) return [];

  const teamIds = Array.from(new Set(games.flatMap((g) => [g.home_team_id, g.away_team_id])));
  const seasonIds = Array.from(new Set(games.map((g) => g.season_id)));
  const gameIds = games.map((g) => g.id);

  const [{ data: teamRows }, { data: seasonRows }, { data: rosterRows }, { data: eventRows }] = await Promise.all([
    supabase.from("team").select("*").in("id", teamIds),
    supabase.from("season").select("id, league_id").in("id", seasonIds),
    supabase.from("roster_entry").select("team_id, player_id").in("team_id", teamIds),
    supabase.from("game_event").select("*").in("game_id", gameIds).order("sequence", { ascending: true }),
  ]);

  const teamsById = new Map(((teamRows ?? []) as Team[]).map((t) => [t.id, t]));
  const leagueIdBySeason = new Map((seasonRows ?? []).map((s) => [s.id, s.league_id as string]));

  const leagueIds = Array.from(new Set(leagueIdBySeason.values()));
  const { data: leagueRows } = await supabase.from("league").select("id, name, settings").in("id", leagueIds);
  const leaguesById = new Map((leagueRows ?? []).map((l) => [l.id, l]));

  const rosterByTeam: Record<string, string[]> = {};
  (rosterRows ?? []).forEach((r) => {
    (rosterByTeam[r.team_id] ??= []).push(r.player_id);
  });

  const eventsByGame = new Map<string, GameEvent[]>();
  ((eventRows ?? []) as GameEvent[]).forEach((e) => {
    if (!eventsByGame.has(e.game_id)) eventsByGame.set(e.game_id, []);
    eventsByGame.get(e.game_id)!.push(e);
  });

  // A game that has been opened on a tracker but has no plays yet isn't "live" -- it would only show as a delayed 0-0 game.
  return games.filter((game) => (eventsByGame.get(game.id) ?? []).length > 0).map((game) => {
    const league = leaguesById.get(leagueIdBySeason.get(game.season_id) ?? "");
    const settings = resolveLeagueSettings(league?.settings);
    const events = eventsByGame.get(game.id) ?? [];
    const liveState = computeLiveGameState({
      game: { home_team_id: game.home_team_id, away_team_id: game.away_team_id, status: game.status },
      allEvents: events,
      rosterByTeam: {
        [game.home_team_id]: rosterByTeam[game.home_team_id] ?? [],
        [game.away_team_id]: rosterByTeam[game.away_team_id] ?? [],
      },
      settings,
    });

    const updatedAt = events.length > 0 ? new Date(events[events.length - 1].created_at) : null;
    const isStale = updatedAt ? Date.now() - updatedAt.getTime() > FRESHNESS_STALE_AFTER_MS : true;

    return {
      gameId: game.id,
      status: isStale ? "delayed" : "live",
      periodLabel: periodLabel(liveState.currentPeriod, settings.period_structure_quarters),
      updatedAt,
      awayTeam: teamsById.get(game.away_team_id)?.name ?? "?",
      awayScore: liveState.away.score,
      homeTeam: teamsById.get(game.home_team_id)?.name ?? "?",
      homeScore: liveState.home.score,
      leagueName: league?.name ?? "",
      courtLabel: game.court_label,
    };
  });
}
