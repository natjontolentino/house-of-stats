import Link from "next/link";
import type { Player, PlayerSeasonLine } from "@courtstats/shared";
import { displayPlayerName, rankTopPlayers } from "@courtstats/shared";
import type { LeagueSummary } from "../../lib/leagueSummary";
import type { SeasonStatsResult } from "../../lib/seasonData";
import { PlayerAvatar } from "../PlayerAvatar";

export interface LeagueLeadersBlock {
  league: LeagueSummary;
  /** Null when the league has no season yet. */
  stats: SeasonStatsResult | null;
}

const CATEGORIES: Array<{ label: string; metric: (p: PlayerSeasonLine) => number }> = [
  { label: "Points", metric: (p) => p.pointsPerGame },
  { label: "Rebounds", metric: (p) => p.reboundsPerGame },
  { label: "Assists", metric: (p) => p.assistsPerGame },
  { label: "Steals", metric: (p) => p.stealsPerGame },
  { label: "Blocks", metric: (p) => p.blocksPerGame },
];

/** One decimal, but "24" rather than "24.0" for a whole-number average. */
function formatAverage(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** The single leader in a category. Nobody with a zero average leads, and a tie goes to the better all-round player, then the lower id so it never flickers. */
function leaderOf(players: PlayerSeasonLine[], metric: (p: PlayerSeasonLine) => number): PlayerSeasonLine | null {
  const ranked = players
    .filter((p) => metric(p) > 0)
    .sort((a, b) => metric(b) - metric(a) || b.efficiencyPerGame - a.efficiencyPerGame || (a.playerId < b.playerId ? -1 : 1));
  return ranked[0] ?? null;
}

function LeaderCell({
  label,
  leader,
  metric,
  playersById,
  settings,
}: {
  label: string;
  leader: PlayerSeasonLine | null;
  metric: (p: PlayerSeasonLine) => number;
  playersById: Record<string, Player>;
  settings: SeasonStatsResult["settings"];
}) {
  const player = leader ? playersById[leader.playerId] : null;
  return (
    <div className="home-leader">
      <div className="home-leader__label">{label}</div>
      {leader && player ? (
        <div className="home-leader__row">
          <Link href={`/players/${leader.playerId}`} className="home-leader__who">
            <PlayerAvatar name={player.full_name} photoUrl={player.photo_url} size={30} />
            <span className="home-leader__name">{displayPlayerName(player, settings)}</span>
          </Link>
          <span className="home-leader__value">{formatAverage(metric(leader))}</span>
        </div>
      ) : (
        <div className="home-leader__empty">—</div>
      )}
    </div>
  );
}

/** A league's ten best players by EFF per game, in two compact columns under its category leaders. */
function TopTen({ stats, leagueSlug }: { stats: SeasonStatsResult; leagueSlug: string }) {
  const gamesByTeam = Object.fromEntries(stats.teamStats.map((t) => [t.teamId, t.gamesPlayed]));
  const ranked = rankTopPlayers(stats.players, gamesByTeam, 10);
  if (ranked.length === 0) return null;

  return (
    <div className="home-top">
      <div className="home-top__head">
        <span className="home-top__label">Top 10 players</span>
        <span className="home-top__note">ranked by EFF per game</span>
        <Link href={`/leagues/${leagueSlug}#top-players`} className="home-top__more">
          Full list →
        </Link>
      </div>
      <ol className="home-top__list">
        {ranked.map(({ rank, line }) => {
          const player = stats.playersById[line.playerId];
          return (
            <li className="home-top__item" key={line.playerId}>
              <span className="home-top__rank">{rank}</span>
              <Link href={`/players/${line.playerId}`} className="home-top__who">
                <PlayerAvatar name={player?.full_name ?? "?"} photoUrl={player?.photo_url} size={24} />
                <span className="home-top__name">{player ? displayPlayerName(player, stats.settings) : "?"}</span>
              </Link>
              <span className="home-top__team">{stats.teamsById[line.teamId]?.short_name ?? ""}</span>
              <span className="home-top__eff">{line.efficiencyPerGame.toFixed(1)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Season leaders on the home page: up to three leagues, the one that played
 * most recently first, each with a single leader per category (per-game
 * averages). Any further leagues are one click away.
 */
export function HomeLeadersSection({ blocks, hasMoreLeagues }: { blocks: LeagueLeadersBlock[]; hasMoreLeagues: boolean }) {
  if (blocks.length === 0) return null;

  return (
    <section id="leaders" className="section-band leaders-band">
      <div className="wide-page">
        <div className="section-band__head">
          <h2 className="section-band__title">Season leaders</h2>
          <span className="home-leaders__note">Per-game averages</span>
        </div>

        <div className="home-leaders">
          {blocks.map(({ league, stats }) => (
            <div className="home-leaders__league" key={league.id}>
              <div className="home-leaders__head">
                <Link href={`/leagues/${league.slug}`} className="home-leaders__name">
                  {league.name}
                </Link>
                <Link href={`/leagues/${league.slug}/stats`} className="home-leaders__more">
                  (click here for complete league leaders)
                </Link>
              </div>

              {stats && stats.players.length > 0 ? (
                <>
                <div className="home-leaders__grid">
                  {CATEGORIES.map(({ label, metric }) => (
                    <LeaderCell
                      key={label}
                      label={label}
                      leader={leaderOf(stats.players, metric)}
                      metric={metric}
                      playersById={stats.playersById}
                      settings={stats.settings}
                    />
                  ))}
                </div>
                <TopTen stats={stats} leagueSlug={league.slug} />
                </>
              ) : (
                <p className="home-leaders__none">No finalized games yet — leaders will appear once games have been played.</p>
              )}
            </div>
          ))}
        </div>

        {hasMoreLeagues && (
          <Link href="/#leagues" className="button-secondary home-leaders__all">
            See other leagues →
          </Link>
        )}
      </div>
    </section>
  );
}
