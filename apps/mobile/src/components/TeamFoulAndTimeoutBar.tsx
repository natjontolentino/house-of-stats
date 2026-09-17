import { View, Text, Pressable, StyleSheet } from "react-native";
import type { GameEngine } from "../state/useGameEngine";
import type { LiveGameState } from "@courtstats/shared";
import { gridFont } from "../state/gridTheme";

/**
 * Fix Round 1, B2: the team-foul count is a bordered box with a large
 * numeral, not a line of text — legible from a metre away at the scorer's
 * table. Caption changes by state, colours match the existing (correct)
 * amber-at-4 / red-at-5 logic.
 */
function FoulBox({ period, count, status }: { period: number; count: number; status: LiveGameState["home"]["penaltyStatus"] }) {
  const caption = status === "red" ? "PENALTY" : status === "amber" ? "Next = FTs" : "Team fouls";
  const color = status === "red" ? "#d0021b" : status === "amber" ? "#b8790a" : "#444";
  const borderColor = status === "red" ? "#d0021b" : status === "amber" ? "#f0a93a" : "#ccc";
  const backgroundColor = status === "red" ? "#fbe4e6" : status === "amber" ? "#fdf1dc" : "#fafafa";

  return (
    <View style={[foulBoxStyles.box, { borderColor, backgroundColor }]}>
      <Text style={foulBoxStyles.period}>Q{period}</Text>
      <Text style={[foulBoxStyles.count, { color, fontFamily: gridFont(true) }]}>{count}</Text>
      <Text style={[foulBoxStyles.caption, { color }]}>{caption}</Text>
    </View>
  );
}

const foulBoxStyles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: "center",
    minWidth: 76,
  },
  period: { fontSize: 10, color: "#888", fontWeight: "700", textTransform: "uppercase" },
  count: { fontSize: 28, fontWeight: "800", lineHeight: 32 },
  caption: { fontSize: 11, fontWeight: "700" },
});

/**
 * Fix Round 1, B1: used and expired must both read clearly as "spent" (red,
 * distinguished only by check vs. cross), available is a strong neutral
 * outline, and locked (second-half boxes before halftime) is visibly
 * dimmed and dashed — no state should be confusable with another, and the
 * Android ripple must not read as a fifth state.
 */
function TimeoutBox({
  slotIndex,
  status,
  onUse,
  onUndo,
}: {
  slotIndex: number;
  status: "available" | "used" | "expired" | "locked";
  onUse: () => void;
  onUndo: () => void;
}) {
  const interactive = status === "available" || status === "used";
  const stateLabel =
    status === "used" ? "used" : status === "expired" ? "expired, unused" : status === "locked" ? "locked" : "available";

  return (
    <Pressable
      disabled={!interactive}
      delayLongPress={500}
      android_ripple={interactive ? { color: "rgba(0,0,0,0.15)" } : undefined}
      onPress={() => status === "available" && onUse()}
      onLongPress={() => status === "used" && onUndo()}
      accessibilityRole="button"
      accessibilityLabel={`Timeout ${slotIndex + 1}, ${stateLabel}`}
      style={[
        timeoutStyles.box,
        status === "available" && timeoutStyles.available,
        (status === "used" || status === "expired") && timeoutStyles.spent,
        status === "locked" && timeoutStyles.locked,
      ]}
    >
      <Text style={timeoutStyles.icon}>{status === "used" ? "✓" : status === "expired" ? "✕" : ""}</Text>
    </Pressable>
  );
}

const timeoutStyles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  available: { backgroundColor: "#fafafa", borderWidth: 2, borderColor: "#999" },
  spent: { backgroundColor: "#fbe4e6", borderWidth: 2, borderColor: "#d0021b" },
  locked: { backgroundColor: "#eee", borderWidth: 1, borderColor: "#ccc", borderStyle: "dashed", opacity: 0.6 },
  icon: { color: "#d0021b", fontSize: 13, fontWeight: "800" },
});

export function TeamFoulAndTimeoutBar({
  teamId,
  teamName,
  engine,
  side,
  align,
  firstHalfCount,
}: {
  teamId: string;
  teamName: string;
  engine: GameEngine;
  side: "home" | "away";
  align: "left" | "right";
  /** League's `timeouts_first_half` (spec 6.8) — where the divider between
      first- and second-half boxes is drawn. Must come from the league's
      actual settings, not a hardcoded guess, or the divider lands in the
      wrong place for any league not configured like the default. */
  firstHalfCount: number;
}) {
  const liveState = engine.liveState!;
  const teamState: LiveGameState["home"] = liveState[side];

  return (
    <View style={[styles.container, align === "right" && styles.containerReverse]}>
      <FoulBox period={liveState.currentPeriod} count={teamState.teamFoulCount} status={teamState.penaltyStatus} />

      <View style={styles.timeoutBlock}>
        <Text style={[styles.teamLabel, align === "right" && { textAlign: "right" }]} numberOfLines={1}>
          {teamName}
        </Text>
        {/* Both teams' boxes read in the same slot 1→5 order regardless of
            which side of the screen they're on — mirroring the row here
            (as align === "right" once did) made the away team's timeouts
            look inconsistent with the home team's at a glance. */}
        <View style={styles.timeoutRow}>
          {teamState.timeoutBoxes.map((box, i) => (
            <View key={box.slot_index} style={styles.timeoutSlot}>
              {/* Divider between the first-half (2) and second-half (3) groups (spec 6.8). */}
              {i === firstHalfCount && <View style={styles.divider} />}
              <TimeoutBox
                slotIndex={box.slot_index}
                status={box.status}
                onUse={() => engine.useTeamTimeout(teamId, box.slot_index)}
                onUndo={() => engine.undoTimeout(teamId, box.slot_index)}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  containerReverse: { flexDirection: "row-reverse" },
  timeoutBlock: { flex: 1 },
  teamLabel: { fontSize: 11, fontWeight: "700", color: "#888", marginBottom: 4, textTransform: "uppercase" },
  timeoutRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeoutSlot: { flexDirection: "row", alignItems: "center" },
  divider: { width: 1, height: 18, backgroundColor: "#ccc", marginRight: 6 },
});
