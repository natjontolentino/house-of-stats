/**
 * The master live-game reducer. Recomputes the entire tracker screen state
 * from the immutable event log every time (spec principle 2: "record events,
 * not totals; all totals are derived"). Used identically by the mobile
 * tracker (live UI, restart recovery) and the server/web (box score, exports).
 */
import type { Game, GameEvent } from "../types/entities";
import type { LeagueSettings } from "../types/settings";
import { computeBoxScore, type PlayerBoxLine, type TeamBoxLine } from "./boxScore";
import { computeTeamFoulsForPeriod, computePenaltyBoxStatus, type PenaltyBoxStatus } from "./derive";
import { computeTimeoutBoxes, type TimeoutBox } from "./timeouts";
import { AUTO_PAUSE_EVENT_TYPES } from "./clock";

export interface TeamGameState {
  teamId: string;
  score: number;
  onCourtPlayerIds: string[];
  benchPlayerIds: string[];
  disqualifiedPlayerIds: string[];
  teamFoulCount: number;
  penaltyStatus: PenaltyBoxStatus;
  timeoutBoxes: TimeoutBox[];
}

export interface LiveGameState {
  currentPeriod: number;
  clockRunning: boolean;
  /** Last recorded clock reading; the live app ticks locally from this while running. */
  lastKnownClockMs: number | null;
  home: TeamGameState;
  away: TeamGameState;
  players: Record<string, PlayerBoxLine>;
  teams: Record<string, TeamBoxLine>;
  lastActions: GameEvent[];
  isFinalized: boolean;
}

/** Events that void an earlier event are excluded from every derived view (spec 6.12). */
export function filterVoidedEvents(events: GameEvent[]): GameEvent[] {
  const voidedClientUuids = new Set<string>();
  for (const evt of events) {
    if (evt.event_type === "event_voided") {
      const voids = (evt.payload as { voids_client_uuid: string }).voids_client_uuid;
      voidedClientUuids.add(voids);
    }
  }
  return events
    .filter((e) => e.event_type !== "event_voided")
    .filter((e) => !voidedClientUuids.has(e.client_uuid));
}

function computeOnCourt(events: GameEvent[], teamId: string): Set<string> {
  const set = new Set<string>();
  for (const evt of events) {
    if (evt.team_id !== teamId) continue;
    if (evt.event_type === "lineup_set") {
      const ids = (evt.payload as { player_ids: string[] }).player_ids;
      set.clear();
      ids.forEach((id) => set.add(id));
    } else if (evt.event_type === "substitution") {
      const { player_in, player_out } = evt.payload as {
        player_in: string;
        player_out: string;
      };
      set.delete(player_out);
      set.add(player_in);
    }
  }
  return set;
}

function computeCurrentPeriod(events: GameEvent[]): number {
  let period = 1;
  for (const evt of events) {
    if (evt.event_type === "period_start") {
      period = (evt.payload as { period: number }).period;
    }
  }
  return period;
}

function computeClockRunning(events: GameEvent[]): boolean {
  let running = false;
  for (const evt of events) {
    if (evt.event_type === "clock_start") running = true;
    else if (evt.event_type === "clock_stop") running = false;
    else if (AUTO_PAUSE_EVENT_TYPES.has(evt.event_type)) running = false;
  }
  return running;
}

function computeLastKnownClockMs(events: GameEvent[]): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].clock_ms !== null) return events[i].clock_ms;
  }
  return null;
}

function computeDisqualified(
  players: Record<string, PlayerBoxLine>,
  teamId: string,
): string[] {
  return Object.values(players)
    .filter((p) => p.teamId === teamId && (p.fouledOut || p.ejected))
    .map((p) => p.playerId);
}

export function computeLiveGameState(input: {
  game: Pick<Game, "home_team_id" | "away_team_id" | "status">;
  allEvents: GameEvent[];
  rosterByTeam: Record<string, string[]>;
  settings: LeagueSettings;
}): LiveGameState {
  const events = filterVoidedEvents(input.allEvents).sort((a, b) => a.sequence - b.sequence);
  const currentPeriod = computeCurrentPeriod(events);
  const homeId = input.game.home_team_id;
  const awayId = input.game.away_team_id;

  const onCourtByTeam: Record<string, string[]> = {
    [homeId]: Array.from(computeOnCourt(events, homeId)),
    [awayId]: Array.from(computeOnCourt(events, awayId)),
  };

  const { players, teams } = computeBoxScore({
    events,
    rosterByTeam: input.rosterByTeam,
    onCourtByTeam,
    settings: input.settings,
  });

  const buildTeam = (teamId: string): TeamGameState => {
    const foulCount = computeTeamFoulsForPeriod(
      events,
      teamId,
      currentPeriod,
      input.settings.period_structure_quarters,
    );
    const roster = input.rosterByTeam[teamId] ?? [];
    const onCourt = onCourtByTeam[teamId] ?? [];
    return {
      teamId,
      score: teams[teamId]?.score ?? 0,
      onCourtPlayerIds: onCourt,
      benchPlayerIds: roster.filter((id) => !onCourt.includes(id)),
      disqualifiedPlayerIds: computeDisqualified(players, teamId),
      teamFoulCount: foulCount,
      penaltyStatus: computePenaltyBoxStatus(foulCount, input.settings.fouls_before_team_penalty),
      timeoutBoxes: computeTimeoutBoxes(
        events.filter((e) => e.team_id === teamId),
        currentPeriod,
        input.settings,
      ),
    };
  };

  return {
    currentPeriod,
    clockRunning: computeClockRunning(events),
    lastKnownClockMs: computeLastKnownClockMs(events),
    home: buildTeam(homeId),
    away: buildTeam(awayId),
    players,
    teams,
    lastActions: events.slice(-3).reverse(),
    isFinalized: input.game.status === "finalized",
  };
}
