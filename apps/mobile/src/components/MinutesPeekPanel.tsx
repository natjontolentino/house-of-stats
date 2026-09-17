import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import type { CachedGameBundle } from "../db/localDb";
import type { GameEngine } from "../state/useGameEngine";
import { msToMinutesDisplay } from "@courtstats/shared";

/**
 * The Minutes peek panel (spec 6.2). There is no MIN column in the grid
 * (spec 6.3) — minutes are tracked in the background and only surfaced here.
 */
export function MinutesPeekPanel({
  visible,
  onClose,
  bundle,
  engine,
}: {
  visible: boolean;
  onClose: () => void;
  bundle: CachedGameBundle;
  engine: GameEngine;
}) {
  const liveState = engine.liveState;
  const game = bundle.game as { home_team_id: string; away_team_id: string };
  const homeTeam = bundle.homeTeam as { name: string };
  const awayTeam = bundle.awayTeam as { name: string };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Minutes</Text>
          {engine.clockMode === "off" ? (
            <Text style={styles.muted}>Clock is off for this league — minutes aren't tracked.</Text>
          ) : (
            <ScrollView>
              {[
                [game.away_team_id, awayTeam.name],
                [game.home_team_id, homeTeam.name],
              ].map(([teamId, name]) => (
                <View key={teamId} style={{ marginBottom: 16 }}>
                  <Text style={styles.teamName}>{name}</Text>
                  {(bundle.rosterByTeam[teamId] ?? []).map((playerId) => {
                    const p = liveState?.players[playerId];
                    const player = bundle.players[playerId] as { nickname: string };
                    return (
                      <View key={playerId} style={styles.row}>
                        <Text style={styles.playerName}>{player?.nickname}</Text>
                        <Text style={styles.minutes}>
                          {p?.minutesMs !== undefined && p?.minutesMs !== null ? msToMinutesDisplay(p.minutesMs) : "-"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          )}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  panel: { width: 360, maxHeight: "80%", backgroundColor: "white", borderRadius: 12, padding: 20 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  muted: { color: "#666" },
  teamName: { fontWeight: "700", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  playerName: { fontSize: 14 },
  minutes: { fontVariant: ["tabular-nums"], fontWeight: "600" },
  closeButton: { marginTop: 12, alignItems: "center", padding: 10 },
  closeButtonText: { color: "#1a1a2e", fontWeight: "700" },
});
