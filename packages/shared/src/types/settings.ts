/**
 * Per-league settings — spec section 10. FIBA values are the defaults.
 * Stored as jsonb on `league.settings`.
 */

export type ClockMode = "off" | "companion" | "tracker";
export type PogFormula = "efficiency";

export interface LeagueSettings {
  period_structure_quarters: number;
  period_length_minutes: number;
  overtime_length_minutes: number;
  fouls_before_team_penalty: number;
  personal_fouls_to_foul_out: number;
  technicals_to_ejection: number;
  technical_counts_toward_personal_fouls: boolean;
  timeouts_first_half: number;
  timeouts_second_half: number;
  unused_first_half_timeouts_carry_over: boolean;
  overtime_timeouts_per_period: number;
  clock_mode: ClockMode;
  player_of_game_formula: PogFormula;
  player_of_game_limited_to_winners: boolean;
  player_of_game_allow_override: boolean;
  signature_capture_at_finalize: boolean;
  minimum_attempts_for_percentage_leaderboards: "scaled" | number;
  hide_full_names_and_photos_of_minors: boolean;
  standings_tiebreakers: Array<"head_to_head" | "point_differential">;
}

export const DEFAULT_LEAGUE_SETTINGS: LeagueSettings = {
  period_structure_quarters: 4,
  period_length_minutes: 10,
  overtime_length_minutes: 5,
  fouls_before_team_penalty: 5,
  personal_fouls_to_foul_out: 5,
  technicals_to_ejection: 2,
  technical_counts_toward_personal_fouls: true,
  timeouts_first_half: 2,
  timeouts_second_half: 3,
  unused_first_half_timeouts_carry_over: false,
  overtime_timeouts_per_period: 1,
  clock_mode: "off",
  player_of_game_formula: "efficiency",
  player_of_game_limited_to_winners: true,
  player_of_game_allow_override: true,
  signature_capture_at_finalize: false,
  minimum_attempts_for_percentage_leaderboards: "scaled",
  hide_full_names_and_photos_of_minors: false,
  standings_tiebreakers: ["head_to_head", "point_differential"],
};

export function resolveLeagueSettings(
  raw: Record<string, unknown> | null | undefined,
): LeagueSettings {
  return { ...DEFAULT_LEAGUE_SETTINGS, ...(raw ?? {}) };
}
