import { createSupabaseClient } from "./supabaseClient";
import {
  computeLiveGameState,
  displayPlayerName,
  resolveLeagueSettings,
  selectPlayerOfGame,
  type Game,
  type GameEvent,
  type LeagueSettings,
  type LiveGameState,
  type Player,
  type Team,
} from "@courtstats/shared";

export interface FeedTeam {
  name: string;
  shortName: string;
  logoUrl: string | null;
  score: number;
}

export interface Performer {
  playerId: string;
  name: string;
  fullName: string;
  photoUrl: string | null;
  teamName: string;
  line: string;
  /** "Player of the game" once final, "Leading the game" while it is still on. */
  label: string;
}

export interface FeedGame {
  gameId: string;
  status: "live" | "final";
  /** "Q3", "OT1"... while live, null once final. */
  periodLabel: string | null;
  playedAt: string;
  courtLabel: string | null;
  league: { name: string; slug: string; logoUrl: string | null };
  away: FeedTeam;
  home: FeedTeam;
  performer: Performer | null;
}

export interface BuiltGame {
  game: Game;
  feed: FeedGame;
  liveState: LiveGameState;
  settings: LeagueSettings;
  /** When the last play was recorded; null if none. */
  lastEventAt: string | null;
}

function periodLabel(period: number, regulationPeriods: number): string {
  return period > regulationPeriods ? `OT${period - regulationPeriods}` : `Q${period}`;
}

/**
 * Turns games into display-ready summaries. Every score and stat comes from
 * the game's own event log through the same computeLiveGameState the game
 * page uses. Games with no recorded plays are dropped -- an opened-but-empty
 * game is just a 0-0 placeholder. Output keeps the input order.
 */
export async function buildFeedGames(games: Game[]): Promise<BuiltGame[]> {
  if (games.length === 0) return [];
  const supabase = createSupabaseClient();

  // One request per game: the database caps a single response at 1000 rows.
  const eventResults = await Promise.all(
    games.map((g) => supabase.from("game_event").select("*").eq("game_id", g.id).order("sequence", { ascending: true })),
  );
  const withEvents = games
    .map((game, i) => ({ game, events: (eventResults[i].data ?? []) as GameEvent[] }))
    .filter((x) => x.events.length > 0);
  if (withEvents.length === 0) return [];

  const teamIds = Array.from(new Set(withEvents.flatMap((x) => [x.game.home_team_id, x.game.away_team_id])));
  const seasonIds = Array.from(new Set(withEvents.map((x) => x.game.season_id)));

  const [{ data: teamRows }, { data: seasonRows }, { data: rosterRows }] = await Promise.all([
    supabase.from("team").select("*").in("id", teamIds),
    supabase.from("season").select("id, league_id").in("id", seasonIds),
    supabase.from("roster_entry").select("team_id, player_id").in("team_id", teamIds),
  ]);
  const teamsById = new Map(((teamRows ?? []) as Team[]).map((t) => [t.id, t]));
  const leagueIdBySeason = new Map((seasonRows ?? []).map((s) => [s.id, s.league_id as string]));
  const { data: leagueRows } = await supabase
    .from("league")
    .select("id, name, slug, logo_url, settings")
    .in("id", Array.from(new Set(leagueIdBySeason.values())));
  const leaguesById = new Map((leagueRows ?? []).map((l) => [l.id, l]));

  const rosterByTeam: Record<string, string[]> = {};
  (rosterRows ?? []).forEach((r) => (rosterByTeam[r.team_id] ??= []).push(r.player_id));

  const built = withEvents.map(({ game, events }) => {
    const league = leaguesById.get(leagueIdBySeason.get(game.season_id) ?? "");
    const settings = resolveLeagueSettings(league?.settings);
    const liveState = computeLiveGameState({
      game: { home_team_id: game.home_team_id, away_team_id: game.away_team_id, status: game.status },
      allEvents: events,
      rosterByTeam: {
        [game.home_team_id]: rosterByTeam[game.home_team_id] ?? [],
        [game.away_team_id]: rosterByTeam[game.away_team_id] ?? [],
      },
      settings,
    });
    const team = (id: string, score: number): FeedTeam => {
      const t = teamsById.get(id);
      return { name: t?.name ?? "?", shortName: t?.short_name ?? "?", logoUrl: t?.logo_url ?? null, score };
    };
    const finished = game.status === "finalized";
    const feed: FeedGame = {
      gameId: game.id,
      status: finished ? "final" : "live",
      periodLabel: finished ? null : periodLabel(liveState.currentPeriod, settings.period_structure_quarters),
      playedAt: game.finalized_at ?? game.scheduled_at,
      courtLabel: game.court_label,
      league: { name: league?.name ?? "", slug: league?.slug ?? "", logoUrl: league?.logo_url ?? null },
      away: team(game.away_team_id, liveState.away.score),
      home: team(game.home_team_id, liveState.home.score),
      performer: null,
    };
    return { game, feed, liveState, settings, lastEventAt: events[events.length - 1]?.created_at ?? null };
  });

  // The player of the game (final) or efficiency leader (live) for each, looked up in one query.
  const picks = built.map((b) => {
    const finished = b.game.status === "finalized";
    const home = b.liveState.home.score;
    const away = b.liveState.away.score;
    const winningTeamId = finished && home !== away ? (home > away ? b.game.home_team_id : b.game.away_team_id) : null;
    const pick = selectPlayerOfGame(
      Object.values(b.liveState.players).map((p) => ({
        playerId: p.playerId,
        teamId: p.teamId,
        efficiency: p.efficiency,
        points: p.points,
        reboundsTotal: p.reboundsTotal,
        assists: p.assists,
      })),
      { winningTeamId, restrictToWinningTeam: finished ? b.settings.player_of_game_limited_to_winners : false },
    );
    // Mid-game, nobody "leads" until someone has actually contributed.
    return pick && (finished || (b.liveState.players[pick.playerId]?.efficiency ?? 0) > 0) ? pick.playerId : null;
  });
  const wanted = Array.from(new Set(picks.filter((id): id is string => !!id)));
  const { data: playerRows } = wanted.length > 0 ? await supabase.from("player").select("*").in("id", wanted) : { data: [] };
  const playersById = new Map(((playerRows ?? []) as Player[]).map((p) => [p.id, p]));

  built.forEach((b, i) => {
    const id = picks[i];
    const player = id ? playersById.get(id) : undefined;
    const line = id ? b.liveState.players[id] : undefined;
    if (!player || !line) return;
    b.feed.performer = {
      playerId: player.id,
      name: displayPlayerName(player, b.settings),
      fullName: player.full_name,
      photoUrl: player.photo_url,
      teamName: line.teamId === b.game.home_team_id ? b.feed.home.name : b.feed.away.name,
      line: `${line.points} PTS · ${line.reboundsTotal} REB · ${line.assists} AST`,
      label: b.game.status === "finalized" ? "Player of the game" : "Leading the game",
    };
  });

  return built;
}
