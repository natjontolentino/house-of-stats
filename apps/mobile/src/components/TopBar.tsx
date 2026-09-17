import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import type { CachedGameBundle } from "../db/localDb";
import type { GameEngine } from "../state/useGameEngine";
import { CLOCK_SYNC_ADJUSTMENTS_MS, msToMinutesDisplay } from "@courtstats/shared";
import { teamShortLabel } from "../state/teamDisplay";
import { gridFont } from "../state/gridTheme";

export function TopBar({ bundle, engine }: { bundle: CachedGameBundle; engine: GameEngine }) {
  const [syncOpen, setSyncOpen] = useState(false);
  const liveState = engine.liveState!;
  const game = bundle.game as { home_team_id: string; away_team_id: string };
  const homeTeam = bundle.homeTeam as { name: string; short_name: string };
  const awayTeam = bundle.awayTeam as { name: string; short_name: string };

  const confirmEndQuarter = () => {
    Alert.alert(
      `End period ${liveState.currentPeriod}?`,
      "This resets team fouls for the next period.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "End period", style: "destructive", onPress: () => engine.endQuarter() },
      ],
    );
  };

  return (
    <View style={styles.bar}>
      <TeamHeader name={teamShortLabel(homeTeam)} score={liveState.home.score} />

      <View style={styles.center}>
        <Text style={styles.periodLabel}>Period {liveState.currentPeriod}</Text>
        {engine.clockMode !== "off" && (
          <Text style={[styles.clock, { fontFamily: gridFont(true) }]}>
            {engine.clockMs !== null ? msToMinutesDisplay(engine.clockMs) : "--:--"}
          </Text>
        )}

        <View style={styles.controls}>
          {engine.clockMode === "tracker" && (
            <Pressable
              style={[styles.controlButton, engine.clockRunning ? styles.stopButton : styles.startButton]}
              onPress={engine.toggleClock}
            >
              <Text style={styles.controlButtonText}>{engine.clockRunning ? "Stop" : "Start"}</Text>
            </Pressable>
          )}
          {engine.clockMode !== "off" && (
            <Pressable style={styles.controlButton} onPress={() => setSyncOpen((s) => !s)}>
              <Text style={styles.controlButtonTextDark}>Sync</Text>
            </Pressable>
          )}
          <Pressable style={styles.controlButton} onPress={confirmEndQuarter}>
            <Text style={styles.controlButtonTextDark}>End Q</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={engine.undo}>
            <Text style={styles.controlButtonTextDark}>Undo</Text>
          </Pressable>
        </View>

        {syncOpen && (
          <View style={styles.syncRow}>
            {CLOCK_SYNC_ADJUSTMENTS_MS.map((delta) => (
              <Pressable
                key={delta}
                style={styles.syncButton}
                onPress={() => engine.syncClockAdjust(delta)}
              >
                <Text style={styles.syncButtonText}>
                  {delta > 0 ? "+" : "-"}
                  {Math.abs(delta) >= 60000 ? `${Math.abs(delta) / 60000}:00` : `${Math.abs(delta) / 1000}s`}
                </Text>
              </Pressable>
            ))}
            <Pressable style={[styles.syncButton, styles.doneButton]} onPress={() => setSyncOpen(false)}>
              <Text style={styles.syncButtonText}>Done</Text>
            </Pressable>
          </View>
        )}
      </View>

      <TeamHeader name={teamShortLabel(awayTeam)} score={liveState.away.score} />
    </View>
  );
}

function TeamHeader({ name, score }: { name: string; score: number }) {
  return (
    <View style={{ alignItems: "center", minWidth: 100 }}>
      <Text style={styles.teamName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.score, { fontFamily: gridFont(true) }]}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#1a1a2e",
  },
  teamName: { color: "white", fontSize: 13, maxWidth: 100 },
  score: { color: "white", fontSize: 28, fontWeight: "800", fontVariant: ["tabular-nums"] },
  center: { alignItems: "center" },
  periodLabel: { color: "#ccc", fontSize: 11, textTransform: "uppercase" },
  clock: { color: "white", fontSize: 26, fontWeight: "700", fontVariant: ["tabular-nums"] },
  controls: { flexDirection: "row", gap: 6, marginTop: 4 },
  controlButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: "#3a3a52" },
  startButton: { backgroundColor: "#1a8f4c" },
  stopButton: { backgroundColor: "#d0021b" },
  controlButtonText: { color: "white", fontWeight: "700", fontSize: 12 },
  controlButtonTextDark: { color: "white", fontWeight: "600", fontSize: 12 },
  syncRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  syncButton: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: "#3a3a52" },
  doneButton: { backgroundColor: "#1a8f4c" },
  syncButtonText: { color: "white", fontSize: 11, fontWeight: "700" },
});
