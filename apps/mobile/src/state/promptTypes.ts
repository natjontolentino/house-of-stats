/** Prompt bar state (spec 6.2, 6.5, 6.6) — a single line showing the current contextual question. */

export type PromptState =
  | { kind: "none" }
  | { kind: "message"; text: string }
  | {
      kind: "implicit_substitution";
      teamId: string;
      benchPlayerId: string;
      benchPlayerName: string;
      // Fix Round 2, B2: real rosters repeat first names across teams, so
      // every player named in a prompt carries their jersey number too.
      benchPlayerJersey: string;
      onCourtOptions: Array<{ playerId: string; name: string; jersey: string }>;
      /** The stat cell the tracker originally tapped; recorded once the substitution resolves. */
      pendingCell: { key: string } | null;
    }
  | {
      kind: "disqualification";
      teamId: string;
      playerId: string;
      playerName: string;
      playerJersey: string;
      reason: "fouls" | "technicals";
      benchOptions: Array<{ playerId: string; name: string; jersey: string }>;
    }
  | {
      /** "Sub 5" — swap the entire on-court lineup in one action, for leagues that require a full-unit substitution on a fixed clock. */
      kind: "bulk_substitution";
      teamId: string;
      /** On-court snapshot taken when the picker opened; every one of these players goes out. */
      outgoingPlayerIds: string[];
      benchOptions: Array<{ playerId: string; name: string; jersey: string }>;
      /** Incoming players picked so far, in pick order — paired index-for-index with outgoingPlayerIds on confirm. */
      chosenIn: string[];
    };
