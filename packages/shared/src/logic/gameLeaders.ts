/**
 * Per-team game leaders for the shareable game graphic. Derived purely from
 * the box-score lines, so it never stores or re-derives a stat itself.
 */
import type { PlayerBoxLine } from "./boxScore";

export type LeaderCategory =
  | "points"
  | "rebounds"
  | "assists"
  | "steals"
  | "blocks"
  | "fieldGoalPct"
  | "threePointMade";

export const LEADER_CATEGORIES: LeaderCategory[] = [
  "points",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "fieldGoalPct",
  "threePointMade",
];

/** A 1-for-1 shooter shouldn't out-lead a 9-for-12 one, so FG% needs a minimum number of attempts. */
export const FG_PCT_LEADER_MIN_ATTEMPTS = 3;

export interface GameLeader {
  playerId: string;
  /** The ranked value: a count, or FG% as a 0-1 fraction. */
  value: number;
  /** Only set for fieldGoalPct, so the graphic can show "5/8". */
  made?: number;
  attempted?: number;
}

export type TeamLeaders = Record<LeaderCategory, GameLeader | null>;

type LeaderInput = Pick<
  PlayerBoxLine,
  | "playerId"
  | "teamId"
  | "points"
  | "reboundsTotal"
  | "assists"
  | "steals"
  | "blocks"
  | "fieldGoalMade"
  | "fieldGoalAttempted"
  | "threePointMade"
  | "efficiency"
>;

/** Highest first; ties go to the better overall game, then player id so the pick is stable. */
function byRank(a: { line: LeaderInput; value: number }, b: { line: LeaderInput; value: number }): number {
  if (b.value !== a.value) return b.value - a.value;
  if (b.line.efficiency !== a.line.efficiency) return b.line.efficiency - a.line.efficiency;
  return a.line.playerId < b.line.playerId ? -1 : 1;
}

function leaderByCount(lines: LeaderInput[], pick: (l: LeaderInput) => number): GameLeader | null {
  const ranked = lines
    .map((line) => ({ line, value: pick(line) }))
    .filter((r) => r.value > 0)
    .sort(byRank);
  return ranked.length > 0 ? { playerId: ranked[0].line.playerId, value: ranked[0].value } : null;
}

export function computeTeamLeaders(players: LeaderInput[], teamId: string): TeamLeaders {
  const lines = players.filter((p) => p.teamId === teamId);

  const fgCandidates = lines
    .filter((l) => l.fieldGoalAttempted >= FG_PCT_LEADER_MIN_ATTEMPTS && l.fieldGoalMade > 0)
    .map((line) => ({ line, value: line.fieldGoalMade / line.fieldGoalAttempted }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      if (b.line.fieldGoalMade !== a.line.fieldGoalMade) return b.line.fieldGoalMade - a.line.fieldGoalMade;
      return byRank(a, b);
    });
  const fgTop = fgCandidates[0];

  return {
    points: leaderByCount(lines, (l) => l.points),
    rebounds: leaderByCount(lines, (l) => l.reboundsTotal),
    assists: leaderByCount(lines, (l) => l.assists),
    steals: leaderByCount(lines, (l) => l.steals),
    blocks: leaderByCount(lines, (l) => l.blocks),
    fieldGoalPct: fgTop
      ? {
          playerId: fgTop.line.playerId,
          value: fgTop.value,
          made: fgTop.line.fieldGoalMade,
          attempted: fgTop.line.fieldGoalAttempted,
        }
      : null,
    threePointMade: leaderByCount(lines, (l) => l.threePointMade),
  };
}
