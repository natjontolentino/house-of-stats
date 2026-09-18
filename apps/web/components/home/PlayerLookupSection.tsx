/** Placeholder search UI for now — player pages are Phase 2 work (landing page redesign, placeholder-first pass). */
export function PlayerLookupSection() {
  return (
    <section className="player-lookup">
      <div className="wide-page player-lookup__inner">
        <div>
          <h2 className="player-lookup__title">Look up any player</h2>
          <p className="player-lookup__subtitle">
            Every game they have played, season averages, and career totals across seasons in their league.
          </p>
        </div>
        <div className="player-lookup__form">
          <input className="hero__input" placeholder="Player name" disabled />
          <button className="button-secondary-light" type="button" disabled>
            Find
          </button>
        </div>
      </div>
    </section>
  );
}
