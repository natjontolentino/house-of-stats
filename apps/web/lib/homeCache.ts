import { unstable_cache } from "next/cache";
import { fetchHomeFeed } from "./homeFeed";
import { fetchLiveFeed } from "./liveFeed";
import { fetchLeagueSummaries } from "./leagueSummary";
import { fetchSeasonStats } from "./seasonData";

/**
 * Short-lived caches for the landing page. It reads a lot (every league's
 * season, plus recent games' full event logs), and re-deriving all of that for
 * every visitor made it take several seconds. A stale copy is served while a
 * fresh one is built in the background, so visitors almost never wait.
 *
 * Only plain-JSON results belong here: the cache serialises them, which would
 * turn a Date into a string.
 */

/** The hero spotlight and results strip; short, since a live score should keep moving. */
export const getHomeFeed = unstable_cache(fetchHomeFeed, ["home-feed"], { revalidate: 20 });

/** Every live game; very short, since scores should keep moving. */
export const getLiveFeed = unstable_cache(fetchLiveFeed, ["home-live-feed"], { revalidate: 10 });

export const getLeagueSummaries = unstable_cache(fetchLeagueSummaries, ["home-league-summaries"], { revalidate: 60 });

/** A season's leaders only change when a game is finalized. */
export const getSeasonStats = unstable_cache(fetchSeasonStats, ["home-season-stats"], { revalidate: 120 });
