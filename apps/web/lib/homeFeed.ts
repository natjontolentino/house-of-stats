import { createSupabaseClient } from "./supabaseClient";
import {
  computeLiveGameState,
  displayPlayerName,
  resolveLeagueSettings,
  selectPlayerOfGame,
  type Game,
  type GameEvent,
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

export interface Spotlight extends FeedGame {
  performer: Performer | null;
}

export interface HomeFeed {
  /** The live game most recently under way, or else the latest final. */
  spotlight: Spotlight | null;
  /** Other recent finals, newest first. */
  recent: FeedGame[];
}

const CANDIDATE_GAMES = 30;
const MAX_GAMES = 10;
/** So one busy league can't fill the whole results strip. */
const MAX_PER_LEAGUE = 3;

function periodLabel(period: number, regulationPeriods: number): string {
  return period > regulationPeriods ? `OT${period - regulationPeriods}` : `Q${period}`;
}

function performerLine(p: LiveGameState["players"][string]): string {
  return `${p.points} PTS · ${p.reboundsTotal} REB · ${p.assists} AST`;
}

/**
 * What the landing page's hero and results strip show: the game to spotlight
 * (live if anything is on, otherwise the latest final) and a handful of recent
 * finals. Scores come from each game's event log through the same
 * computeLiveGameState every other page uses.
 */
export async function fetchHomeFeed(): Promise<HomeFeed> {
  const supabase = createSupabaseClient();

  const { data: gameRows } = await supabase
    .from("game")
    .select("*")
    .in("status", ["in_progress", "finalized"])
    .order("scheduled_at", { ascending: false })
    .limit(CANDIDATE_GAMES);
  const candidates = (gameRows ?? []) as Game[];
  if (candidates.length === 0) return { spotlight: null, recent: [] };

  const { data: seasonRows } = await supabase
    .from("season")
    .select("id, league_id")
    .in("id", Array.from(new Set(candidates.map((g) => g.season_id))));
  const leagueIdBySeason = new Map((seasonRows ?? []).map((s) => [s.id, s.league_id as string]));

  // Newest first, but at most a few per league, so every league gets a look in.
  const perLeague = new Map<string, number>();
  const selected: Game[] = [];
  for (const game of candidates) {
    const leagueId = leagueIdBySeason.get(game.season_id) ?? game.season_id;
    const taken = perLeague.get(leagueId) ?? 0;
    if (taken >= MAX_PER_LEAGUE) continue;
    perLeague.set(leagueId, taken + 1);
    selected.push(game);
    if (selected.length >= MAX_GAMES) break;
  }

  // One request per game: the database caps a single response at 1000 rows.
  const eventResults = await Promise.all(
    selected.map((g) => supabase.from("game_event").select("*").eq("game_id", g.id).order("sequence", { ascending: true })),
  );
  const withEvents = selected
    .map((game, i) => ({ game, events: (eventResults[i].data ?? []) as GameEvent[] }))
    // An opened-but-empty game is just a 0-0 placeholder, not something to feature.
    .filter((x) => x.events.length > 0);
  if (withEvents.length === 0) return { spotlight: null, recent: [] };

  const teamIds = Array.from(new Set(withEvents.flatMap((x) => [x.game.home_team_id, x.game.away_team_id])));
  const [{ data: teamRows }, { data: rosterRows }] = await Promise.all([
    supabase.from("team").select("*").in("id", teamIds),
    supabase.from("roster_entry").select("team_id, player_id").in("team_id", teamIds),
  ]);
  const teamsById = new Map(((teamRows ?? []) as Team[]).map((t) => [t.id, t]));
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
    const feed: FeedGame = {
      gameId: game.id,
      status: game.status === "finalized" ? "final" : "live",
      periodLabel: game.status === "finalized" ? null : periodLabel(liveState.currentPeriod, settings.period_structure_quarters),
      playedAt: game.finalized_at ?? game.scheduled_at,
      courtLabel: game.court_label,
      league: { name: league?.name ?? "", slug: league?.slug ?? "", logoUrl: league?.logo_url ?? null },
      away: team(game.away_team_id, liveState.away.score),
      home: team(game.home_team_id, liveState.home.score),
    };
    return { game, feed, liveState, settings };
  });

  // Live beats final; within each, the list is already newest first.
  const spotlightEntry = built.find((b) => b.feed.status === "live") ?? built[0];
  const others = built.filter((b) => b !== spotlightEntry && b.feed.status === "final").map((b) => b.feed);

  const { game, feed, liveState, settings } = spotlightEntry;
  let performer: Performer | null = null;
  const players = Object.values(liveState.players).map((p) => ({
    playerId: p.playerId,
    teamId: p.teamId,
    efficiency: p.efficiency,
    points: p.points,
    reboundsTotal: p.reboundsTotal,
    assists: p.assists,
  }));
  const finished = game.status === "finalized";
  const winningTeamId = finished
    ? liveState.home.score === liveState.away.score
      ? null
      : liveState.home.score > liveState.away.score
        ? game.home_team_id
        : game.away_team_id
    : null;
  const pick = selectPlayerOfGame(players, {
    winningTeamId,
    restrictToWinningTeam: finished ? settings.player_of_game_limited_to_winners : false,
  });
  if (pick && (finished || (liveState.players[pick.playerId]?.efficiency ?? 0) > 0)) {
    const { data: playerRow } = await supabase.from("player").select("*").eq("id", pick.playerId).maybeSingle();
    const line = liveState.players[pick.playerId];
    if (playerRow && line) {
      const p = playerRow as Player;
      performer = {
        playerId: p.id,
        name: displayPlayerName(p, settings),
        fullName: p.full_name,
        photoUrl: p.photo_url,
        teamName: line.teamId === game.home_team_id ? feed.home.name : feed.away.name,
        line: performerLine(line),
        label: finished ? "Player of the game" : "Leading the game",
      };
    }
  }

  return { spotlight: { ...feed, performer }, recent: others };
}
