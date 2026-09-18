import { HeroSection } from "../components/home/HeroSection";
import { LiveNowSection, PLACEHOLDER_LIVE_COUNT } from "../components/home/LiveNowSection";
import { LeaguesSection } from "../components/home/LeaguesSection";
import { SeasonLeadersSection } from "../components/home/SeasonLeadersSection";
import { PlayerLookupSection } from "../components/home/PlayerLookupSection";
import { Footer } from "../components/Footer";

/**
 * Landing page redesign (placeholder-first pass, per user mockup): every
 * section below except the hero shell renders placeholder data for now.
 * Real data lands section by section as the underlying feature exists --
 * "Live now" can go real first (the single-game live/realtime mechanism
 * already works), "Leagues"/"Season leaders"/player lookup need actual
 * multi-league support and leaderboard computation, which are Phase 2 work.
 * The "For league organizers" marketing/lead-gen section from the mockup is
 * deliberately left out of this pass per the user's own call to scrap it
 * for now.
 */
export default function HomePage() {
  return (
    <>
      <HeroSection liveCount={PLACEHOLDER_LIVE_COUNT} />
      <LiveNowSection />
      <LeaguesSection />
      <SeasonLeadersSection />
      <PlayerLookupSection />
      <Footer />
    </>
  );
}
