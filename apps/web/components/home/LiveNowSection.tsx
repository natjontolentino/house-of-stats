interface LiveGameCard {
  status: "live" | "delayed";
  period: string;
  updatedAgo: string;
  awayTeam: string;
  awayScore: number;
  homeTeam: string;
  homeScore: number;
  league: string;
  court: string;
}

/** Placeholder games (landing page redesign, placeholder-first pass) — real data lands once multi-league support exists. */
const PLACEHOLDER_GAMES: LiveGameCard[] = [
  {
    status: "live",
    period: "Q3",
    updatedAgo: "9s ago",
    awayTeam: "Ridgeline Hawks",
    awayScore: 48,
    homeTeam: "Harbor City Comets",
    homeScore: 52,
    league: "[League name]",
    court: "Court 1",
  },
  {
    status: "live",
    period: "Q2",
    updatedAgo: "24s ago",
    awayTeam: "Eastgate Bolts",
    awayScore: 31,
    homeTeam: "Northside Eagles",
    homeScore: 27,
    league: "[League name]",
    court: "Court 2",
  },
  {
    status: "delayed",
    period: "Q1",
    updatedAgo: "4 min ago",
    awayTeam: "Westpoint Flyers",
    awayScore: 12,
    homeTeam: "Old Mill Bears",
    homeScore: 15,
    league: "[League name]",
    court: "Court 3",
  },
];

export function LiveNowSection() {
  return (
    <section id="live" className="section-band">
      <div className="wide-page">
        <div className="section-band__head">
          <h2 className="section-band__title">Live now</h2>
          <a href="#" className="section-band__link">
            All games and schedule →
          </a>
        </div>

        <div className="live-grid">
          {PLACEHOLDER_GAMES.map((g, i) => (
            <div className="live-card" key={i}>
              <div className="live-card__status-row">
                <span className={`live-card__status live-card__status--${g.status}`}>
                  {g.status === "live" ? "Live" : "Delayed"} · {g.period}
                </span>
                <span className="live-card__updated">Updated {g.updatedAgo}</span>
              </div>
              <div className="live-card__team-row">
                <span>{g.awayTeam}</span>
                <span className="live-card__score">{g.awayScore}</span>
              </div>
              <div className="live-card__team-row">
                <span>{g.homeTeam}</span>
                <span className="live-card__score">{g.homeScore}</span>
              </div>
              <div className="live-card__foot">
                <span>
                  {g.league} · {g.court}
                </span>
                <a href="#">Box score</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const PLACEHOLDER_LIVE_COUNT = PLACEHOLDER_GAMES.filter((g) => g.status === "live").length;
