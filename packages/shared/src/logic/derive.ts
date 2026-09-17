/**
 * Team fouls per period and the penalty box — spec 5.3, 6.7. Team fouls
 * reset at the start of each regulation period, but overtime continues
 * accumulating from Q4 rather than resetting.
 */
import type { GameEvent } from "../types/entities";

type Evt = Pick<GameEvent, "event_type" | "team_id" | "player_id" | "period">;

export function computeTeamFoulsForPeriod(
  events: Evt[],
  teamId: string,
  currentPeriod: number,
  periodStructureQuarters: number,
): number {
  const inRange =
    currentPeriod <= periodStructureQuarters
      ? (p: number) => p === currentPeriod
      : (p: number) => p >= periodStructureQuarters && p <= currentPeriod;

  let count = 0;
  for (const evt of events) {
    if (evt.team_id !== teamId || !inRange(evt.period)) continue;
    if (evt.event_type === "foul_personal" && evt.player_id) count += 1;
    if (evt.event_type === "technical" && evt.player_id) count += 1;
  }
  return count;
}

export type PenaltyBoxStatus = "normal" | "amber" | "red";

/** Amber at fouls_before_team_penalty − 1 (the table raises one foul early); red at the threshold or more. */
export function computePenaltyBoxStatus(
  teamFoulCount: number,
  foulsBeforeTeamPenalty: number,
): PenaltyBoxStatus {
  if (teamFoulCount >= foulsBeforeTeamPenalty) return "red";
  if (teamFoulCount === foulsBeforeTeamPenalty - 1) return "amber";
  return "normal";
}
