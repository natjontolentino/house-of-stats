import { View, Text, Pressable, StyleSheet } from "react-native";
import { zonesForShot, type ShotZone } from "@courtstats/shared";
import type { GameEngine } from "../state/useGameEngine";

/**
 * Optional "where was that shot from?" card, shown right after a field goal
 * is recorded. The shot is already saved; tapping a zone just tags it, and
 * ignoring the card (or tapping Skip) leaves it untagged. Drawn as a
 * simplified half court with the basket at the top: baseline row, wing row,
 * then top of the key. Only zones that fit the shot's value are tappable
 * (a three can't come from the paint).
 *
 * The wrapper passes touches through (box-none) so only the card itself
 * intercepts them — the rest of the grid stays tappable.
 */
const ZONE_LABEL: Record<ShotZone, string> = {
  corner_left: "Corner",
  mid_left: "Mid",
  paint: "Paint",
  mid_right: "Mid",
  corner_right: "Corner",
  wing_left: "Wing",
  mid_top: "Mid top",
  wing_right: "Wing",
  top_key: "Top of key",
};

export function ShotZonePicker({ engine, isTablet }: { engine: GameEngine; isTablet: boolean }) {
  const pick = engine.zonePick;
  if (!pick) return null;

  const allowed = zonesForShot(pick.points);
  const rowHeights = isTablet ? { a: 70, b: 48, c: 44 } : { a: 46, b: 36, c: 34 };
  const width = isTablet ? 360 : 270;
  // Column unit: 2 corner + 2 mid + paint(2) = 6 units across the baseline row.
  const unit = width / 6;

  const zone = (z: ShotZone, w: number, h: number) => {
    const enabled = allowed.includes(z);
    return (
      <Pressable
        key={z}
        disabled={!enabled}
        onPress={() => engine.chooseShotZone(z)}
        accessibilityRole="button"
        accessibilityLabel={`${pick.points} point shot from ${ZONE_LABEL[z]} ${z.includes("left") ? "left" : z.includes("right") ? "right" : ""}`}
        style={[
          styles.zone,
          { width: w, height: h },
          z === "corner_left" || z === "corner_right" || z === "wing_left" || z === "wing_right" || z === "top_key"
            ? styles.zoneThree
            : styles.zoneTwo,
          !enabled && styles.zoneOff,
        ]}
      >
        <Text style={[styles.zoneText, !enabled && styles.zoneTextOff]}>{ZONE_LABEL[z]}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.card, { width }]}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {pick.playerLabel} · {pick.points}PT {pick.made ? "made" : "miss"} — where from?
          </Text>
          <Pressable onPress={engine.dismissZonePick} hitSlop={8} accessibilityLabel="Skip shot zone">
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.court}>
          <View style={styles.row}>
            {zone("corner_left", unit, rowHeights.a)}
            {zone("mid_left", unit, rowHeights.a)}
            {zone("paint", unit * 2, rowHeights.a)}
            {zone("mid_right", unit, rowHeights.a)}
            {zone("corner_right", unit, rowHeights.a)}
          </View>
          <View style={styles.row}>
            {zone("wing_left", unit * 2, rowHeights.b)}
            {zone("mid_top", unit * 2, rowHeights.b)}
            {zone("wing_right", unit * 2, rowHeights.b)}
          </View>
          <View style={styles.row}>{zone("top_key", width, rowHeights.c)}</View>
          <View style={styles.basket} pointerEvents="none" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 0, right: 0, bottom: 0, top: 0, justifyContent: "flex-end", alignItems: "flex-end", padding: 8 },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c9c9d1",
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 5, backgroundColor: "#1a1a2e" },
  title: { color: "white", fontSize: 11, fontWeight: "700", flex: 1, marginRight: 8 },
  skip: { color: "#f5a623", fontSize: 12, fontWeight: "800" },
  court: { position: "relative" },
  row: { flexDirection: "row" },
  zone: { alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: "#8a8a99" },
  zoneTwo: { backgroundColor: "#dbe7ff" },
  zoneThree: { backgroundColor: "#ffe6c2" },
  zoneOff: { backgroundColor: "#eeeeef", opacity: 0.5 },
  zoneText: { fontSize: 11, fontWeight: "700", color: "#1a1a2e" },
  zoneTextOff: { color: "#999" },
  basket: { position: "absolute", top: 4, alignSelf: "center", left: "50%", marginLeft: -6, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#d0021b" },
});
