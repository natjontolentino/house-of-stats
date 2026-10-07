/** A just-recorded shot that is waiting for the tracker to optionally tag where it was taken from. */
export interface ZonePick {
  shotClientUuid: string;
  teamId: string;
  playerId: string;
  points: 2 | 3;
  made: boolean;
  /** e.g. "#4 Ibay" — who the shot belonged to. */
  playerLabel: string;
}

/** How long the picker waits before assuming the tracker doesn't want to tag this shot. */
export const ZONE_PICK_TIMEOUT_MS = 6000;
