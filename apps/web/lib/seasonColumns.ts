import { msToMinutesDisplay, type PlayerSeasonLine, type TeamSeasonLine } from "@courtstats/shared";

export interface StatColumn<T> {
  key: string;
  label: string;
  /** Larger sorts first. Missing values (no attempts, no minutes) sort last. */
  sortValue: (row: T) => number;
  format: (row: T) => string;
}

const one = (v: number) => v.toFixed(1);
const pct = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1)}%`);
const signed = (v: number) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1));

/** Season averages for players. Every per-game figure comes from computePlayerSeasonStats. */
export const PLAYER_COLUMNS: StatColumn<PlayerSeasonLine>[] = [
  { key: "gp", label: "GP", sortValue: (p) => p.gamesPlayed, format: (p) => String(p.gamesPlayed) },
  {
    key: "min",
    label: "MIN",
    sortValue: (p) => p.minutesPerGameMs ?? -1,
    format: (p) => (p.minutesPerGameMs === null ? "-" : msToMinutesDisplay(p.minutesPerGameMs)),
  },
  { key: "pts", label: "PTS", sortValue: (p) => p.pointsPerGame, format: (p) => one(p.pointsPerGame) },
  { key: "reb", label: "REB", sortValue: (p) => p.reboundsPerGame, format: (p) => one(p.reboundsPerGame) },
  { key: "ast", label: "AST", sortValue: (p) => p.assistsPerGame, format: (p) => one(p.assistsPerGame) },
  { key: "stl", label: "STL", sortValue: (p) => p.stealsPerGame, format: (p) => one(p.stealsPerGame) },
  { key: "blk", label: "BLK", sortValue: (p) => p.blocksPerGame, format: (p) => one(p.blocksPerGame) },
  { key: "to", label: "TO", sortValue: (p) => p.turnoversPerGame, format: (p) => one(p.turnoversPerGame) },
  { key: "fg", label: "FG%", sortValue: (p) => p.fieldGoalPct ?? -1, format: (p) => pct(p.fieldGoalPct) },
  { key: "3p", label: "3P%", sortValue: (p) => p.threePointPct ?? -1, format: (p) => pct(p.threePointPct) },
  { key: "ft", label: "FT%", sortValue: (p) => p.ftPct ?? -1, format: (p) => pct(p.ftPct) },
  { key: "eff", label: "EFF", sortValue: (p) => p.efficiencyPerGame, format: (p) => one(p.efficiencyPerGame) },
  { key: "pm", label: "+/-", sortValue: (p) => p.plusMinusPerGame, format: (p) => signed(p.plusMinusPerGame) },
];

/** Season averages for teams. Team rebounds and turnovers (those belonging to no individual) are included. */
export const TEAM_COLUMNS: StatColumn<TeamSeasonLine>[] = [
  { key: "gp", label: "GP", sortValue: (t) => t.gamesPlayed, format: (t) => String(t.gamesPlayed) },
  { key: "pts", label: "PTS", sortValue: (t) => t.pointsPerGame, format: (t) => one(t.pointsPerGame) },
  { key: "opp", label: "OPP", sortValue: (t) => t.pointsAgainstPerGame, format: (t) => one(t.pointsAgainstPerGame) },
  { key: "diff", label: "DIFF", sortValue: (t) => t.differentialPerGame, format: (t) => signed(t.differentialPerGame) },
  { key: "reb", label: "REB", sortValue: (t) => t.reboundsPerGame, format: (t) => one(t.reboundsPerGame) },
  { key: "ast", label: "AST", sortValue: (t) => t.assistsPerGame, format: (t) => one(t.assistsPerGame) },
  { key: "stl", label: "STL", sortValue: (t) => t.stealsPerGame, format: (t) => one(t.stealsPerGame) },
  { key: "blk", label: "BLK", sortValue: (t) => t.blocksPerGame, format: (t) => one(t.blocksPerGame) },
  { key: "to", label: "TO", sortValue: (t) => t.turnoversPerGame, format: (t) => one(t.turnoversPerGame) },
  { key: "pf", label: "PF", sortValue: (t) => t.personalFoulsPerGame, format: (t) => one(t.personalFoulsPerGame) },
  { key: "fg", label: "FG%", sortValue: (t) => t.fieldGoalPct ?? -1, format: (t) => pct(t.fieldGoalPct) },
  { key: "3p", label: "3P%", sortValue: (t) => t.threePointPct ?? -1, format: (t) => pct(t.threePointPct) },
  { key: "ft", label: "FT%", sortValue: (t) => t.ftPct ?? -1, format: (t) => pct(t.ftPct) },
  { key: "eff", label: "EFF", sortValue: (t) => t.efficiencyPerGame, format: (t) => one(t.efficiencyPerGame) },
];

export function sortRows<T>(rows: T[], columns: StatColumn<T>[], key: string | undefined, fallbackKey: string): T[] {
  const column = columns.find((c) => c.key === key) ?? columns.find((c) => c.key === fallbackKey)!;
  return [...rows].sort((a, b) => column.sortValue(b) - column.sortValue(a));
}
