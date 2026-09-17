/**
 * Plus/minus — spec section 6.10. Because the app always knows which five
 * players are on court (from lineup_set/substitution events), this needs no
 * clock and no extra tracker input: the point differential accumulated while
 * a player was on the court.
 */
import type { GameEvent } from "../types/entities";

interface PlusMinusEvent {
  event_type: GameEvent["event_type"];
  team_id: string | null;
  payload: unknown;
}

function pointsFor(evt: PlusMinusEvent): number | null {
  if (evt.event_type === "shot_made") {
    return (evt.payload as { points: 2 | 3 }).points;
  }
  if (evt.event_type === "free_throw_made") {
    return 1;
  }
  return null;
}

export function computePlusMinus(
  orderedEvents: PlusMinusEvent[],
): Record<string, number> {
  const onCourt = new Map<string, Set<string>>();
  const plusMinus: Record<string, number> = {};

  const ensure = (playerId: string) => {
    if (!(playerId in plusMinus)) plusMinus[playerId] = 0;
  };

  for (const evt of orderedEvents as Array<
    PlusMinusEvent & { player_id?: string | null }
  >) {
    if (evt.event_type === "lineup_set" && evt.team_id) {
      const playerIds = (evt.payload as { player_ids: string[] }).player_ids;
      onCourt.set(evt.team_id, new Set(playerIds));
      playerIds.forEach(ensure);
      continue;
    }
    if (evt.event_type === "substitution" && evt.team_id) {
      const { player_in, player_out } = evt.payload as {
        player_in: string;
        player_out: string;
      };
      const set = onCourt.get(evt.team_id) ?? new Set<string>();
      set.delete(player_out);
      set.add(player_in);
      onCourt.set(evt.team_id, set);
      ensure(player_in);
      ensure(player_out);
      continue;
    }
    const points = pointsFor(evt);
    if (points !== null && evt.team_id) {
      for (const [teamId, players] of onCourt.entries()) {
        const delta = teamId === evt.team_id ? points : -points;
        for (const playerId of players) {
          ensure(playerId);
          plusMinus[playerId] += delta;
        }
      }
    }
  }

  return plusMinus;
}
