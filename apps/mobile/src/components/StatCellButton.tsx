import { useRef, useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";

/** Tap = +1 (green flash), long-press (500ms) = -1 (red flash) — spec 6.4. */
export function StatCellButton({
  value,
  disabled,
  highlighted,
  width,
  onTap,
  onLongPress,
}: {
  value: number | string;
  disabled?: boolean;
  highlighted?: boolean;
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
      // Never pass RN's own `disabled` here — it silently swallows
      // onLongPress too, and spec 6.4/6.5 requires long-press corrections to
      // keep working on bench players even though a tap is a no-op for them.
      delayLongPress={500}
      onPress={() => {
        if (disabled) return;
        doFlash("green");
        onTap();
      }}
      onLongPress={() => {
        doFlash("red");
        onLongPress();
      }}
      style={[
        styles.cell,
        width !== undefined && { width },
        highlighted && styles.highlighted,
        flash === "green" && styles.flashGreen,
        flash === "red" && styles.flashRed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.text, disabled && styles.textDisabled]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    minWidth: 34,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  highlighted: { backgroundColor: "#fde9c8" },
  flashGreen: { backgroundColor: "#bdf0d0" },
  flashRed: { backgroundColor: "#f7c7c7" },
  disabled: { opacity: 0.35 },
  text: { fontVariant: ["tabular-nums"], fontSize: 13, fontWeight: "600" },
  textDisabled: { color: "#999" },
});
