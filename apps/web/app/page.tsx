import { HeroSection } from "../components/home/HeroSection";
import { LiveNowSection } from "../components/home/LiveNowSection";
import { LeaguesSection } from "../components/home/LeaguesSection";
import { SeasonLeadersSection } from "../components/home/SeasonLeadersSection";
import { PlayerLookupSection } from "../components/home/PlayerLookupSection";
import { Footer } from "../components/Footer";
import { fetchSeasonStats } from "../lib/seasonData";
import { fetchLeagueSummaries } from "../lib/leagueSummary";
import { fetchLiveGames } from "../lib/liveGames";
import { SEED_SEASON_ID } from "@courtstats/shared";

export const dynamic = "force-dynamic";

/**
 * Landing page: season leaders, league directory and live games are all real
 * data. The "For league organizers" marketing section from the mockup is
 * deliberately left out per the user's own call to scrap it for now.
 */
export default async function HomePage() {
  const [{ players, playersById, settings }, leagues, liveGames] = await Promise.all([
    fetchSeasonStats(SEED_SEASON_ID),
    fetchLeagueSummaries(),
    fetchLiveGames(),
  ]);
  const liveCount = liveGames.filter((g) => g.status === "live").length;

  return (
    <>
      <HeroSection liveCount={liveCount} />
      <LiveNowSection games={liveGames} />
      <LeaguesSection leagues={leagues} />
      <SeasonLeadersSection players={players} playersById={playersById} settings={settings} />
      <PlayerLookupSection />
      <Footer />
    </>
  );
}
