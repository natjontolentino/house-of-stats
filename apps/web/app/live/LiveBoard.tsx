import Link from "next/link";
import type { FeedGame } from "../../lib/feedBuilder";
import type { LiveFeedGame } from "../../lib/liveFeed";
import { Logo } from "../../components/Logo";
import { AutoRefresh } from "../../components/home/AutoRefresh";
import { PlayerAvatar } from "../../components/PlayerAvatar";
import "../games/[gameId]/live/live.css";
import "./board.css";

export const BOARD_REFRESH_MS = 10_000;

const timeFormat = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila" });

function TeamMark({ logoUrl, shortName, size }: { logoUrl: string | null; shortName: string; size: number }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" width={size} height={size} className="board-mark board-mark--logo" style={{ width: size, height: size }} />;
  }
  return (
    <span className="board-mark board-mark--text" style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }} aria-hidden="true">
      {shortName}
    </span>
  );
}

function Fouls({ count, limit, penalty }: { count: number; limit: number; penalty: boolean }) {
  return (
    <span className="board-fouls" title={`${count} team fouls${penalty ? " (penalty)" : ""}`}>
      {Array.from({ length: limit }, (_, i) => (
        <span key={i} className={`board-foul${i < count ? (penalty ? " board-foul--penalty" : " board-foul--on") : ""}`} />
      ))}
    </span>
  );
}

function BoardTile({ game }: { game: LiveFeedGame }) {
  const leading = game.away.score === game.home.score ? null : game.away.score > game.home.score ? "away" : "home";
  return (
    <article className="board-tile">
      <header className="board-tile__top">
        <div className="board-tile__where">
          <span className="board-tile__court">{game.courtLabel || game.league.name}</span>
          {game.courtLabel && <span className="board-tile__league">{game.league.name}</span>}
        </div>
        <div className={`board-tile__status${game.delayed ? " board-tile__status--delayed" : ""}`}>
          <span className="board-tile__dot" />
          {game.delayed ? "Delayed" : "Live"}
        </div>
      </header>

      <div className="board-tile__clock">
        <span className="board-tile__period">{game.periodLabel}</span>
        {game.clock && <span className="board-tile__time">{game.clock}</span>}
      </div>

      {(["away", "home"] as const).map((side) => {
        const team = game[side];
        const fouls = side === "away" ? game.awayFouls : game.homeFouls;
        const penalty = side === "away" ? game.awayPenalty : game.homePenalty;
        return (
          <div className={`board-team board-team--${side}${leading && leading !== side ? " board-team--behind" : ""}`} key={side}>
            <TeamMark logoUrl={team.logoUrl} shortName={team.shortName} size={52} />
            <div className="board-team__info">
              <span className="board-team__name">{team.name}</span>
              <span className="board-team__fouls">
                <Fouls count={fouls} limit={game.foulLimit} penalty={penalty} />
                {penalty && <span className="board-team__penalty">Penalty</span>}
              </span>
            </div>
            <span className="board-team__score">{team.score}</span>
          </div>
        );
      })}

      {game.performer && (
        <div className="board-tile__performer">
          <PlayerAvatar name={game.performer.fullName} photoUrl={game.performer.photoUrl} size={34} ring="#f5a623" />
          <span>
            <strong>{game.performer.name}</strong>
            <span className="board-tile__line">{game.performer.line}</span>
          </span>
        </div>
      )}

      <Link href={`/games/${game.gameId}/live`} className="board-tile__open">
        Open full scoreboard →
      </Link>
    </article>
  );
}

/** Every game being played right now on one screen: made to be left up on a TV at the venue, refreshing on its own. */
export function LiveBoard({ games, recent, generatedAt }: { games: LiveFeedGame[]; recent: FeedGame[]; generatedAt: string }) {
  const count = games.length;

  return (
    <div className="live-root">
      <AutoRefresh intervalMs={BOARD_REFRESH_MS} />

      <header className="live-top">
        <Link href="/" className="live-brand">
          <Logo size={22} />
          House of Stats
        </Link>
        <div className="live-league">All live games</div>
        <div className={`live-badge live-badge--${count > 0 ? "live" : "upcoming"}`} aria-live="polite">
          <span className="live-badge__dot" />
          {count > 0 ? `${count} live` : "No live games"}
        </div>
      </header>

      {count > 0 ? (
        <main className="board-grid" data-count={Math.min(count, 6)}>
          {games.map((g) => (
            <BoardTile key={g.gameId} game={g} />
          ))}
        </main>
      ) : (
        <main className="live-state">
          <div className="live-state__title">No games are live right now</div>
          <p className="live-state__sub">This board fills in on its own as soon as a game tips off — you can leave it open.</p>
          {recent.length > 0 && (
            <ul className="board-recent">
              {recent.slice(0, 5).map((g) => (
                <li key={g.gameId}>
                  <Link href={`/games/${g.gameId}`}>
                    <span className="board-recent__teams">
                      {g.away.name} <strong>{g.away.score}</strong> – <strong>{g.home.score}</strong> {g.home.name}
                    </span>
                    <span className="board-recent__league">{g.league.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      )}

      <footer className="live-status">
        <span className="live-status__left">
          <span className="live-status__dot" />
          Updated {timeFormat.format(new Date(generatedAt))} · refreshes every {BOARD_REFRESH_MS / 1000}s
        </span>
        <Link href="/schedule" className="live-status__link">
          Schedule →
        </Link>
      </footer>
    </div>
  );
}
