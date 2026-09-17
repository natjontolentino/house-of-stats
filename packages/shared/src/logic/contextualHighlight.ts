/**
 * Contextual column highlighting — spec section 6.11. A hint only; it must
 * never block or require a follow-up entry. The mobile UI drives the actual
 * 3-second timer; this just decides what to highlight after a given event.
 */
import type { EventType } from "../types/events";

export const CONTEXTUAL_HIGHLIGHT_DURATION_MS = 3000;

export type HighlightColumn = "AST" | "OREB" | "DREB";

export interface HighlightHint {
  teamId: string;
  opponentTeamId: string;
  columns: Array<{ teamId: string; column: HighlightColumn }>;
}

export function contextualHighlightForEvent(
  eventType: EventType,
  shootingTeamId: string,
  opponentTeamId: string,
): HighlightHint | null {
  if (eventType === "shot_made") {
    return {
      teamId: shootingTeamId,
      opponentTeamId,
      columns: [{ teamId: shootingTeamId, column: "AST" }],
    };
  }
  if (eventType === "shot_missed" || eventType === "free_throw_missed") {
    return {
      teamId: shootingTeamId,
      opponentTeamId,
      columns: [
        { teamId: shootingTeamId, column: "OREB" },
        { teamId: opponentTeamId, column: "DREB" },
      ],
    };
  }
  return null;
}
