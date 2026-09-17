/**
 * Box score aggregation — derives every value in spec 5.3 and the grid
 * columns in spec 6.3 from the immutable event log. Nothing here is stored;
 * it is recomputed from `game_event` rows every time.
 */
import type { GameEvent } from "../types/entities";
import { computeWtLadder, computePlayerFoulTotal, type WtLevel, wtLevelLabel } from "./fouls";
import { computePlusMinus } from "./plusMinus";
import { computeMinutesMsForPlayer } from "./clock";
import { computeEfficiency } from "./efficiency";

export interface PlayerBoxLine {
  playerId: string;
  teamId: string;
  points: number;
  twoPointMade: number;
  twoPointAttempted: number;
  threePointMade: number;
  threePointAttempted: number;
  ftMade: number;
  ftAttempted: number;
  fieldGoalMade: number;
  fieldGoalAttempted: number;
  fieldGoalPct: number | null;
  threePointPct: number | null;
  ftPct: number | null;
  reboundsOffensive: number;
  reboundsDefensive: number;
  reboundsTotal: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  personalFouls: number;
  wtLevel: WtLevel;
  wtLabel: "" | "W" | "T" | "T2";
  plusMinus: number;
  minutesMs: number | null;
  efficiency: number;
  fouledOut: boolean;
  ejected: boolean;
  onCourt: boolean;
}

export interface TeamBoxLine {
  teamId: string;
  score: number;
  reboundsOffensive: number;
  reboundsDefensive: number;
  reboundsTotal: number;
  turnovers: number;
  benchWtLevel: WtLevel;
  benchWtLabel: "" | "W" | "T" | "T2";
  coachDisqualified: boolean;
}

type Evt = Pick<
  GameEvent,
  "event_type" | "team_id" | "player_id" | "period" | "clock_ms" | "payload" | "sequence"
>;

function pct(made: number, attempted: number): number | null {
  return attempted > 0 ? made / attempted : null;
}

export interface BoxScoreInput {
  events: Evt[];
  rosterByTeam: Record<string, string[]>;
  onCourtByTeam: Record<string, string[]>;
  settings: {
    personal_fouls_to_foul_out: number;
    technicals_to_ejection: number;
    technical_counts_toward_personal_fouls: boolean;
  };
}

