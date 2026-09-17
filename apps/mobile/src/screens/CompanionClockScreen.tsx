import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { msToMinutesDisplay } from "@courtstats/shared";
import { supabase } from "../sync/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { gridFont } from "../state/gridTheme";

/**
 * Companion clock mode (spec 6.9): a second person — usually the scoreboard
 * operator — opens this minimal Start/Stop screen on another phone. It
 * broadcasts clock_ms to the tracker's device over a realtime channel; the
 * tracker never runs its own countdown in this mode.
 */
export function CompanionClockScreen({
  gameId,
  periodLengthMs,
  onClose,
}: {
  gameId: string;
  periodLengthMs: number;
  onClose: () => void;
}) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const [clockMs, setClockMs] = useState(periodLengthMs);
  const [running, setRunning] = useState(false);
  // Created once inside the mount-only effect below, not via useRef's eager
  // initializer — that form re-evaluates supabase.channel(...) on every
  // render, and this component re-renders every second while the clock
  // ticks, which would leak a fresh (never-subscribed) channel each time.
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`companion-clock-${gameId}`);
    channelRef.current = channel;
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  useEffect(() => {
    const id = setInterval(() => {
      setClockMs((ms) => {
        const next = running ? Math.max(0, ms - 1000) : ms;
        channelRef.current?.send({ type: "broadcast", event: "tick", payload: { clock_ms: next, running } });
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Companion clock</Text>
      <Text style={[styles.clock, { fontFamily: gridFont(true) }]}>{msToMinutesDisplay(clockMs)}</Text>
      <Pressable
        style={[styles.button, running ? styles.stopButton : styles.startButton]}
        onPress={() => setRunning((r) => !r)}
      >
        <Text style={styles.buttonText}>{running ? "Stop" : "Start"}</Text>
      </Pressable>
      <Pressable style={styles.resetButton} onPress={() => setClockMs(periodLengthMs)}>
        <Text style={styles.resetButtonText}>Reset to {msToMinutesDisplay(periodLengthMs)}</Text>
      </Pressable>
      <Pressable
        style={[styles.closeButton, { top: 40 + insets.top, right: 24 + insets.right }]}
        onPress={onClose}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e", alignItems: "center", justifyContent: "center", gap: 20 },
  label: { color: "#aaa", fontSize: 14, textTransform: "uppercase" },
  clock: { color: "white", fontSize: 96, fontWeight: "800", fontVariant: ["tabular-nums"] },
  button: { paddingHorizontal: 48, paddingVertical: 20, borderRadius: 16 },
  startButton: { backgroundColor: "#1a8f4c" },
  stopButton: { backgroundColor: "#d0021b" },
  buttonText: { color: "white", fontSize: 22, fontWeight: "800" },
  resetButton: { padding: 10 },
  resetButtonText: { color: "#ccc" },
  closeButton: { position: "absolute", top: 40, right: 24, padding: 10 },
  closeButtonText: { color: "#ccc", fontSize: 14 },
});
