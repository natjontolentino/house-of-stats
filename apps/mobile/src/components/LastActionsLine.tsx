import { View, Text, StyleSheet } from "react-native";
import type { CachedGameBundle } from "../db/localDb";
import type { GameEvent } from "@courtstats/shared";

function describe(evt: GameEvent, bundle: CachedGameBundle): string {
  const player = evt.player_id ? (bundle.players[evt.player_id] as { nickname: string } | undefined)?.nickname : null;
  const game = bundle.game as { home_team_id: string };
  const homeTeam = bundle.homeTeam as { short_name: string };
  const awayTeam = bundle.awayTeam as { short_name: string };
  const teamShort = evt.team_id === game.home_team_id ? homeTeam.short_name : awayTeam.short_name;
  const who = player ?? `${teamShort} team`;

  switch (evt.event_type) {
    case "shot_made":
      return `${who} made ${(evt.payload as { points: number }).points}PT`;
    case "shot_missed":
      return `${who} missed ${(evt.payload as { points: number }).points}PT`;
    case "free_throw_made":
      return `${who} made FT`;
    case "free_throw_missed":
      return `${who} missed FT`;
    case "rebound":
      return `${who} ${(evt.payload as { kind: string }).kind === "offensive" ? "OREB" : "DREB"}`;
    case "assist":
      return `${who} AST`;
    case "steal":
      return `${who} STL`;
    case "block":
      return `${who} BLK`;
    case "turnover":
      return `${who} TO`;
    case "foul_personal":
      return `${who} PF`;
    case "warning":
      return `${who} warning`;
    case "technical":
      return `${who} technical`;
    case "substitution": {
      const { player_in, player_out } = evt.payload as { player_in: string; player_out: string };
      const nameIn = (bundle.players[player_in] as { nickname: string })?.nickname ?? "?";
      const nameOut = (bundle.players[player_out] as { nickname: string })?.nickname ?? "?";
      return `${teamShort}: ${nameIn} in / ${nameOut} out`;
    }
    case "timeout":
      return `${teamShort} timeout`;
    case "timeout_expired":
      return `${teamShort} timeout expired`;
    case "ejection":
      return `${who} ejected`;
    case "period_start":
      return `Period ${(evt.payload as { period: number }).period} start`;
    case "period_end":
      return `Period ${(evt.payload as { period: number }).period} end`;
    case "lineup_set":
      return `${teamShort} lineup set`;
    case "game_finalized":
      return `Game finalized`;
    default:
      return evt.event_type;
  }
}

/** Last-actions line (spec 6.2): the three most recent recorded events. */
export function LastActionsLine({ bundle, events }: { bundle: CachedGameBundle; events: GameEvent[] }) {
  return (
    <View style={styles.row}>
      {events.slice(0, 3).map((evt) => (
        <Text key={evt.client_uuid} style={styles.item} numberOfLines={1}>
          {describe(evt, bundle)}
        </Text>
      ))}
      {events.length === 0 && <Text style={styles.muted}>No actions yet</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#f0f0f3" },
  item: { fontSize: 11, color: "#444", maxWidth: 160 },
  muted: { fontSize: 11, color: "#999" },
});
