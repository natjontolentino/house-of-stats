import { createSupabaseClient } from "./supabaseClient";
import type { Game } from "@courtstats/shared";
import { buildFeedGames, type FeedGame } from "./feedBuilder";

export type { FeedGame, FeedTeam, Performer } from "./feedBuilder";

export interface HomeFeed {
  /** The most recent final, featured when nothing is live. */
  spotlight: FeedGame | null;
  /** Other recent finals, newest first. */
  recent: FeedGame[];
}

const CANDIDATE_GAMES = 30;
const MAX_GAMES = 10;
/** So one busy league can't fill the whole results strip. */
const MAX_PER_LEAGUE = 3;

/** Recent finished games for the landing page: the latest as a spotlight and a few per league as a results strip. Live games come from liveFeed instead. */
export async function fetchHomeFeed(): Promise<HomeFeed> {
  const supabase = createSupabaseClient();

  const { data: gameRows } = await supabase
    .from("game")
    .select("*")
    .eq("status", "finalized")
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

  const built = (await buildFeedGames(selected)).map((b) => b.feed);
  return { spotlight: built[0] ?? null, recent: built.slice(1) };
}
