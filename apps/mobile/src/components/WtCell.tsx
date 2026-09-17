import { useRef, useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import type { WtLevel } from "@courtstats/shared";

/** The W/T ladder cell — tap steps up, long-press steps down (spec 6.6). */
export function WtCell({
  level,
  label,
  disabled,
  width,
  onTap,
  onLongPress,
}: {
  level: WtLevel;
  label: string;
  disabled?: boolean;
  width?: number;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const [flash, setFlash] = useState<"none" | "green" | "red">("none");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFlash = (color: "green" | "red") => {
    if (timer.current) clearTimeout(timer.current);
    setFlash(color);
    timer.current = setTimeout(() => setFlash("none"), 220);
  };

  return (
    <Pressable
      // Not RN's `disabled` — see StatCellButton's note; long-press must
      // keep working here even when a tap is a no-op (bench players, spec 6.5).
      delayLongPress={500}
      onPress={() => {
        if (disabled || level >= 3) return;
        doFlash("green");
        onTap();
      }}
      onLongPress={() => {
        if (level === 0) return;
        doFlash("red");
        onLongPress();
      }}
      style={[
        styles.cell,
        width !== undefined && { width },
        level === 1 && styles.warn,
        level === 2 && styles.tech,
        level === 3 && styles.tech2,
        flash === "green" && styles.flashGreen,
        flash === "red" && styles.flashRed,
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { minWidth: 30, paddingVertical: 6, alignItems: "center", justifyContent: "center", borderRadius: 4 },
  warn: { backgroundColor: "#fde9c8" },
  tech: { backgroundColor: "#f7c7c7" },
  tech2: { backgroundColor: "#d0021b" },
  flashGreen: { backgroundColor: "#bdf0d0" },
  flashRed: { backgroundColor: "#f7c7c7" },
  text: { fontSize: 12, fontWeight: "700" },
});
