import { HeroSection } from "../components/home/HeroSection";
import { LiveNowSection } from "../components/home/LiveNowSection";
import { LeaguesSection } from "../components/home/LeaguesSection";
import { HomeLeadersSection } from "../components/home/HomeLeadersSection";
import { PlayerLookupSection } from "../components/home/PlayerLookupSection";
import { Footer } from "../components/Footer";
import { rankLeaguesByRecentPlay } from "../lib/leagueSummary";
import { getHomeFeed, getLeagueSummaries, getLiveFeed, getSeasonStats } from "../lib/homeCache";

export const dynamic = "force-dynamic";

/**
 * Landing page: league directory, live games and season leaders are all real
 * data. Leaders show the three leagues that played most recently, newest
 * first, with one leader per category; any other leagues are a click away.
 * The "For league organizers" marketing section from the mockup is
 * deliberately left out per the user's own call to scrap it for now.
 */
export default async function HomePage() {
  const [leagues, live, feed] = await Promise.all([getLeagueSummaries(), getLiveFeed(), getHomeFeed()]);
  const ranked = await rankLeaguesByRecentPlay(leagues);
  // Stats for the few most recently active leagues, then those with real leaders first: a league whose
  // "finished" game has no recorded plays (or none at all) must not take a slot with empty leaders.
  const candidates = await Promise.all(
    ranked.slice(0, 6).map(async (league) => ({ league, stats: league.seasonId ? await getSeasonStats(league.seasonId) : null })),
  );
  const hasLeaders = (block: (typeof candidates)[number]) => (block.stats?.players.length ?? 0) > 0;
  const leaderBlocks = [...candidates.filter(hasLeaders), ...candidates.filter((b) => !hasLeaders(b))].slice(0, 3);
  // While games are live the hero shows them, so the latest final moves down into the results strip.
  const results = live.length > 0 && feed.spotlight ? [feed.spotlight, ...feed.recent] : feed.recent;

  return (
    <>
      <HeroSection live={live} latest={feed.spotlight} />
      <LiveNowSection games={live} recent={results} />
      <LeaguesSection leagues={leagues} />
      <HomeLeadersSection blocks={leaderBlocks} hasMoreLeagues={ranked.length > leaderBlocks.length} />
      <PlayerLookupSection />
      <Footer />
    </>
  );
}
