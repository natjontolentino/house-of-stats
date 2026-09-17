/**
 * Post-game validation warnings — spec section 6.14. All non-blocking;
 * shown on the review screen, never prevent finalizing.
 */
import type { GameEvent } from "../types/entities";
import type { PlayerBoxLine, TeamBoxLine } from "./boxScore";

type Evt = Pick<GameEvent, "event_type" | "team_id" | "player_id" | "period" | "payload">;

export interface ValidationWarning {
  code:
    | "on_court_count"
    | "assists_exceed_fgm"
    | "implausible_rebounds"
    | "period_no_events"
    | "minutes_events_mismatch";
  message: string;
  teamId?: string;
  playerId?: string;
  period?: number;
}

/** A team has fewer or more than 5 players on court at any point. */
function checkOnCourtCounts(events: Evt[]): ValidationWarning[] {
  const onCourt = new Map<string, Set<string>>();
  const warnings: ValidationWarning[] = [];
  const flagged = new Set<string>();

  for (const evt of events) {
    if (evt.event_type === "lineup_set" && evt.team_id) {
      const ids = (evt.payload as { player_ids: string[] }).player_ids;
      onCourt.set(evt.team_id, new Set(ids));
    } else if (evt.event_type === "substitution" && evt.team_id) {
      const { player_in, player_out } = evt.payload as {
        player_in: string;
        player_out: string;
      };
      const set = onCourt.get(evt.team_id) ?? new Set<string>();
      set.delete(player_out);
      set.add(player_in);
      onCourt.set(evt.team_id, set);
    } else {
      continue;
    }
    const teamId = evt.team_id!;
    const count = onCourt.get(teamId)?.size ?? 0;
    if (count !== 5 && !flagged.has(teamId)) {
      flagged.add(teamId);
      warnings.push({
        code: "on_court_count",
        teamId,
        message: `Team had ${count} players on court at some point (expected 5).`,
      });
    }
  }
  return warnings;
}

/** Assists exceed made field goals for a team. */
function checkAssistsVsFgm(teams: Record<string, TeamBoxLine>, players: PlayerBoxLine[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  for (const teamId of Object.keys(teams)) {
    const teamPlayers = players.filter((p) => p.teamId === teamId);
    const assists = teamPlayers.reduce((s, p) => s + p.assists, 0);
    const fgm = teamPlayers.reduce((s, p) => s + p.fieldGoalMade, 0);
    if (assists > fgm) {
      warnings.push({
        code: "assists_exceed_fgm",
        teamId,
        message: `Team has ${assists} assists but only ${fgm} made field goals.`,
      });
    }
  }
  return warnings;
}

/** A team's rebounds look implausible against the count of missed shots. */
function checkReboundsVsMisses(teams: Record<string, TeamBoxLine>, players: PlayerBoxLine[]): ValidationWarning[] {
  const totalRebounds = Object.values(teams).reduce((s, t) => s + t.reboundsTotal, 0);
  const totalMisses = players.reduce(
    (s, p) =>
      s +
      (p.fieldGoalAttempted - p.fieldGoalMade) +
      (p.ftAttempted - p.ftMade),
    0,
  );
  if (totalRebounds > totalMisses) {
    return [
      {
        code: "implausible_rebounds",
        message: `${totalRebounds} total rebounds recorded against only ${totalMisses} missed shots.`,
      },
    ];
  }
  return [];
}

/** A period has no recorded events. */
function checkEmptyPeriods(events: Evt[], periodsPlayed: number): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  for (let period = 1; period <= periodsPlayed; period++) {
    const hasEvent = events.some((e) => e.period === period);
    if (!hasEvent) {
      warnings.push({
        code: "period_no_events",
        period,
        message: `Period ${period} has no recorded events.`,
      });
    }
  }
  return warnings;
}

/** A player has minutes recorded but zero events, or vice versa. */
function checkMinutesEventsMismatch(players: PlayerBoxLine[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  for (const p of players) {
    if (p.minutesMs === null) continue; // clock off — not checkable
    const eventCount =
      p.points + p.reboundsTotal + p.assists + p.steals + p.blocks + p.turnovers + p.personalFouls;
    if (p.minutesMs > 0 && eventCount === 0) {
      warnings.push({
        code: "minutes_events_mismatch",
        playerId: p.playerId,
        message: `Player has minutes recorded but no stat events.`,
      });
    } else if (p.minutesMs === 0 && eventCount > 0) {
      warnings.push({
        code: "minutes_events_mismatch",
        playerId: p.playerId,
        message: `Player has stat events recorded but zero minutes.`,
      });
    }
  }
  return warnings;
}

export function computeValidationWarnings(input: {
  events: Evt[];
  players: Record<string, PlayerBoxLine>;
  teams: Record<string, TeamBoxLine>;
  periodsPlayed: number;
}): ValidationWarning[] {
  const playerList = Object.values(input.players);
  return [
    ...checkOnCourtCounts(input.events),
    ...checkAssistsVsFgm(input.teams, playerList),
    ...checkReboundsVsMisses(input.teams, playerList),
    ...checkEmptyPeriods(input.events, input.periodsPlayed),
    ...checkMinutesEventsMismatch(playerList),
  ];
}
