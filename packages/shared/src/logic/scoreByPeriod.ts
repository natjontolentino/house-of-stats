/** Score by period — spec 8.1 (game page) and 12.1 (PDF scoresheet). */
import type { GameEvent } from "../types/entities";

type Evt = Pick<GameEvent, "event_type" | "team_id" | "period" | "payload">;

export interface PeriodScore {
  period: number;
  homePoints: number;
  awayPoints: number;
}

export function computeScoreByPeriod(
  events: Evt[],
  homeTeamId: string,
  awayTeamId: string,
): PeriodScore[] {
  const byPeriod = new Map<number, { home: number; away: number }>();

  for (const evt of events) {
    let points = 0;
    if (evt.event_type === "shot_made") points = (evt.payload as { points: 2 | 3 }).points;
    else if (evt.event_type === "free_throw_made") points = 1;
    else continue;
    if (!evt.team_id) continue;

    const entry = byPeriod.get(evt.period) ?? { home: 0, away: 0 };
    if (evt.team_id === homeTeamId) entry.home += points;
    else if (evt.team_id === awayTeamId) entry.away += points;
    byPeriod.set(evt.period, entry);
  }

  return Array.from(byPeriod.entries())
    .sort(([a], [b]) => a - b)
    .map(([period, { home, away }]) => ({ period, homePoints: home, awayPoints: away }));
}
