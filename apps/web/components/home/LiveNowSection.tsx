import Link from "next/link";
import type { LiveGameSummary } from "../../lib/liveGames";

function updatedAgo(date: Date | null): string {
  if (!date) return "no updates yet";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}

export function LiveNowSection({ games }: { games: LiveGameSummary[] }) {
  return (
    <section id="live" className="section-band">
      <div className="wide-page">
        <div className="section-band__head">
          <h2 className="section-band__title">Live now</h2>
          <a href="#" className="section-band__link">
            All games and schedule →
          </a>
        </div>

        {games.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>No games are being tracked right now. Check back when a game tips off.</p>
        ) : (
          <div className="live-grid">
            {games.map((g) => (
              <div className="live-card" key={g.gameId}>
                <div className="live-card__status-row">
                  <span className={`live-card__status live-card__status--${g.status}`}>
                    {g.status === "live" ? "Live" : "Delayed"} · {g.periodLabel}
                  </span>
                  <span className="live-card__updated">Updated {updatedAgo(g.updatedAt)}</span>
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
                  <span>{[g.leagueName, g.courtLabel].filter(Boolean).join(" · ")}</span>
                  <Link href={`/games/${g.gameId}`}>Box score</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
