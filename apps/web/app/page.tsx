import { HeroSection } from "../components/home/HeroSection";
import { LiveNowSection } from "../components/home/LiveNowSection";
import { LeaguesSection } from "../components/home/LeaguesSection";
import { HomeLeadersSection } from "../components/home/HomeLeadersSection";
import { PlayerLookupSection } from "../components/home/PlayerLookupSection";
import { Footer } from "../components/Footer";
import { fetchSeasonStats } from "../lib/seasonData";
import { fetchLeagueSummaries, rankLeaguesByRecentPlay } from "../lib/leagueSummary";
import { fetchLiveGames } from "../lib/liveGames";

export const dynamic = "force-dynamic";

/**
 * Landing page: league directory, live games and season leaders are all real
 * data. Leaders show the three leagues that played most recently, newest
 * first, with one leader per category; any other leagues are a click away.
 * The "For league organizers" marketing section from the mockup is
 * deliberately left out per the user's own call to scrap it for now.
 */
export default async function HomePage() {
  const [leagues, liveGames] = await Promise.all([fetchLeagueSummaries(), fetchLiveGames()]);
  const ranked = await rankLeaguesByRecentPlay(leagues);
  const featuredLeagues = ranked.slice(0, 3);
  const leaderBlocks = await Promise.all(
    featuredLeagues.map(async (league) => ({ league, stats: league.seasonId ? await fetchSeasonStats(league.seasonId) : null })),
  );
  const liveCount = liveGames.filter((g) => g.status === "live").length;

  return (
    <>
      <HeroSection liveCount={liveCount} />
      <LiveNowSection games={liveGames} />
      <LeaguesSection leagues={leagues} />
      <HomeLeadersSection blocks={leaderBlocks} hasMoreLeagues={ranked.length > featuredLeagues.length} />
      <PlayerLookupSection />
      <Footer />
    </>
  );
}
