import { View, Text, Pressable, StyleSheet } from "react-native";
import type { GameEngine } from "../state/useGameEngine";
import type { LiveGameState } from "@courtstats/shared";

export function TeamFoulAndTimeoutBar({
  teamId,
  teamName,
  engine,
  side,
  align,
}: {
  teamId: string;
  teamName: string;
  engine: GameEngine;
  side: "home" | "away";
  align: "left" | "right";
}) {
  const liveState = engine.liveState!;
  const teamState: LiveGameState["home"] = liveState[side];

  const color =
    teamState.penaltyStatus === "red" ? "#d0021b" : teamState.penaltyStatus === "amber" ? "#b8790a" : "#666";

  return (
    <View style={[styles.container, align === "right" && { alignItems: "flex-end" }]}>
      <Text style={[styles.foulsLabel, { color }]}>
        {teamName} fouls: {teamState.teamFoulCount}
        {teamState.penaltyStatus === "red" ? " — PENALTY" : teamState.penaltyStatus === "amber" ? " — bonus next" : ""}
      </Text>
      <View style={[styles.timeoutRow, align === "right" && { flexDirection: "row-reverse" }]}>
        {teamState.timeoutBoxes.map((box) => (
          <Pressable
            key={box.slot_index}
            disabled={box.status !== "available" && box.status !== "used"}
            delayLongPress={500}
            onPress={() => box.status === "available" && engine.useTeamTimeout(teamId, box.slot_index)}
            onLongPress={() => box.status === "used" && engine.undoTimeout(teamId, box.slot_index)}
            style={[
              styles.box,
              box.status === "used" && styles.boxUsed,
              box.status === "locked" && styles.boxLocked,
            ]}
          >
            <Text style={styles.boxText}>{box.status === "used" ? "✓" : box.status === "expired" ? "✕" : ""}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  foulsLabel: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  timeoutRow: { flexDirection: "row", gap: 4 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#bbb",
    alignItems: "center",
    justifyContent: "center",
  },
  boxUsed: { backgroundColor: "#666", borderColor: "#666" },
  boxLocked: { borderStyle: "dashed" },
  boxText: { color: "white", fontSize: 11, fontWeight: "700" },
});
