import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import type { CachedGameBundle } from "../db/localDb";
import type { GameEngine } from "../state/useGameEngine";
import { CLOCK_SYNC_ADJUSTMENTS_MS, msToMinutesDisplay, type LiveGameState } from "@courtstats/shared";
import { teamShortLabel } from "../state/teamDisplay";
import { gridFont } from "../state/gridTheme";

/**
 * Fix Round 2, A2/A3/A4: on phone, the top bar is the only chrome that can
 * absorb the team-toggle and the opponent's foul count without costing any
 * extra vertical space of its own — tapping a score switches the grid
 * (replacing the separate toggle tab row) and the hidden team's foul count
 * rides along next to its score. Tablet keeps the original taller layout
 * (both teams' full foul/timeout panels are already visible below it, so
 * neither affordance is needed there) — isTablet fully forks the render.
 */
export function TopBar({
  bundle,
  engine,
  isTablet,
  activeSide,
  onSelectSide,
}: {
  bundle: CachedGameBundle;
  engine: GameEngine;
  isTablet: boolean;
  activeSide: "home" | "away";
  onSelectSide: (side: "home" | "away") => void;
}) {
  const [syncOpen, setSyncOpen] = useState(false);
  const liveState = engine.liveState!;
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

  const clockControls = (
    <>
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
    </>
  );

  const syncRow = syncOpen && (
    <View style={styles.syncRow}>
      {CLOCK_SYNC_ADJUSTMENTS_MS.map((delta) => (
        <Pressable key={delta} style={styles.syncButton} onPress={() => engine.syncClockAdjust(delta)}>
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
  );

  if (!isTablet) {
    return (
      <View style={styles.compactBar}>
        <CompactTeamHeader
          name={teamShortLabel(homeTeam)}
          score={liveState.home.score}
          active={activeSide === "home"}
          onPress={() => onSelectSide("home")}
          // The active side's fouls are already fully visible in the compact
          // fouls/timeout row below (A4) — showing the count here too would
          // just be noise. Only the hidden (opponent) side needs it here.
          foulCount={activeSide !== "home" ? liveState.home.teamFoulCount : undefined}
          foulStatus={liveState.home.penaltyStatus}
        />

        <View style={styles.compactCenter}>
          <Text style={styles.compactPeriod}>Period {liveState.currentPeriod}</Text>
          {engine.clockMode !== "off" && (
            <Text style={[styles.compactClock, { fontFamily: gridFont(true) }]}>
              {engine.clockMs !== null ? msToMinutesDisplay(engine.clockMs) : "--:--"}
            </Text>
          )}
          <View style={styles.controls}>
            {clockControls}
            <Pressable style={styles.controlButton} onPress={confirmEndQuarter}>
              <Text style={styles.controlButtonTextDark}>End Q</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={engine.undo}>
              <Text style={styles.controlButtonTextDark}>Undo</Text>
            </Pressable>
          </View>
          {syncRow}
        </View>

        <CompactTeamHeader
          name={teamShortLabel(awayTeam)}
          score={liveState.away.score}
          active={activeSide === "away"}
          onPress={() => onSelectSide("away")}
          foulCount={activeSide !== "away" ? liveState.away.teamFoulCount : undefined}
          foulStatus={liveState.away.penaltyStatus}
        />
      </View>
    );
  }

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
          {clockControls}
          <Pressable style={styles.controlButton} onPress={confirmEndQuarter}>
            <Text style={styles.controlButtonTextDark}>End Q</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={engine.undo}>
            <Text style={styles.controlButtonTextDark}>Undo</Text>
          </Pressable>
        </View>

        {syncRow}
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

function foulPillColor(status: LiveGameState["home"]["penaltyStatus"]): string {
  return status === "red" ? "#ff8a8a" : status === "amber" ? "#f5c26b" : "#8888a0";
}

function CompactTeamHeader({
  name,
  score,
  active,
  onPress,
  foulCount,
  foulStatus,
}: {
  name: string;
  score: number;
  active: boolean;
  onPress: () => void;
  /** Only passed for the team NOT currently displayed (A4) — the active team's fouls already show in the compact bar below. */
  foulCount?: number;
  foulStatus: LiveGameState["home"]["penaltyStatus"];
}) {
  return (
    <Pressable
      style={[styles.compactTeamBlock, active && styles.compactTeamBlockActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Show ${name}'s grid`}
    >
      <Text style={styles.compactTeamName} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.compactScoreRow}>
        <Text style={[styles.compactScore, { fontFamily: gridFont(true) }]}>{score}</Text>
        {foulCount !== undefined && (
          <Text style={[styles.foulPill, { color: foulPillColor(foulStatus), borderColor: foulPillColor(foulStatus) }]}>
            {foulCount}PF
          </Text>
        )}
      </View>
    </Pressable>
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

  // --- Fix Round 2, A2/A3/A4: compact phone-only top bar (~60px total). ---
  compactBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#1a1a2e",
  },
  compactTeamBlock: {
    alignItems: "center",
    minWidth: 64,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  compactTeamBlockActive: { backgroundColor: "rgba(255,255,255,0.16)" },
  compactTeamName: { color: "#ccc", fontSize: 10, textTransform: "uppercase" },
  compactScoreRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  compactScore: { color: "white", fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  foulPill: { fontSize: 10, fontWeight: "700", borderWidth: 1, borderRadius: 4, paddingHorizontal: 3 },
  compactCenter: { alignItems: "center" },
  compactPeriod: { color: "#ccc", fontSize: 10, textTransform: "uppercase" },
  compactClock: { color: "white", fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
