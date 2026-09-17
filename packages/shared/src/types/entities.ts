/**
 * Core entities — spec section 5.1. Field names and shapes must match the
 * spec exactly; do not add or rename columns here without updating the spec.
 */

export type LeagueStatus = "active" | "expired" | "archived";
export type SeasonStatus = "upcoming" | "active" | "complete";
export type GameStatus = "scheduled" | "in_progress" | "finalized";
export type DeviceStatus = "active" | "unpaired";
export type UserRole = "operator" | "organizer" | "tracker";

export interface League {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  status: LeagueStatus;
  created_at: string;
}

export interface Season {
  id: string;
  league_id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  status: SeasonStatus;
}

export interface Team {
  id: string;
  season_id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
}

export interface Player {
  id: string;
  league_id: string;
  full_name: string;
  /** Displayed on the tracker app grid. Max 10 characters — see spec 5.1. */
  nickname: string;
  photo_url: string | null;
  is_minor: boolean;
  consent_flags: Record<string, boolean>;
}

export const NICKNAME_MAX_LENGTH = 10;

export interface RosterEntry {
  id: string;
  season_id: string;
  team_id: string;
  player_id: string;
  jersey_number: string;
  is_active: boolean;
}

export interface Venue {
  id: string;
  league_id: string;
  name: string;
  address: string | null;
}

export interface Game {
  id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  venue_id: string | null;
  court_label: string | null;
  scheduled_at: string;
  status: GameStatus;
  locked_by_device_id: string | null;
  lock_expires_at: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
}

export interface GameEvent<TPayload = Record<string, unknown>> {
  id: string;
  game_id: string;
  /** Per-game counter assigned by the device, strictly increasing. */
  sequence: number;
  event_type: string;
  team_id: string | null;
  player_id: string | null;
  period: number;
  /** Mirrored clock reading at the moment of recording; null when clock mode is off. */
  clock_ms: number | null;
  payload: TPayload;
  recorded_by_device_id: string;
  recorded_by_user_id: string | null;
  /** Generated on-device; server rejects duplicates on retry. */
  client_uuid: string;
  created_at: string;
  voided_by_event_id: string | null;
}

export interface GameLineup {
  id: string;
  game_id: string;
  team_id: string;
  player_id: string;
  period: number;
  on_court: boolean;
  effective_sequence: number;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  league_id: string | null;
}

export interface Device {
  id: string;
  league_id: string;
  label: string;
  assigned_to_name: string | null;
  paired_at: string | null;
  last_seen_at: string | null;
  status: DeviceStatus;
}
