import { CourtBackground } from "./CourtBackground";
import { SpotlightCard } from "./SpotlightCard";
import type { Spotlight } from "../../lib/homeFeed";

/** Landing hero: the pitch and a player search on the left, the live (or latest) game as a scoreboard card on the right. */
export function HeroSection({ liveCount, spotlight }: { liveCount: number; spotlight: Spotlight | null }) {
  return (
    <section className="hero">
      <CourtBackground className="hero__court" />
      <div className="hero__glow" aria-hidden="true" />
      <div className={`wide-page hero__grid${spotlight ? "" : " hero__grid--single"}`}>
        <div className="hero__copy">
          <p className="hero__eyebrow">Live from the scorer&apos;s table</p>
          <h1 className="hero__title">Your league&apos;s stats, while the game is still on.</h1>
          <p className="hero__subtitle">
            Box scores, standings and player leaders for local basketball leagues — updated from the table as it
            happens. Free to view, no account needed.
          </p>
          <form className="hero__search" method="get" action="/players">
            <input className="hero__input" type="search" name="q" placeholder="Search for a player" autoComplete="off" required minLength={2} />
            <button className="button-primary" type="submit">
              Search
            </button>
            <a href="#live" className="hero__live-link">
              {liveCount} {liveCount === 1 ? "game" : "games"} live right now →
            </a>
          </form>
        </div>

        {spotlight && <SpotlightCard game={spotlight} />}
      </div>
    </section>
  );
}
