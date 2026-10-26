/**
 * The league's "Top players" ranking: the best players by efficiency (EFF) per
 * game. Built on the season lines computePlayerSeasonStats already produced,
 * so EFF itself is only ever calculated in one place (efficiency.ts).
 */
import type { PlayerSeasonLine } from "./seasonStats";

/** A player must have played at least this share of their team's games to be ranked. */
export const TOP_PLAYERS_MIN_GAMES_SHARE = 0.5;

/** Games a player needs for their team's `teamGames` games so far: half of them, rounded up, and never fewer than one. */
export function minimumGamesForRanking(teamGames: number): number {
  return Math.max(1, Math.ceil(teamGames * TOP_PLAYERS_MIN_GAMES_SHARE));
}

export interface RankedPlayer {
  rank: number;
  line: PlayerSeasonLine;
}

/**
 * Top players by EFF per game. Ties go to the higher scorer, then rebounder,
 * then passer, then player id so the order never flickers between loads.
 * Players who haven't played enough of their team's games aren't ranked.
 */
export function rankTopPlayers(
  players: PlayerSeasonLine[],
  gamesByTeam: Record<string, number>,
  limit = 10,
): RankedPlayer[] {
  return players
    .filter((p) => p.gamesPlayed >= minimumGamesForRanking(gamesByTeam[p.teamId] ?? p.gamesPlayed))
    .sort(
      (a, b) =>
        b.efficiencyPerGame - a.efficiencyPerGame ||
        b.pointsPerGame - a.pointsPerGame ||
        b.reboundsPerGame - a.reboundsPerGame ||
        b.assistsPerGame - a.assistsPerGame ||
        (a.playerId < b.playerId ? -1 : 1),
    )
    .slice(0, limit)
    .map((line, i) => ({ rank: i + 1, line }));
}
