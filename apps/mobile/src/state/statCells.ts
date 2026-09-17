/**
 * The grid's stat cells (spec 6.3, 6.4). Each cell defines how a tap records
 * an event and how a long-press finds and voids the matching event. This is
 * the single place that maps "which cell was touched" to event semantics —
 * every cell behaves identically (tap +1 / long-press -1, spec 6.4).
 */
import type { EventType, GameEvent } from "@courtstats/shared";

export type StatCellKey =
  | "2pt_made"
  | "2pt_missed"
  | "3pt_made"
  | "3pt_missed"
  | "ft_made"
  | "ft_missed"
  | "reb_o"
  | "reb_d"
  | "ast"
  | "stl"
  | "blk"
  | "to"
  | "pf";

export interface StatCellDef {
  key: StatCellKey;
  eventType: EventType;
  payload: Record<string, unknown>;
  /** Matches the specific event this cell recorded, for long-press void (spec 6.4). */
  matches: (evt: Pick<GameEvent, "event_type" | "payload">) => boolean;
  /** Whether the Team row accepts this cell (spec 6.3: only O/D reb and TO). */
  teamRowEligible: boolean;
}

const matchPoints = (points: 2 | 3) => (evt: Pick<GameEvent, "event_type" | "payload">) =>
  (evt.payload as { points?: number }).points === points;

const matchReboundKind = (kind: "offensive" | "defensive") => (evt: Pick<GameEvent, "event_type" | "payload">) =>
  (evt.payload as { kind?: string }).kind === kind;

export const STAT_CELLS: Record<StatCellKey, StatCellDef> = {
  "2pt_made": {
    key: "2pt_made",
    eventType: "shot_made",
    payload: { points: 2 },
    matches: (e) => e.event_type === "shot_made" && matchPoints(2)(e),
    teamRowEligible: false,
  },
  "2pt_missed": {
    key: "2pt_missed",
    eventType: "shot_missed",
    payload: { points: 2 },
    matches: (e) => e.event_type === "shot_missed" && matchPoints(2)(e),
    teamRowEligible: false,
  },
  "3pt_made": {
    key: "3pt_made",
    eventType: "shot_made",
    payload: { points: 3 },
    matches: (e) => e.event_type === "shot_made" && matchPoints(3)(e),
    teamRowEligible: false,
  },
  "3pt_missed": {
    key: "3pt_missed",
    eventType: "shot_missed",
    payload: { points: 3 },
    matches: (e) => e.event_type === "shot_missed" && matchPoints(3)(e),
    teamRowEligible: false,
  },
  ft_made: {
    key: "ft_made",
    eventType: "free_throw_made",
    payload: {},
    matches: (e) => e.event_type === "free_throw_made",
    teamRowEligible: false,
  },
  ft_missed: {
    key: "ft_missed",
    eventType: "free_throw_missed",
    payload: {},
    matches: (e) => e.event_type === "free_throw_missed",
    teamRowEligible: false,
  },
  reb_o: {
    key: "reb_o",
    eventType: "rebound",
    payload: { kind: "offensive", team_rebound: false },
    matches: (e) => e.event_type === "rebound" && matchReboundKind("offensive")(e),
    teamRowEligible: true,
  },
  reb_d: {
    key: "reb_d",
    eventType: "rebound",
    payload: { kind: "defensive", team_rebound: false },
    matches: (e) => e.event_type === "rebound" && matchReboundKind("defensive")(e),
    teamRowEligible: true,
  },
  ast: {
    key: "ast",
    eventType: "assist",
    payload: {},
    matches: (e) => e.event_type === "assist",
    teamRowEligible: false,
  },
  stl: {
    key: "stl",
    eventType: "steal",
    payload: {},
    matches: (e) => e.event_type === "steal",
    teamRowEligible: false,
  },
  blk: {
    key: "blk",
    eventType: "block",
    payload: {},
    matches: (e) => e.event_type === "block",
    teamRowEligible: false,
  },
  to: {
    key: "to",
    eventType: "turnover",
    payload: { team_turnover: false },
    matches: (e) => e.event_type === "turnover",
    teamRowEligible: true,
  },
  pf: {
    key: "pf",
    eventType: "foul_personal",
    payload: {},
    matches: (e) => e.event_type === "foul_personal",
    teamRowEligible: false,
  },
};

/** Columns that trigger the contextual highlight after a made/missed shot (spec 6.11). */
export const AST_CELL: StatCellKey = "ast";
export const OREB_CELL: StatCellKey = "reb_o";
export const DREB_CELL: StatCellKey = "reb_d";
