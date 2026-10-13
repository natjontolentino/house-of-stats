import Link from "next/link";
import type { FeedTeam, Spotlight } from "../../lib/homeFeed";
import { PlayerAvatar } from "../PlayerAvatar";
import { AutoRefresh } from "./AutoRefresh";

/** A team's logo, or its short name in a circle when it hasn't uploaded one, so the card never looks half empty. */
export function TeamBadge({ team, size }: { team: FeedTeam; size: number }) {
  if (team.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.logoUrl} alt="" width={size} height={size} className="team-badge team-badge--logo" style={{ width: size, height: size }} />;
  }
  return (
    <span className="team-badge team-badge--text" style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }} aria-hidden="true">
      {team.shortName}
    </span>
  );
}

/** A score that counts up from zero when the page loads. The real number stays in the page for screen readers and no-CSS-animation browsers. */
function CountUp({ value }: { value: number }) {
  return (
    <span className="count-up" style={{ ["--to" as string]: value }}>
      <span className="sr-only">{value}</span>
    </span>
  );
}

function TeamColumn({ team, dim }: { team: FeedTeam; dim: boolean }) {
  return (
    <div className={`spotlight__team${dim ? " spotlight__team--dim" : ""}`}>
      <TeamBadge team={team} size={64} />
      <div className="spotlight__team-name">{team.name}</div>
      <div className="spotlight__score">
        <CountUp value={team.score} />
      </div>
    </div>
  );
}

/** The hero's feature card: the live game, or the most recent final when nothing is on. */
export function SpotlightCard({ game }: { game: Spotlight }) {
  const live = game.status === "live";
  const final = !live;
  const awayWon = final && game.away.score > game.home.score;
  const homeWon = final && game.home.score > game.away.score;

  return (
    <article className="spotlight" aria-label={live ? "Live game" : "Latest result"}>
      {live && <AutoRefresh intervalMs={20_000} />}

      <div className="spotlight__top">
        <span className={`spotlight__status spotlight__status--${game.status}`}>
          <span className="spotlight__dot" />
          {live ? `Live · ${game.periodLabel}` : "Final"}
        </span>
        <span className="spotlight__league">{game.league.name}</span>
      </div>

      <div className="spotlight__board">
        <TeamColumn team={game.away} dim={homeWon} />
        <span className="spotlight__vs" aria-hidden="true">
          –
        </span>
        <TeamColumn team={game.home} dim={awayWon} />
      </div>

      {game.performer && (
        <Link href={`/players/${game.performer.playerId}`} className="spotlight__performer">
          <PlayerAvatar name={game.performer.fullName} photoUrl={game.performer.photoUrl} size={46} ring="var(--accent)" />
          <span className="spotlight__performer-text">
            <span className="spotlight__performer-label">{game.performer.label}</span>
            <span className="spotlight__performer-name">
              {game.performer.name} <span className="spotlight__performer-team">· {game.performer.teamName}</span>
            </span>
            <span className="spotlight__performer-line">{game.performer.line}</span>
          </span>
        </Link>
      )}

      <div className="spotlight__actions">
        <Link href={`/games/${game.gameId}`} className="spotlight__button spotlight__button--primary">
          Full box score
        </Link>
        <Link href={`/games/${game.gameId}/live`} className="spotlight__button">
          {live ? "Live scoreboard" : "Scoreboard view"}
        </Link>
      </div>
    </article>
  );
}
