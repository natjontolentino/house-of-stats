import { CourtBackground } from "./CourtBackground";
import { SpotlightCard } from "./SpotlightCard";
import { LiveSpotlight } from "./LiveSpotlight";
import type { FeedGame } from "../../lib/feedBuilder";
import type { LiveFeedGame } from "../../lib/liveFeed";

/** Landing hero: the pitch and a player search on the left; on the right the live games (rotating if several) or, when none, the latest result. */
export function HeroSection({ live, latest }: { live: LiveFeedGame[]; latest: FeedGame | null }) {
  const liveNow = live.filter((g) => !g.delayed).length;
  const hasCard = live.length > 0 || latest !== null;

  return (
    <section className="hero">
      <CourtBackground className="hero__court" />
      <div className="hero__glow" aria-hidden="true" />
      <div className={`wide-page hero__grid${hasCard ? "" : " hero__grid--single"}`}>
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
            <a href={live.length > 1 ? "/live" : "#live"} className="hero__live-link">
              {liveNow} {liveNow === 1 ? "game" : "games"} live right now →
            </a>
          </form>
        </div>

        {live.length > 0 ? <LiveSpotlight games={live} /> : latest ? <SpotlightCard game={latest} /> : null}
      </div>
    </section>
  );
}