export function computeBoxScore(input: BoxScoreInput): {
  players: Record<string, PlayerBoxLine>;
  teams: Record<string, TeamBoxLine>;
} {
  const { events, rosterByTeam, onCourtByTeam, settings } = input;
  const plusMinus = computePlusMinus(events);

  const players: Record<string, PlayerBoxLine> = {};
  const teamTurnovers: Record<string, number> = {};
  const teamRebO: Record<string, number> = {};
  const teamRebD: Record<string, number> = {};
  const teamScore: Record<string, number> = {};
  const teamWtEvents: Record<string, Evt[]> = {};
  const playerWtEvents: Record<string, Evt[]> = {};
  const playerFoulPersonal: Record<string, number> = {};
  const playerManualEjection: Record<string, boolean> = {};

  const initPlayer = (playerId: string, teamId: string) => {
    if (players[playerId]) return;
    players[playerId] = {
      playerId,
      teamId,
      points: 0,
      twoPointMade: 0,
      twoPointAttempted: 0,
      threePointMade: 0,
      threePointAttempted: 0,
      ftMade: 0,
      ftAttempted: 0,
      fieldGoalMade: 0,
      fieldGoalAttempted: 0,
      fieldGoalPct: null,
      threePointPct: null,
      ftPct: null,
      reboundsOffensive: 0,
      reboundsDefensive: 0,
      reboundsTotal: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      personalFouls: 0,
      wtLevel: 0,
      wtLabel: "",
      plusMinus: 0,
      minutesMs: null,
      efficiency: 0,
      fouledOut: false,
      ejected: false,
      onCourt: false,
    };
  };

  for (const [teamId, ids] of Object.entries(rosterByTeam)) {
    teamScore[teamId] = 0;
    teamTurnovers[teamId] = 0;
    teamRebO[teamId] = 0;
    teamRebD[teamId] = 0;
    teamWtEvents[teamId] = [];
    ids.forEach((pid) => initPlayer(pid, teamId));
  }

  for (const evt of events) {
    const teamId = evt.team_id;
    switch (evt.event_type) {
      case "shot_made": {
        const p = (evt.payload as { points: 2 | 3 }).points;
        if (teamId) teamScore[teamId] = (teamScore[teamId] ?? 0) + p;
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          const line = players[evt.player_id];
          line.points += p;
          if (p === 2) {
            line.twoPointMade += 1;
            line.twoPointAttempted += 1;
          } else {
            line.threePointMade += 1;
            line.threePointAttempted += 1;
          }
          line.fieldGoalMade += 1;
          line.fieldGoalAttempted += 1;
        }
        break;
      }
      case "shot_missed": {
        const p = (evt.payload as { points: 2 | 3 }).points;
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          const line = players[evt.player_id];
          if (p === 2) line.twoPointAttempted += 1;
          else line.threePointAttempted += 1;
          line.fieldGoalAttempted += 1;
        }
        break;
      }
      case "free_throw_made": {
        if (teamId) teamScore[teamId] = (teamScore[teamId] ?? 0) + 1;
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          const line = players[evt.player_id];
          line.points += 1;
          line.ftMade += 1;
          line.ftAttempted += 1;
        }
        break;
      }
      case "free_throw_missed": {
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          players[evt.player_id].ftAttempted += 1;
        }
        break;
      }
      case "rebound": {
        const { kind } = evt.payload as { kind: "offensive" | "defensive" };
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          const line = players[evt.player_id];
          if (kind === "offensive") line.reboundsOffensive += 1;
          else line.reboundsDefensive += 1;
          line.reboundsTotal = line.reboundsOffensive + line.reboundsDefensive;
        } else if (teamId) {
          if (kind === "offensive") teamRebO[teamId] = (teamRebO[teamId] ?? 0) + 1;
          else teamRebD[teamId] = (teamRebD[teamId] ?? 0) + 1;
        }
        break;
      }
      case "assist":
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          players[evt.player_id].assists += 1;
        }
        break;
      case "steal":
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          players[evt.player_id].steals += 1;
        }
        break;
      case "block":
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          players[evt.player_id].blocks += 1;
        }
        break;
      case "turnover":
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          players[evt.player_id].turnovers += 1;
        } else if (teamId) {
          teamTurnovers[teamId] = (teamTurnovers[teamId] ?? 0) + 1;
        }
        break;
      case "foul_personal":
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          playerFoulPersonal[evt.player_id] = (playerFoulPersonal[evt.player_id] ?? 0) + 1;
        }
        break;
      case "warning":
      case "technical":
        if (evt.player_id) {
          initPlayer(evt.player_id, teamId!);
          (playerWtEvents[evt.player_id] ??= []).push(evt);
        } else if (teamId) {
          teamWtEvents[teamId].push(evt);
        }
        break;
      case "ejection":
        if (evt.player_id) playerManualEjection[evt.player_id] = true;
        break;
      default:
        break;
    }
  }

  for (const [playerId, line] of Object.entries(players)) {
    const foulPersonal = playerFoulPersonal[playerId] ?? 0;
    const wt = computeWtLadder(playerWtEvents[playerId] ?? []);
    line.personalFouls = computePlayerFoulTotal(foulPersonal, wt, settings);
    line.wtLevel = wt.level;
    line.wtLabel = wtLevelLabel(wt.level);
    line.fieldGoalPct = pct(line.fieldGoalMade, line.fieldGoalAttempted);
    line.threePointPct = pct(line.threePointMade, line.threePointAttempted);
    line.ftPct = pct(line.ftMade, line.ftAttempted);
    line.plusMinus = plusMinus[playerId] ?? 0;
    line.minutesMs = computeMinutesMsForPlayer(playerId, events);
    line.efficiency = computeEfficiency(line);
    line.fouledOut = line.personalFouls >= settings.personal_fouls_to_foul_out;
    line.ejected = playerManualEjection[playerId] === true || wt.technicalCount >= settings.technicals_to_ejection;
    line.onCourt = (onCourtByTeam[line.teamId] ?? []).includes(playerId);
  }

  const teams: Record<string, TeamBoxLine> = {};
  for (const teamId of Object.keys(rosterByTeam)) {
    const wt = computeWtLadder(teamWtEvents[teamId] ?? []);
    teams[teamId] = {
      teamId,
      score: teamScore[teamId] ?? 0,
      reboundsOffensive: teamRebO[teamId] ?? 0,
      reboundsDefensive: teamRebD[teamId] ?? 0,
      reboundsTotal: (teamRebO[teamId] ?? 0) + (teamRebD[teamId] ?? 0),
      turnovers: teamTurnovers[teamId] ?? 0,
      benchWtLevel: wt.level,
      benchWtLabel: wtLevelLabel(wt.level),
      coachDisqualified: wt.level >= 3,
    };
  }

  return { players, teams };
}

/** Team totals = sum of player values plus team-attributed events (spec 5.3). */
export function computeTeamTotalsFromPlayers(
  teamId: string,
  players: Record<string, PlayerBoxLine>,
  teamLine: TeamBoxLine,
) {
  const teamPlayers = Object.values(players).filter((p) => p.teamId === teamId);
  return {
    points: teamLine.score,
    fieldGoalMade: teamPlayers.reduce((s, p) => s + p.fieldGoalMade, 0),
    fieldGoalAttempted: teamPlayers.reduce((s, p) => s + p.fieldGoalAttempted, 0),
    threePointMade: teamPlayers.reduce((s, p) => s + p.threePointMade, 0),
    threePointAttempted: teamPlayers.reduce((s, p) => s + p.threePointAttempted, 0),
    ftMade: teamPlayers.reduce((s, p) => s + p.ftMade, 0),
    ftAttempted: teamPlayers.reduce((s, p) => s + p.ftAttempted, 0),
    reboundsOffensive: teamPlayers.reduce((s, p) => s + p.reboundsOffensive, 0) + teamLine.reboundsOffensive,
    reboundsDefensive: teamPlayers.reduce((s, p) => s + p.reboundsDefensive, 0) + teamLine.reboundsDefensive,
    assists: teamPlayers.reduce((s, p) => s + p.assists, 0),
    steals: teamPlayers.reduce((s, p) => s + p.steals, 0),
    blocks: teamPlayers.reduce((s, p) => s + p.blocks, 0),
    turnovers: teamPlayers.reduce((s, p) => s + p.turnovers, 0) + teamLine.turnovers,
    personalFouls: teamPlayers.reduce((s, p) => s + p.personalFouls, 0),
  };
}
