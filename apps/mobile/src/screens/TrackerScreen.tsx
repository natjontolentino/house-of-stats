import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CachedGameBundle } from "../db/localDb";
import { useGameEngine } from "../state/useGameEngine";
import { TopBar } from "../components/TopBar";
import { TeamGridHeader, TeamGridRows } from "../components/TeamGrid";
import { TeamFoulAndTimeoutBar, CompactTeamFoulAndTimeoutBar } from "../components/TeamFoulAndTimeoutBar";
import { PromptBar, PromptOverlay } from "../components/PromptBar";
import { LastActionsLine } from "../components/LastActionsLine";
import { MinutesPeekPanel } from "../components/MinutesPeekPanel";
import { ReviewScreen } from "./ReviewScreen";
import { isPracticeGameId } from "../state/practiceMode";
import { teamShortLabel } from "../state/teamDisplay";

const TABLET_BREAKPOINT = 900;

export function TrackerScreen({
  gameId,
  bundle,
  deviceId,
  deviceToken,
  startingLineups,
  onDone,
}: {
  gameId: string;
  bundle: CachedGameBundle;
  deviceId: string;
  deviceToken: string;
  startingLineups?: { home: string[]; away: string[] };
  onDone: () => void;
}) {
  useKeepAwake(); // spec 6.1: screen must stay awake while a game is open
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [activeSide, setActiveSide] = useState<"home" | "away">("home");
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const engine = useGameEngine(gameId, bundle, deviceId, deviceToken);
  const game = bundle.game as { home_team_id: string; away_team_id: string };
  const homeTeam = bundle.homeTeam as { name: string; short_name: string };
  const awayTeam = bundle.awayTeam as { name: string; short_name: string };

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
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      {/* Fix B4: immersive while a game is open so a notification banner
          can't drop over the grid mid-possession; restored on other screens. */}
      <StatusBar hidden style="light" />
      <TopBar
        bundle={bundle}
        engine={engine}
        isTablet={isTablet}
        activeSide={activeSide}
        onSelectSide={setActiveSide}
      />

      {/* position:'relative' anchors PromptOverlay (Fix Round 2, B3) to the
          bottom of just this area, so a tall prompt covers grid rows instead
          of ever resizing this flex:1 region and starving the ScrollView. */}
      <View style={{ flex: 1, position: "relative" }}>
        {isTablet ? (
          <View style={styles.tabletGridArea}>
            <View style={styles.gridsRow}>
              <View style={styles.gridColumn}>
                <TeamGridHeader teamId={game.home_team_id} engine={engine} />
              </View>
              <View style={styles.gridColumn}>
                <TeamGridHeader teamId={game.away_team_id} engine={engine} />
              </View>
            </View>
            {/* Fix A2: one shared ScrollView for both teams — they can never
                reach different scroll offsets, and the headers above never
                scroll at all. */}
            <ScrollView style={{ flex: 1 }}>
              <View style={styles.gridsRow}>
                <View style={styles.gridColumn}>
                  <TeamGridRows bundle={bundle} teamId={game.home_team_id} engine={engine} pinOnCourtFirst={false} />
                </View>
                <View style={styles.gridColumn}>
                  <TeamGridRows bundle={bundle} teamId={game.away_team_id} engine={engine} pinOnCourtFirst={false} />
                </View>
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Fix Round 2, A3: the separate toggle tab row is gone — tapping
                a team's score in TopBar now switches the active side, which
                reclaims a full row of phone height at no functional cost. */}
            <TeamGridHeader teamId={activeSide === "home" ? game.home_team_id : game.away_team_id} engine={engine} />
            <ScrollView style={{ flex: 1 }}>
              <TeamGridRows
                bundle={bundle}
                teamId={activeSide === "home" ? game.home_team_id : game.away_team_id}
                engine={engine}
                pinOnCourtFirst
              />
            </ScrollView>
          </View>
        )}

        <PromptOverlay engine={engine} />
      </View>

      {isTablet ? (
        <View style={styles.foulsRow}>
          <TeamFoulAndTimeoutBar
            teamId={game.home_team_id}
            teamName={teamShortLabel(homeTeam)}
            engine={engine}
            side="home"
            align="left"
            settings={bundle.settings}
          />
          <TeamFoulAndTimeoutBar
            teamId={game.away_team_id}
            teamName={teamShortLabel(awayTeam)}
            engine={engine}
            side="away"
            align="right"
            settings={bundle.settings}
          />
        </View>
      ) : (
        // Fix Round 2, A4: only the active team's fouls/timeouts on phone —
        // the opponent's foul count already rides beside their score in
        // TopBar, and their timeout boxes are reachable by switching teams.
        <CompactTeamFoulAndTimeoutBar
          teamId={activeSide === "home" ? game.home_team_id : game.away_team_id}
          engine={engine}
          side={activeSide}
          settings={bundle.settings}
        />
      )}

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
  tabletGridArea: { flex: 1 },
  gridsRow: { flexDirection: "row" },
  gridColumn: { flex: 1, minWidth: 0 },
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
