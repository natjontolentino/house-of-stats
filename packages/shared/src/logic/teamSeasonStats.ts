import { computeEfficiency } from "./efficiency";

/** One team's totals for one finished game (points against comes from the opponent's score). */
export interface TeamGameTotals {
  teamId: string;
  gameId: string;
  points: number;
  pointsAgainst: number;
  fieldGoalMade: number;
  fieldGoalAttempted: number;
  threePointMade: number;
  threePointAttempted: number;
  ftMade: number;
  ftAttempted: number;
  reboundsOffensive: number;
  reboundsDefensive: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  personalFouls: number;
}

export interface TeamSeasonLine {
  teamId: string;
  gamesPlayed: number;
  pointsPerGame: number;
  pointsAgainstPerGame: number;
  differentialPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  turnoversPerGame: number;
  personalFoulsPerGame: number;
  /** Percentages come from summed makes/attempts across games, never an average of per-game percentages. */
  fieldGoalPct: number | null;
  threePointPct: number | null;
  ftPct: number | null;
  efficiencyPerGame: number;
}

function pct(made: number, attempted: number): number | null {
  return attempted === 0 ? null : made / attempted;
}

/** Season averages for each team from its per-game totals. Pure aggregation -- every per-game number was already derived by the game-level logic. */
export function computeTeamSeasonStats(games: TeamGameTotals[]): TeamSeasonLine[] {
  const byTeam = new Map<string, TeamGameTotals[]>();
  for (const g of games) {
    if (!byTeam.has(g.teamId)) byTeam.set(g.teamId, []);
    byTeam.get(g.teamId)!.push(g);
  }

  return Array.from(byTeam.entries()).map(([teamId, rows]) => {
    const n = rows.length;
    const sum = (fn: (g: TeamGameTotals) => number) => rows.reduce((s, g) => s + fn(g), 0);
    const points = sum((g) => g.points);
    const pointsAgainst = sum((g) => g.pointsAgainst);
    const rebounds = sum((g) => g.reboundsOffensive + g.reboundsDefensive);
    const fgm = sum((g) => g.fieldGoalMade);
    const fga = sum((g) => g.fieldGoalAttempted);
    const tpm = sum((g) => g.threePointMade);
    const tpa = sum((g) => g.threePointAttempted);
    const ftm = sum((g) => g.ftMade);
    const fta = sum((g) => g.ftAttempted);
    const assists = sum((g) => g.assists);
    const steals = sum((g) => g.steals);
    const blocks = sum((g) => g.blocks);
    const turnovers = sum((g) => g.turnovers);
    const fouls = sum((g) => g.personalFouls);
    const efficiency = computeEfficiency({
      points,
      reboundsTotal: rebounds,
      assists,
      steals,
      blocks,
      fieldGoalAttempted: fga,
      fieldGoalMade: fgm,
      ftAttempted: fta,
      ftMade: ftm,
      turnovers,
    });

    return {
      teamId,
      gamesPlayed: n,
      pointsPerGame: points / n,
      pointsAgainstPerGame: pointsAgainst / n,
      differentialPerGame: (points - pointsAgainst) / n,
      reboundsPerGame: rebounds / n,
      assistsPerGame: assists / n,
      stealsPerGame: steals / n,
      blocksPerGame: blocks / n,
      turnoversPerGame: turnovers / n,
      personalFoulsPerGame: fouls / n,
      fieldGoalPct: pct(fgm, fga),
      threePointPct: pct(tpm, tpa),
      ftPct: pct(ftm, fta),
      efficiencyPerGame: efficiency / n,
    };
  });
}
