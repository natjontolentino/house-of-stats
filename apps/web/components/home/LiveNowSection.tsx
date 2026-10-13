import Link from "next/link";
import type { LiveGameSummary } from "../../lib/liveGames";
import type { FeedGame } from "../../lib/homeFeed";
import { BasketballBackground } from "./BasketballBackground";
import { TeamBadge } from "./SpotlightCard";

function updatedAgo(date: Date | null): string {
  if (!date) return "no updates yet";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}

const dayFormat = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });

function ResultsStrip({ games }: { games: FeedGame[] }) {
  return (
    <div className="results-strip" role="list">
      {games.map((g) => {
        const awayWon = g.away.score > g.home.score;
        const homeWon = g.home.score > g.away.score;
        return (
          <Link href={`/games/${g.gameId}`} className="result-card" key={g.gameId} role="listitem">
            <div className="result-card__meta">
              <span className="result-card__league">{g.league.name}</span>
              <span>{dayFormat.format(new Date(g.playedAt))}</span>
            </div>
            <div className={`result-card__row${homeWon ? " result-card__row--lost" : ""}`}>
              <TeamBadge team={g.away} size={28} />
              <span className="result-card__name">{g.away.name}</span>
              <span className="result-card__score">{g.away.score}</span>
            </div>
            <div className={`result-card__row${awayWon ? " result-card__row--lost" : ""}`}>
              <TeamBadge team={g.home} size={28} />
              <span className="result-card__name">{g.home.name}</span>
              <span className="result-card__score">{g.home.score}</span>
            </div>
            <span className="result-card__final">Final</span>
          </Link>
        );
      })}
    </div>
  );
}

export function LiveNowSection({ games, recent }: { games: LiveGameSummary[]; recent: FeedGame[] }) {
  const anyLive = games.length > 0;

  return (
    <section id="live" className="section-band live-band">
      <BasketballBackground className="live-balls" />
      <div className="wide-page">
        <div className="section-band__head">
          <h2 className="section-band__title">{anyLive ? "Live now" : "Latest results"}</h2>
          <Link href="/schedule" className="section-band__link">
            All games and schedule →
          </Link>
        </div>

        {anyLive && (
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

        {recent.length > 0 && (
          <>
            {anyLive && <h3 className="results-title">Recent results</h3>}
            <ResultsStrip games={recent} />
          </>
        )}

        {!anyLive && recent.length === 0 && (
          <p style={{ color: "var(--muted)", margin: 0 }}>No games have been played yet. Check back when a game tips off.</p>
        )}
      </div>
    </section>
  );
}
