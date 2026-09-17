/**
 * Player of the game — spec section 9.1. Default formula is FIBA Efficiency:
 *   EFF = (PTS + REB + AST + STL + BLK) − (FGA − FGM) − (FTA − FTM) − TO
 */

export interface EfficiencyInputs {
  points: number;
  reboundsTotal: number;
  assists: number;
  steals: number;
  blocks: number;
  fieldGoalAttempted: number;
  fieldGoalMade: number;
  ftAttempted: number;
  ftMade: number;
  turnovers: number;
}

export function computeEfficiency(line: EfficiencyInputs): number {
  return (
    line.points +
    line.reboundsTotal +
    line.assists +
    line.steals +
    line.blocks -
    (line.fieldGoalAttempted - line.fieldGoalMade) -
    (line.ftAttempted - line.ftMade) -
    line.turnovers
  );
}

export interface PlayerOfGameCandidate {
  playerId: string;
  teamId: string;
  efficiency: number;
  points: number;
  reboundsTotal: number;
  assists: number;
}

export interface PlayerOfGameResult {
  playerId: string;
  isOverride: boolean;
}

/** Ties break by points, then rebounds, then assists (spec 9.1). */
function compareCandidates(a: PlayerOfGameCandidate, b: PlayerOfGameCandidate): number {
  if (b.efficiency !== a.efficiency) return b.efficiency - a.efficiency;
  if (b.points !== a.points) return b.points - a.points;
  if (b.reboundsTotal !== a.reboundsTotal) return b.reboundsTotal - a.reboundsTotal;
  return b.assists - a.assists;
}

export function selectPlayerOfGame(
  candidates: PlayerOfGameCandidate[],
  options: {
    winningTeamId: string | null;
    restrictToWinningTeam: boolean;
    organizerOverridePlayerId?: string | null;
  },
): PlayerOfGameResult | null {
  if (options.organizerOverridePlayerId) {
    return { playerId: options.organizerOverridePlayerId, isOverride: true };
  }
  const pool =
    options.restrictToWinningTeam && options.winningTeamId
      ? candidates.filter((c) => c.teamId === options.winningTeamId)
      : candidates;
  if (pool.length === 0) return null;
  const sorted = [...pool].sort(compareCandidates);
  return { playerId: sorted[0].playerId, isOverride: false };
}
