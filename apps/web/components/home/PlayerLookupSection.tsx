/** Player search: a plain GET form to /players, so it works without any client-side JavaScript. */
export function PlayerLookupSection() {
  return (
    <section className="player-lookup">
      <div className="wide-page player-lookup__inner">
        <div>
          <h2 className="player-lookup__title">Look up any player</h2>
          <p className="player-lookup__subtitle">
            Every game they have played, season averages, and a shot chart showing where they score from.
          </p>
        </div>
        <form className="player-lookup__form" method="get" action="/players">
          <input className="hero__input" type="search" name="q" placeholder="Player name" autoComplete="off" required minLength={2} />
          <button className="button-secondary-light" type="submit">
            Find
          </button>
        </form>
      </div>
    </section>
  );
}
