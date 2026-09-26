import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { GameEngine } from "../state/useGameEngine";
import { CLOCK_SYNC_ADJUSTMENTS_MS } from "@courtstats/shared";

/**
 * The prompt bar (spec 6.2): a single line showing the current contextual
 * question. Only handles the two short-lived states that never grow past
 * one line — "none" (idle) and "message" (an OK-dismissable notice). The
 * two prompts with option buttons that can wrap across several lines
 * (implicit_substitution, disqualification) are handled by PromptOverlay
 * below instead (Fix Round 2, B3): this component returns null for those so
 * it never claims layout space for them.
 */
export function PromptBar({ engine }: { engine: GameEngine }) {
  const { prompt } = engine;

  if (prompt.kind === "none") {
    return (
      <View style={styles.bar}>
        <Text style={styles.idleText}>Ready</Text>
      </View>
    );
  }

  if (prompt.kind === "message") {
    return (
      <View style={[styles.bar, styles.messageBar]}>
        <Text style={styles.messageText}>{prompt.text}</Text>
        <Pressable style={styles.smallButton} onPress={engine.cancelPrompt}>
          <Text style={styles.smallButtonText}>OK</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

/**
 * Fix Round 2, B3: rendered as an absolutely-positioned overlay anchored to
 * the bottom of the grid area (see TrackerScreen), not as a normal in-flow
 * sibling — a disqualification or implicit-substitution prompt can wrap to
 * several lines of option buttons, and growing an in-flow element there was
 * stealing height directly from the grid's ScrollView, sometimes leaving
 * almost no player rows visible. On-court players stay reachable because
 * they're pinned to the top of the list (A6) while this covers the bottom.
 */
export function PromptOverlay({ engine }: { engine: GameEngine }) {
  const { prompt } = engine;
  const [showClockFix, setShowClockFix] = useState(false);

  if (prompt.kind === "implicit_substitution") {
    return (
      <View style={[styles.overlayBar, styles.promptBar]}>
        <Text style={styles.promptText}>
          #{prompt.benchPlayerJersey} {prompt.benchPlayerName} is on the bench. Who did he replace?
        </Text>
        <View style={styles.optionsRow}>
          {prompt.onCourtOptions.map((opt) => (
            <Pressable
              key={opt.playerId}
              style={styles.optionButton}
              onPress={() => engine.resolveImplicitSubstitution(opt.playerId)}
            >
              <Text style={styles.optionButtonText}>
                #{opt.jersey} {opt.name}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.smallButton} onPress={() => setShowClockFix((s) => !s)}>
            <Text style={styles.smallButtonText}>Fix clock</Text>
          </Pressable>
          <Pressable style={[styles.smallButton, styles.cancelButton]} onPress={engine.cancelPrompt}>
            <Text style={styles.smallButtonText}>Cancel</Text>
          </Pressable>
        </View>
        {showClockFix && (
          <View style={styles.optionsRow}>
            {CLOCK_SYNC_ADJUSTMENTS_MS.map((delta) => (
              <Pressable key={delta} style={styles.smallButton} onPress={() => engine.syncClockAdjust(delta)}>
                <Text style={styles.smallButtonText}>
                  {delta > 0 ? "+" : "-"}
                  {Math.abs(delta) >= 60000 ? `${Math.abs(delta) / 60000}:00` : `${Math.abs(delta) / 1000}s`}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (prompt.kind === "disqualification") {
    return (
      <View style={[styles.overlayBar, styles.promptBar]}>
        <Text style={styles.promptText}>
          #{prompt.playerJersey} {prompt.playerName} is disqualified (
          {prompt.reason === "fouls" ? "fouled out" : "second technical"}). Who subs in?
        </Text>
        <View style={styles.optionsRow}>
          {prompt.benchOptions.map((opt) => (
            <Pressable
              key={opt.playerId}
              style={styles.optionButton}
              onPress={() => engine.resolveDisqualification(opt.playerId)}
            >
              <Text style={styles.optionButtonText}>
                #{opt.jersey} {opt.name}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.smallButton} onPress={() => engine.resolveDisqualification(null)}>
            <Text style={styles.smallButtonText}>Later</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#f0f0f3", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#ddd" },
  // Fix Round 2, B3: floats over the bottom of the grid area instead of
  // pushing it up. maxHeight caps how much of the grid it can ever cover,
  // so on-court players (pinned to the top, A6) stay visible even with an
  // unusually long bench-options list.
  overlayBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "60%",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#ddd",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  idleText: { color: "#999", fontSize: 12 },
  messageBar: { backgroundColor: "#fde9c8", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  messageText: { color: "#7a4a00", flex: 1, fontSize: 13 },
  promptBar: { backgroundColor: "#fde9c8" },
  promptText: { color: "#7a4a00", fontWeight: "600", marginBottom: 6 },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  optionButton: { backgroundColor: "#1a1a2e", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  optionButtonText: { color: "white", fontWeight: "600", fontSize: 12 },
  smallButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: "#ddd" },
  cancelButton: { backgroundColor: "#eee" },
  smallButtonText: { fontWeight: "600", fontSize: 12, color: "#333" },
});
