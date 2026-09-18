interface LeagueCard {
  initials: string;
  status: string;
}

/** Placeholder leagues (landing page redesign, placeholder-first pass) — real multi-league directory is Phase 2 work. */
const PLACEHOLDER_LEAGUES: LeagueCard[] = [
  { initials: "SS", status: "Season 4 · 12 teams · In season" },
  { initials: "MC", status: "Season 2 · 8 teams · Playoffs" },
  { initials: "BY", status: "Season 1 · 10 teams · In season" },
  { initials: "RV", status: "Season 3 · 14 teams · Finished" },
  { initials: "HT", status: "Season 2 · 6 teams · Finished" },
];

export function LeaguesSection() {
  return (
    <section id="leagues" className="section-band">
      <div className="wide-page">
        <div className="section-band__head">
          <h2 className="section-band__title">Leagues</h2>
          <a href="#" className="section-band__link">
            See all leagues →
          </a>
        </div>

        <div className="league-grid">
          {PLACEHOLDER_LEAGUES.map((l) => (
            <div className="league-card" key={l.initials}>
              <div className="league-card__badge">{l.initials}</div>
              <div>
                <p className="league-card__name">[League name]</p>
                <p className="league-card__meta">{l.status}</p>
              </div>
            </div>
          ))}

          <a href="#" className="league-card league-card--add" style={{ textDecoration: "none" }}>
            <div className="league-card__plus">+</div>
            <div>
              <p className="league-card__name" style={{ color: "var(--accent-dark)" }}>
                Add your league
              </p>
              <p className="league-card__meta">One season, one price</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
