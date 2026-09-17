import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import type { CachedGameBundle } from "../db/localDb";
import { useGameEngine } from "../state/useGameEngine";
import { TopBar } from "../components/TopBar";
import { TeamGrid } from "../components/TeamGrid";
import { TeamFoulAndTimeoutBar } from "../components/TeamFoulAndTimeoutBar";
import { PromptBar } from "../components/PromptBar";
import { LastActionsLine } from "../components/LastActionsLine";
import { MinutesPeekPanel } from "../components/MinutesPeekPanel";
import { ReviewScreen } from "./ReviewScreen";
import { isPracticeGameId } from "../state/practiceMode";

const TABLET_BREAKPOINT = 900;

export function TrackerScreen({
  gameId,
  bundle,
  deviceId,
  startingLineups,
  onDone,
}: {
  gameId: string;
  bundle: CachedGameBundle;
  deviceId: string;
  startingLineups?: { home: string[]; away: string[] };
  onDone: () => void;
}) {
  useKeepAwake(); // spec 6.1: screen must stay awake while a game is open
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [activeSide, setActiveSide] = useState<"home" | "away">("home");
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const engine = useGameEngine(gameId, bundle, deviceId);
  const game = bundle.game as { home_team_id: string; away_team_id: string };
  const homeTeam = bundle.homeTeam as { name: string };
  const awayTeam = bundle.awayTeam as { name: string };

  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current && startingLineups && engine.loaded && engine.events.length === 0) {
      startedRef.current = true;
      engine.startGame(startingLineups.home, startingLineups.away);
    }
  }, [startingLineups, engine.loaded, engine.events.length, engine]);

  if (!engine.loaded || !engine.liveState) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (reviewing) {
    return (
      <ReviewScreen
        bundle={bundle}
        engine={engine}
        onBackToTracking={() => setReviewing(false)}
        onFinalized={onDone}
      />
    );
  }

  return (
    <View style={styles.container}>
      <TopBar bundle={bundle} engine={engine} />

      {isTablet ? (
        <View style={styles.gridsRow}>
          <TeamGrid bundle={bundle} teamId={game.home_team_id} engine={engine} pinOnCourtFirst={false} />
          <TeamGrid bundle={bundle} teamId={game.away_team_id} engine={engine} pinOnCourtFirst={false} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleButton, activeSide === "home" && styles.toggleButtonActive]}
              onPress={() => setActiveSide("home")}
            >
              <Text style={styles.toggleText}>{homeTeam.name}</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, activeSide === "away" && styles.toggleButtonActive]}
              onPress={() => setActiveSide("away")}
            >
              <Text style={styles.toggleText}>{awayTeam.name}</Text>
            </Pressable>
          </View>
          <TeamGrid
            bundle={bundle}
            teamId={activeSide === "home" ? game.home_team_id : game.away_team_id}
            engine={engine}
            pinOnCourtFirst
          />
        </View>
      )}

      <View style={styles.foulsRow}>
        <TeamFoulAndTimeoutBar teamId={game.home_team_id} teamName={homeTeam.name} engine={engine} side="home" align="left" />
        <TeamFoulAndTimeoutBar teamId={game.away_team_id} teamName={awayTeam.name} engine={engine} side="away" align="right" />
      </View>

      <PromptBar engine={engine} />

      <View style={styles.bottomRow}>
        <LastActionsLine bundle={bundle} events={engine.liveState.lastActions} />
        <View style={styles.bottomButtons}>
          <SyncBadge status={engine.syncStatus} pendingCount={engine.pendingCount} isPractice={isPracticeGameId(gameId)} />
          <Pressable style={styles.minutesButton} onPress={() => setMinutesOpen(true)}>
            <Text style={styles.minutesButtonText}>Minutes</Text>
          </Pressable>
          <Pressable style={styles.endGameButton} onPress={() => setReviewing(true)}>
            <Text style={styles.endGameButtonText}>End game</Text>
          </Pressable>
        </View>
      </View>

      <MinutesPeekPanel visible={minutesOpen} onClose={() => setMinutesOpen(false)} bundle={bundle} engine={engine} />
    </View>
  );
}

function SyncBadge({
  status,
  pendingCount,
  isPractice,
}: {
  status: string;
  pendingCount: number;
  isPractice: boolean;
}) {
  if (isPractice) {
    return (
      <View style={[styles.syncBadge, { backgroundColor: "#666" }]}>
        <Text style={styles.syncBadgeText}>Practice — not synced</Text>
      </View>
    );
  }
  // spec 7.4: "a small, honest sync indicator: synced, pending count, or
  // offline" — show the actual count, not just a generic "syncing" word.
  const label =
    status === "offline"
      ? pendingCount > 0
        ? `Offline — ${pendingCount} pending`
        : "Offline"
      : pendingCount > 0
        ? `${pendingCount} pending`
        : "Synced";
  const color = status === "offline" ? "#b8790a" : "#1a8f4c";
  return (
    <View style={[styles.syncBadge, { backgroundColor: color }]}>
      <Text style={styles.syncBadgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  gridsRow: { flex: 1, flexDirection: "row" },
  toggleRow: { flexDirection: "row" },
  toggleButton: { flex: 1, padding: 10, alignItems: "center", backgroundColor: "#eee" },
  toggleButtonActive: { backgroundColor: "#1a1a2e" },
  toggleText: { fontWeight: "700", color: "#333" },
  foulsRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 6, gap: 16 },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  bottomButtons: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  syncBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  syncBadgeText: { color: "white", fontSize: 10, fontWeight: "700" },
  minutesButton: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#eee", borderRadius: 6 },
  minutesButtonText: { fontSize: 12, fontWeight: "600" },
  endGameButton: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#d0021b", borderRadius: 6 },
  endGameButtonText: { fontSize: 12, fontWeight: "700", color: "white" },
});
