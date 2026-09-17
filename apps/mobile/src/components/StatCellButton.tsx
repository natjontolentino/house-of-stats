import { useRef, useState } from "react";
import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { gridFont } from "../state/gridTheme";

/** Tap = +1 (green flash), long-press (500ms) = -1 (red flash) — spec 6.4. */
export function StatCellButton({
  value,
  disabled,
  highlighted,
  style,
  onTap,
  onLongPress,
}: {
  value: number | string;
  disabled?: boolean;
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
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
      // Never pass RN's own `disabled` here, and never gate onPress on the
      // `disabled` prop either. It's easy to assume a bench player's cell
      // should be a no-op on tap since they can't record a stat directly —
      // but spec 6.5 requires that exact tap to open the implicit-
      // substitution prompt (tapCell in useGameEngine.ts already handles
      // this correctly). Gating onPress here silently swallowed that tap
      // before it ever reached that logic — confirmed broken on a real
      // device (Fix Round 2 retest) after being wrongly signed off as
      // working from a code read that didn't trace this far. `disabled` is
      // visual dimming only now, exactly like onLongPress already was.
      delayLongPress={500}
      android_ripple={{ color: "rgba(0,0,0,0.08)" }}
      onPress={() => {
        doFlash("green");
        onTap();
      }}
      onLongPress={() => {
        doFlash("red");
        onLongPress();
      }}
      style={[
        styles.cell,
        style,
        highlighted && styles.highlighted,
        flash === "green" && styles.flashGreen,
        flash === "red" && styles.flashRed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[styles.text, { fontFamily: gridFont(true) }, disabled && styles.textDisabled]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Fix Round 2, A5: an explicit height (not vertical padding) so the row's
  // actual height is a predictable 48px — Android's minimum touch target —
  // rather than whatever a font's own line-height metrics happen to add up
  // to. If on-device testing finds 48px error-prone to tap accurately,
  // bump this to 50 and shave the difference off the prompt bar instead.
  cell: {
    height: 48,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  highlighted: { backgroundColor: "#fde9c8" },
  flashGreen: { backgroundColor: "#bdf0d0" },
  flashRed: { backgroundColor: "#f7c7c7" },
  disabled: { opacity: 0.35 },
  text: {
    fontVariant: ["tabular-nums"],
    fontSize: 13,
    fontWeight: "600",
  },
  textDisabled: { color: "#999" },
});
