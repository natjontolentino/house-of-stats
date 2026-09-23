import { HeroSection } from "../components/home/HeroSection";
import { LiveNowSection, PLACEHOLDER_LIVE_COUNT } from "../components/home/LiveNowSection";
import { LeaguesSection } from "../components/home/LeaguesSection";
import { SeasonLeadersSection } from "../components/home/SeasonLeadersSection";
import { PlayerLookupSection } from "../components/home/PlayerLookupSection";
import { Footer } from "../components/Footer";
import { fetchSeasonStats } from "../lib/seasonData";
import { fetchLeagueSummaries } from "../lib/leagueSummary";
import { SEED_SEASON_ID } from "@courtstats/shared";

export const dynamic = "force-dynamic";

/**
 * Landing page redesign (placeholder-first pass, per user mockup), now with
 * season leaders and the league directory wired to real data (see
 * apps/web/lib/seasonData.ts and apps/web/lib/leagueSummary.ts). "Live now"
 * is still placeholder -- multi-league *live game* support is Phase 2 work.
 * The "For league organizers" marketing/lead-gen section from the mockup is
 * deliberately left out per the user's own call to scrap it for now.
 */
export default async function HomePage() {
  const [{ players, playersById, settings }, leagues] = await Promise.all([
    fetchSeasonStats(SEED_SEASON_ID),
    fetchLeagueSummaries(),
  ]);

  return (
    <>
      <HeroSection liveCount={PLACEHOLDER_LIVE_COUNT} />
      <LiveNowSection />
      <LeaguesSection leagues={leagues} />
      <SeasonLeadersSection players={players} playersById={playersById} settings={settings} />
      <PlayerLookupSection />
      <Footer />
    </>
  );
}
