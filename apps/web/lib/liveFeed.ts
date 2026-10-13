import { createSupabaseClient } from "./supabaseClient";
import { FRESHNESS_STALE_AFTER_MS } from "./gameData";
import type { Game } from "@courtstats/shared";
import { msToMinutesDisplay } from "@courtstats/shared";
import { buildFeedGames, type FeedGame } from "./feedBuilder";

export interface LiveFeedGame extends FeedGame {
  /** "4:21" while the league tracks a game clock, otherwise null. */
  clock: string | null;
  clockRunning: boolean;
  awayFouls: number;
  homeFouls: number;
  /** Fouls at which a team is in the penalty. */
  foulLimit: number;
  awayPenalty: boolean;
  homePenalty: boolean;
  /** True when no play has come in for a couple of minutes: the tracker may be offline. */
  delayed: boolean;
  /** ISO time of the last recorded play. */
  updatedAt: string | null;
}

/**
 * Every game being played right now, across all leagues, ordered by court so
 * simultaneous games keep a stable position. Plain JSON only (no Dates), so it
 * can be cached.
 */
export async function fetchLiveFeed(): Promise<LiveFeedGame[]> {
  const supabase = createSupabaseClient();
  const { data: rows } = await supabase.from("game").select("*").eq("status", "in_progress").order("scheduled_at");
  const games = (rows ?? []) as Game[];

  const built = await buildFeedGames(games);
  const now = Date.now();

  return built
    .map((b): LiveFeedGame => {
      const clockOn = b.settings.clock_mode !== "off" && b.liveState.lastKnownClockMs !== null;
      return {
        ...b.feed,
        clock: clockOn ? msToMinutesDisplay(b.liveState.lastKnownClockMs as number) : null,
        clockRunning: b.liveState.clockRunning,
        awayFouls: b.liveState.away.teamFoulCount,
        homeFouls: b.liveState.home.teamFoulCount,
        foulLimit: b.settings.fouls_before_team_penalty,
        awayPenalty: b.liveState.away.penaltyStatus === "red",
        homePenalty: b.liveState.home.penaltyStatus === "red",
        delayed: b.lastEventAt ? now - new Date(b.lastEventAt).getTime() > FRESHNESS_STALE_AFTER_MS : true,
        updatedAt: b.lastEventAt,
      };
    })
    .sort((a, b) => (a.courtLabel ?? "").localeCompare(b.courtLabel ?? "", undefined, { numeric: true }) || a.playedAt.localeCompare(b.playedAt));
}
