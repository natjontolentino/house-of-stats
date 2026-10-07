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

export interface ScoreSnapshot {
  home: number;
  away: number;
}

/**
 * Running score after each event, keyed by client_uuid, for a play-by-play
 * that shows "21–25" next to every line. Pass events already stripped of
 * voids (filterVoidedEvents) so a voided basket never counts.
 */
export function computeScoreTimeline(
  events: Array<Pick<GameEvent, "client_uuid" | "event_type" | "team_id" | "payload" | "sequence">>,
  homeTeamId: string,
  awayTeamId: string,
): Map<string, ScoreSnapshot> {
  const timeline = new Map<string, ScoreSnapshot>();
  let home = 0;
  let away = 0;
  for (const evt of [...events].sort((a, b) => a.sequence - b.sequence)) {
    let points = 0;
    if (evt.event_type === "shot_made") points = (evt.payload as { points: 2 | 3 }).points;
    else if (evt.event_type === "free_throw_made") points = 1;
    if (points > 0 && evt.team_id === homeTeamId) home += points;
    else if (points > 0 && evt.team_id === awayTeamId) away += points;
    timeline.set(evt.client_uuid, { home, away });
  }
  return timeline;
}
