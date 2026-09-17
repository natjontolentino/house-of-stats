import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CachedGameBundle } from "../db/localDb";
import type { GameEngine } from "../state/useGameEngine";
import { computeValidationWarnings, filterVoidedEvents, computeTeamTotalsFromPlayers, type PlayerBoxLine, type TeamBoxLine } from "@courtstats/shared";
import { colJersey, colName, colNarrow } from "../components/gridColumns";
import { gridFont } from "../state/gridTheme";

/**
 * Fix Round 1, B5: the review screen is the last chance to catch an error
 * before the game locks, so it must show the same full box score as the
 * tracker grid (spec 6.13) — not just PTS/REB/AST/PF. Read-only, same
 * column layout as TeamGrid for consistency.
 */
function FullBoxScoreTable({
  bundle,
  teamId,
  players,
  teamLine,
}: {
  bundle: CachedGameBundle;
  teamId: string;
  players: Record<string, PlayerBoxLine>;
  teamLine: TeamBoxLine;
}) {
  const roster = bundle.rosterByTeam[teamId] ?? [];
  const totals = computeTeamTotalsFromPlayers(teamId, players, teamLine);
  const f = { fontFamily: gridFont() };
  const fb = { fontFamily: gridFont(true) };

  return (
    <View style={boxStyles.table}>
      <View style={boxStyles.headerRow}>
        <Text style={[boxStyles.headerCell, colJersey]}>#</Text>
        <Text style={[boxStyles.headerCell, colName, { textAlign: "left" }]}>Name</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>PTS</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>2PT</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>3PT</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>FT</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>REB</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>AST</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>STL</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>BLK</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>TO</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>PF</Text>
        <Text style={[boxStyles.headerCell, colNarrow]}>W/T</Text>
      </View>

      {roster.map((playerId) => {
        const p = players[playerId];
        const player = bundle.players[playerId] as { nickname: string };
        if (!p) return null;
        return (
          <View key={playerId} style={boxStyles.row}>
            <Text style={[boxStyles.cell, colJersey, f]}>{bundle.jerseyByPlayer[playerId]}</Text>
            <Text style={[boxStyles.cell, colName, boxStyles.name, f]} numberOfLines={1}>
              {player?.nickname ?? "?"}
            </Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>{p.points}</Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>
              {p.twoPointMade}/{p.twoPointAttempted}
            </Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>
              {p.threePointMade}/{p.threePointAttempted}
            </Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>
              {p.ftMade}/{p.ftAttempted}
            </Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>{p.reboundsTotal}</Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>{p.assists}</Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>{p.steals}</Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>{p.blocks}</Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>{p.turnovers}</Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>{p.personalFouls}</Text>
            <Text style={[boxStyles.cell, colNarrow, f]}>{p.wtLabel}</Text>
          </View>
        );
      })}

      <View style={[boxStyles.row, boxStyles.teamRow]}>
        <Text style={[boxStyles.cell, colJersey]}></Text>
        <Text style={[boxStyles.cell, colName, boxStyles.name, f]}>Team</Text>
        <Text style={[boxStyles.cell, colNarrow]}></Text>
        <Text style={[boxStyles.cell, colNarrow]}></Text>
        <Text style={[boxStyles.cell, colNarrow]}></Text>
        <Text style={[boxStyles.cell, colNarrow]}></Text>
        <Text style={[boxStyles.cell, colNarrow, f]}>
          {teamLine.reboundsOffensive}/{teamLine.reboundsDefensive}
        </Text>
        <Text style={[boxStyles.cell, colNarrow]}></Text>
        <Text style={[boxStyles.cell, colNarrow]}></Text>
        <Text style={[boxStyles.cell, colNarrow]}></Text>
        <Text style={[boxStyles.cell, colNarrow, f]}>{teamLine.turnovers}</Text>
        <Text style={[boxStyles.cell, colNarrow]}></Text>
        <Text style={[boxStyles.cell, colNarrow, f]}>{teamLine.benchWtLabel}</Text>
      </View>

      <View style={[boxStyles.row, boxStyles.totalsRow]}>
        <Text style={[boxStyles.cell, colJersey]}></Text>
        <Text style={[boxStyles.cell, colName, boxStyles.name, fb]}>Totals</Text>
        <Text style={[boxStyles.cell, colNarrow, fb]}>{totals.points}</Text>
        <Text style={[boxStyles.cell, colNarrow, fb]}>
          {totals.fieldGoalMade - totals.threePointMade}/{totals.fieldGoalAttempted - totals.threePointAttempted}
        </Text>
        <Text style={[boxStyles.cell, colNarrow, fb]}>
          {totals.threePointMade}/{totals.threePointAttempted}
        </Text>
        <Text style={[boxStyles.cell, colNarrow, fb]}>
          {totals.ftMade}/{totals.ftAttempted}
        </Text>
        <Text style={[boxStyles.cell, colNarrow, fb]}>{totals.reboundsOffensive + totals.reboundsDefensive}</Text>
        <Text style={[boxStyles.cell, colNarrow, fb]}>{totals.assists}</Text>
        <Text style={[boxStyles.cell, colNarrow, fb]}>{totals.steals}</Text>
        <Text style={[boxStyles.cell, colNarrow, fb]}>{totals.blocks}</Text>
        <Text style={[boxStyles.cell, colNarrow, fb]}>{totals.turnovers}</Text>
        <Text style={[boxStyles.cell, colNarrow, fb]}>{totals.personalFouls}</Text>
        <Text style={[boxStyles.cell, colNarrow]}></Text>
      </View>
    </View>
  );
}

const boxStyles = StyleSheet.create({
  table: { marginTop: 8 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#ccc", paddingBottom: 4 },
  headerCell: { textAlign: "center", fontSize: 10, fontWeight: "700", color: "#666", textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 4, borderBottomWidth: 1, borderColor: "#eee" },
  teamRow: { backgroundColor: "#f3f3f6" },
  totalsRow: { backgroundColor: "#eaeaf0" },
  cell: { textAlign: "center", fontSize: 12, fontVariant: ["tabular-nums"] },
  name: { textAlign: "left", fontWeight: "600" },
});

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
  const insets = useSafeAreaInsets();
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: 20,
        // Fix Round 2, B1: only bottom/left/right were inset last round —
        // the review screen isn't immersive like the tracker, so its own
        // status bar was still drawing over the title/first player row.
        paddingTop: 20 + insets.top,
        paddingBottom: 20 + insets.bottom,
        paddingLeft: 20 + insets.left,
        paddingRight: 20 + insets.right,
      }}
    >
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

      {(
        [
          [game.away_team_id, awayTeam.name, liveState.teams[game.away_team_id]],
          [game.home_team_id, homeTeam.name, liveState.teams[game.home_team_id]],
        ] as const
      ).map(([teamId, name, teamLine]) => (
        <View key={teamId} style={{ marginTop: 16 }}>
          <Text style={styles.teamName}>{name}</Text>
          <FullBoxScoreTable bundle={bundle} teamId={teamId} players={liveState.players} teamLine={teamLine} />
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
