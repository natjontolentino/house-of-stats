import Link from "next/link";
import type { FeedGame } from "../../lib/feedBuilder";
import type { LiveFeedGame } from "../../lib/liveFeed";
import { BasketballBackground } from "./BasketballBackground";
import { TeamBadge } from "./SpotlightCard";
import { PlayerAvatar } from "../PlayerAvatar";

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

/** One live game, in the same dark scoreboard style as the hero card. */
export function LiveTile({ game }: { game: LiveFeedGame }) {
  const leading = game.away.score === game.home.score ? null : game.away.score > game.home.score ? "away" : "home";
  return (
    <article className="live-tile">
      <div className="live-tile__top">
        <span className={`live-tile__status${game.delayed ? " live-tile__status--delayed" : ""}`}>
          <span className="live-tile__dot" />
          {[game.delayed ? "Delayed" : "Live", game.periodLabel, game.clock].filter(Boolean).join(" · ")}
        </span>
        <span className="live-tile__where">{[game.courtLabel, game.league.name].filter(Boolean).join(" · ")}</span>
      </div>

      {(["away", "home"] as const).map((side) => {
        const team = game[side];
        return (
          <div className={`live-tile__row${leading && leading !== side ? " live-tile__row--behind" : ""}`} key={side}>
            <TeamBadge team={team} size={34} />
            <span className="live-tile__name">{team.name}</span>
            <span className="live-tile__score">{team.score}</span>
          </div>
        );
      })}

      {game.performer && (
        <Link href={`/players/${game.performer.playerId}`} className="live-tile__performer">
          <PlayerAvatar name={game.performer.fullName} photoUrl={game.performer.photoUrl} size={30} />
          <span>
            <strong>{game.performer.name}</strong> <span className="live-tile__line">{game.performer.line}</span>
          </span>
        </Link>
      )}

      <div className="live-tile__foot">
        <Link href={`/games/${game.gameId}`}>Box score</Link>
        <Link href={`/games/${game.gameId}/live`} className="live-tile__foot-primary">
          Live scoreboard →
        </Link>
      </div>
    </article>
  );
}

export function LiveNowSection({ games, recent }: { games: LiveFeedGame[]; recent: FeedGame[] }) {
  const anyLive = games.length > 0;

  return (
    <section id="live" className="section-band live-band">
      <BasketballBackground className="live-balls" />
      <div className="wide-page">
        <div className="section-band__head">
          <h2 className="section-band__title">{anyLive ? "Live now" : "Latest results"}</h2>
          {games.length > 1 ? (
            <Link href="/live" className="section-band__link">
              Watch all {games.length} games →
            </Link>
          ) : (
            <Link href="/schedule" className="section-band__link">
              All games and schedule →
            </Link>
          )}
        </div>

        {anyLive && (
          <div className="live-grid">
            {games.map((g) => (
              <LiveTile key={g.gameId} game={g} />
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
