/**
 * Season-level aggregation — spec 8.1 "Player page" (season averages and
 * totals) and 9.2 (leaderboards). Deliberately built on top of the existing
 * per-game computeBoxScore output rather than re-deriving anything from raw
 * events: each PlayerBoxLine passed in should already come from a real
 * computeLiveGameState/computeBoxScore call for one finalized game, so the
 * per-game math has exactly one implementation (spec principle "never
 * duplicate a stat formula") and this layer only sums and divides.
 */
import type { PlayerBoxLine } from "./boxScore";

export interface PlayerSeasonLine {
  playerId: string;
  teamId: string;
  gamesPlayed: number;

  points: number;
  pointsPerGame: number;
  reboundsTotal: number;
  reboundsPerGame: number;
  assists: number;
  assistsPerGame: number;
  steals: number;
  stealsPerGame: number;
  blocks: number;
  blocksPerGame: number;
  turnovers: number;
  turnoversPerGame: number;
  personalFouls: number;
  personalFoulsPerGame: number;

  fieldGoalMade: number;
  fieldGoalAttempted: number;
  fieldGoalPct: number | null;
  threePointMade: number;
  threePointAttempted: number;
  threePointPct: number | null;
  threePointMadePerGame: number;
  ftMade: number;
  ftAttempted: number;
  ftPct: number | null;

  efficiency: number;
  efficiencyPerGame: number;
  plusMinus: number;
  plusMinusPerGame: number;
  /** null once any counted game has clock mode off and never recorded minutes for this player. */
  minutesMs: number | null;
  minutesPerGameMs: number | null;
}

function pct(made: number, attempted: number): number | null {
  return attempted > 0 ? made / attempted : null;
}

function perGame(total: number, games: number): number {
  return games > 0 ? total / games : 0;
}

/**
 * A player "played" in a game if they have any recorded activity in it —
 * every rostered player gets an all-zero PlayerBoxLine from computeBoxScore
 * whether they appeared or not (spec 6.3's Team row exists precisely
 * because not-on-court players still need a row), so summing every game a
 * player was merely on the roster for would understate their per-game
 * averages. Minutes are the clearest signal when the league tracks a clock;
 * any non-zero counting stat is the fallback for clock_mode "off" leagues
 * (the spec's own default), where minutesMs is always null.
 */
function didPlayerAppear(line: PlayerBoxLine): boolean {
  if (line.minutesMs !== null) return line.minutesMs > 0;
  return (
    line.fieldGoalAttempted > 0 ||
    line.ftAttempted > 0 ||
    line.reboundsTotal > 0 ||
    line.assists > 0 ||
    line.steals > 0 ||
    line.blocks > 0 ||
    line.turnovers > 0 ||
    line.personalFouls > 0
  );
}

/**
 * `gameLines` is one PlayerBoxLine per finalized game the player's team
 * played, for that specific player (the same playerId/teamId throughout —
 * callers are expected to group by player before calling this).
 */
export function computePlayerSeasonStats(gameLines: PlayerBoxLine[]): PlayerSeasonLine | null {
  if (gameLines.length === 0) return null;
  const played = gameLines.filter(didPlayerAppear);
  const gamesPlayed = played.length;
  const { playerId, teamId } = gameLines[0];

  const sum = (fn: (l: PlayerBoxLine) => number) => played.reduce((s, l) => s + fn(l), 0);
  const minutesLines = played.filter((l) => l.minutesMs !== null);
  const totalMinutesMs = minutesLines.length > 0 ? minutesLines.reduce((s, l) => s + (l.minutesMs ?? 0), 0) : null;

  const points = sum((l) => l.points);
  const reboundsTotal = sum((l) => l.reboundsTotal);
  const assists = sum((l) => l.assists);
  const steals = sum((l) => l.steals);
  const blocks = sum((l) => l.blocks);
  const turnovers = sum((l) => l.turnovers);
  const personalFouls = sum((l) => l.personalFouls);
  const fieldGoalMade = sum((l) => l.fieldGoalMade);
  const fieldGoalAttempted = sum((l) => l.fieldGoalAttempted);
  const threePointMade = sum((l) => l.threePointMade);
  const threePointAttempted = sum((l) => l.threePointAttempted);
  const ftMade = sum((l) => l.ftMade);
  const ftAttempted = sum((l) => l.ftAttempted);
  const efficiency = sum((l) => l.efficiency);
  const plusMinus = sum((l) => l.plusMinus);

  return {
    playerId,
    teamId,
    gamesPlayed,
    points,
    pointsPerGame: perGame(points, gamesPlayed),
    reboundsTotal,
    reboundsPerGame: perGame(reboundsTotal, gamesPlayed),
    assists,
    assistsPerGame: perGame(assists, gamesPlayed),
    steals,
    stealsPerGame: perGame(steals, gamesPlayed),
    blocks,
    blocksPerGame: perGame(blocks, gamesPlayed),
    turnovers,
    turnoversPerGame: perGame(turnovers, gamesPlayed),
    personalFouls,
    personalFoulsPerGame: perGame(personalFouls, gamesPlayed),
    fieldGoalMade,
    fieldGoalAttempted,
    fieldGoalPct: pct(fieldGoalMade, fieldGoalAttempted),
    threePointMade,
    threePointAttempted,
    threePointPct: pct(threePointMade, threePointAttempted),
    threePointMadePerGame: perGame(threePointMade, gamesPlayed),
    ftMade,
    ftAttempted,
    ftPct: pct(ftMade, ftAttempted),
    efficiency,
    efficiencyPerGame: perGame(efficiency, gamesPlayed),
    plusMinus,
    plusMinusPerGame: perGame(plusMinus, gamesPlayed),
    minutesMs: totalMinutesMs,
    minutesPerGameMs: totalMinutesMs !== null ? perGame(totalMinutesMs, gamesPlayed) : null,
  };
}

/**
 * Spec 9.2: percentage leaderboards need a minimum-attempts threshold or a
 * one-for-one player leads the league. "scaled" (the spec's own default)
 * grows the floor with games played rather than using one fixed number, so
 * a 3-game season and a 20-game season both get a sane bar.
 */
export function meetsAttemptThreshold(
  attempted: number,
  gamesPlayed: number,
  minimumAttempts: "scaled" | number,
  attemptsPerGameIfScaled = 2,
): boolean {
  const threshold = minimumAttempts === "scaled" ? gamesPlayed * attemptsPerGameIfScaled : minimumAttempts;
  return attempted >= threshold;
}
