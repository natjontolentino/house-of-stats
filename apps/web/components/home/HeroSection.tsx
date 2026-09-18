/** Placeholder search UI for now — not wired to real search yet (landing page redesign, placeholder-first pass). */
export function HeroSection({ liveCount }: { liveCount: number }) {
  return (
    <section className="hero">
      <div className="wide-page">
        <p className="hero__eyebrow">Live from the scorer&apos;s table</p>
        <h1 className="hero__title">Your league&apos;s stats, while the game is still on.</h1>
        <p className="hero__subtitle">
          Box scores, standings and player leaders for local basketball leagues — updated from the table as it
          happens. Free to view, no account needed.
        </p>
        <div className="hero__search">
          <input className="hero__input" placeholder="Search a league, team or player" disabled />
          <button className="button-primary" type="button" disabled>
            Search
          </button>
          <a href="#live" className="hero__live-link">
            {liveCount} {liveCount === 1 ? "game" : "games"} live right now →
          </a>
        </div>
      </div>
    </section>
  );
}
