import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import type { CachedGameBundle } from "../db/localDb";
import type { GameEngine } from "../state/useGameEngine";
import { computeValidationWarnings, filterVoidedEvents } from "@courtstats/shared";

/** Post-game review (spec 6.13 steps 2-3, 6.14 validation warnings). */
export function ReviewScreen({
  bundle,
  engine,
  onBackToTracking,
  onFinalized,
}: {
  bundle: CachedGameBundle;
  engine: GameEngine;
  onBackToTracking: () => void;
  onFinalized: () => void;
}) {
  const liveState = engine.liveState!;
  const game = bundle.game as { home_team_id: string; away_team_id: string };
  const homeTeam = bundle.homeTeam as { name: string };
  const awayTeam = bundle.awayTeam as { name: string };
  const settings = bundle.settings;

  const [signed, setSigned] = useState({ home: false, away: false, referee: false });
  const [confirming, setConfirming] = useState(false);

  const warnings = useMemo(
    () =>
      computeValidationWarnings({
        events: filterVoidedEvents(engine.events),
        players: liveState.players,
        teams: liveState.teams,
        periodsPlayed: liveState.currentPeriod,
      }),
    [engine.events, liveState],
  );

  const needsSignatures = settings.signature_capture_at_finalize;
  const canConfirm = !needsSignatures || (signed.home && signed.away && signed.referee);

  const confirm = async () => {
    setConfirming(true);
    await engine.finalize();
    setConfirming(false);
    Alert.alert("Game finalized", "The box score is now locked. Further edits require reopening it.", [
      { text: "OK", onPress: onFinalized },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Review — {awayTeam.name} @ {homeTeam.name}</Text>
      <Text style={styles.finalScore}>
        {liveState.away.score} — {liveState.home.score}
      </Text>

      {warnings.length > 0 && (
        <View style={styles.warningsBox}>
          <Text style={styles.warningsTitle}>Validation warnings (non-blocking)</Text>
          {warnings.map((w, i) => (
            <Text key={i} style={styles.warningText}>
              • {w.message}
            </Text>
          ))}
        </View>
      )}

      {[
        [game.away_team_id, awayTeam.name],
        [game.home_team_id, homeTeam.name],
      ].map(([teamId, name]) => (
        <View key={teamId} style={{ marginTop: 16 }}>
          <Text style={styles.teamName}>{name}</Text>
          {(bundle.rosterByTeam[teamId] ?? []).map((playerId) => {
            const p = liveState.players[playerId];
            const player = bundle.players[playerId] as { nickname: string };
            if (!p) return null;
            return (
              <View key={playerId} style={styles.playerRow}>
                <Text style={styles.playerName}>{player.nickname}</Text>
                <Text style={styles.playerStats}>
                  {p.points} PTS · {p.reboundsTotal} REB · {p.assists} AST · {p.personalFouls} PF
                </Text>
              </View>
            );
          })}
        </View>
      ))}

      {needsSignatures && (
        <View style={styles.signatureBox}>
          <Text style={styles.teamName}>Signatures</Text>
          {(["home", "away", "referee"] as const).map((who) => (
            <Pressable
              key={who}
              style={styles.signRow}
              onPress={() => setSigned((s) => ({ ...s, [who]: !s[who] }))}
            >
              <Text style={styles.signLabel}>{who === "home" ? "Home coach" : who === "away" ? "Away coach" : "Referee"}</Text>
              <Text style={styles.signStatus}>{signed[who] ? "Signed ✓" : "Tap to sign"}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.actionsRow}>
        <Pressable style={styles.backButton} onPress={onBackToTracking}>
          <Text style={styles.backButtonText}>Continue tracking</Text>
        </Pressable>
        <Pressable
          style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
          disabled={!canConfirm || confirming}
          onPress={confirm}
        >
          <Text style={styles.confirmButtonText}>{confirming ? "Finalizing…" : "Confirm & finalize"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  title: { fontSize: 18, fontWeight: "700" },
  finalScore: { fontSize: 32, fontWeight: "800", marginVertical: 8 },
  warningsBox: { backgroundColor: "#fde9c8", padding: 12, borderRadius: 8, marginTop: 8 },
  warningsTitle: { fontWeight: "700", marginBottom: 4, color: "#7a4a00" },
  warningText: { color: "#7a4a00", fontSize: 13 },
  teamName: { fontWeight: "700", fontSize: 15, marginBottom: 6 },
  playerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderColor: "#eee" },
  playerName: { fontSize: 13 },
  playerStats: { fontSize: 12, color: "#666" },
  signatureBox: { marginTop: 20 },
  signRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderColor: "#eee" },
  signLabel: { fontSize: 14 },
  signStatus: { fontSize: 13, color: "#1a8f4c", fontWeight: "600" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 24, marginBottom: 40 },
  backButton: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: "#eee", alignItems: "center" },
  backButtonText: { fontWeight: "700" },
  confirmButton: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: "#1a8f4c", alignItems: "center" },
  confirmButtonDisabled: { backgroundColor: "#aaa" },
  confirmButtonText: { color: "white", fontWeight: "700" },
});
