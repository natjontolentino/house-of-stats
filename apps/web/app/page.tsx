import { HeroSection } from "../components/home/HeroSection";
import { LiveNowSection } from "../components/home/LiveNowSection";
import { LeaguesSection } from "../components/home/LeaguesSection";
import { SeasonLeadersSection } from "../components/home/SeasonLeadersSection";
import { PlayerLookupSection } from "../components/home/PlayerLookupSection";
import { Footer } from "../components/Footer";
import { fetchSeasonStats } from "../lib/seasonData";
import { fetchLeagueSummaries, fetchFeaturedSeasonId } from "../lib/leagueSummary";
import { fetchLiveGames } from "../lib/liveGames";

export const dynamic = "force-dynamic";

/**
 * Landing page: league directory, live games and season leaders are all real
 * data. Leaders are shown for the league whose games most recently started or
 * finished (each league's own page has its leaders too). The "For league
 * organizers" marketing section from the mockup is deliberately left out per
 * the user's own call to scrap it for now.
 */
export default async function HomePage() {
  const [leagues, liveGames] = await Promise.all([fetchLeagueSummaries(), fetchLiveGames()]);
  const featuredSeasonId = await fetchFeaturedSeasonId(leagues);
  const featured = featuredSeasonId ? await fetchSeasonStats(featuredSeasonId) : null;
  const featuredLeague = leagues.find((l) => l.seasonId === featuredSeasonId);
  const liveCount = liveGames.filter((g) => g.status === "live").length;

  return (
    <>
      <HeroSection liveCount={liveCount} />
      <LiveNowSection games={liveGames} />
      <LeaguesSection leagues={leagues} />
      {featured && (
        <SeasonLeadersSection
          players={featured.players}
          playersById={featured.playersById}
          settings={featured.settings}
          leagueName={leagues.length > 1 ? featuredLeague?.name : undefined}
        />
      )}
      <PlayerLookupSection />
      <Footer />
    </>
  );
}
