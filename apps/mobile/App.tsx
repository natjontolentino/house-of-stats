import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import { useFonts, RobotoCondensed_400Regular, RobotoCondensed_700Bold } from "@expo-google-fonts/roboto-condensed";
import { GameListScreen } from "./src/screens/GameListScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { LineupSetupScreen } from "./src/screens/LineupSetupScreen";
import { TrackerScreen } from "./src/screens/TrackerScreen";
import { CompanionClockScreen } from "./src/screens/CompanionClockScreen";
import { downloadAndClaimGame, createPracticeGameBundle } from "./src/sync/downloadBundle";
import { getCachedGameBundle, getEventsForGame, type CachedGameBundle } from "./src/db/localDb";
import { loadSession, clearSession, type LeagueSession } from "./src/auth/session";
import { setGridFontsReady } from "./src/state/gridTheme";
import { SEED_GAMES } from "@courtstats/shared";

type Screen =
  | { name: "list" }
  | { name: "loading" }
  | { name: "lineup"; gameId: string; bundle: CachedGameBundle }
  | { name: "tracking"; gameId: string; bundle: CachedGameBundle; startingLineups?: { home: string[]; away: string[] } }
  | { name: "companion"; gameId: string };

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

function AppInner() {
  const [screen, setScreen] = useState<Screen>({ name: "list" });
  // undefined = still checking SecureStore; null = not logged into any league.
  const [session, setSession] = useState<LeagueSession | null | undefined>(undefined);

  useEffect(() => {
    loadSession().then((s) => setSession(s));
  }, []);

  // Fix C1: the grid needs a condensed/neutral sans with tabular numerals,
  // not the platform default — loaded once here, gating render until ready
  // so no screen ever briefly flashes the wrong face.
  const [fontsLoaded] = useFonts({ RobotoCondensed_400Regular, RobotoCondensed_700Bold });
  useEffect(() => {
    setGridFontsReady(fontsLoaded);
  }, [fontsLoaded]);

  if (!fontsLoaded || session === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (session === null) {
    return (
      <View style={styles.root}>
        <LoginScreen onLoggedIn={setSession} />
        <StatusBar style="dark" />
      </View>
    );
  }

  const logout = async () => {
    await clearSession();
    setSession(null);
    setScreen({ name: "list" });
  };

  const openGame = async (gameId: string) => {
    setScreen({ name: "loading" });
    try {
      const bundle = await downloadAndClaimGame(gameId, session.deviceId);
      const gameStatus = (bundle.game as { status: string }).status;
      if (gameStatus === "in_progress") {
        setScreen({ name: "tracking", gameId, bundle });
      } else {
        setScreen({ name: "lineup", gameId, bundle });
      }
    } catch {
      const cached = await getCachedGameBundle(gameId);
      if (cached) {
        // Airplane mode resume (spec principle 1, 6.13): the cached game row
        // can be stale (it may still say "scheduled" if the device never
        // reconnected after the first claim), so local events — not the
        // cached status — are the authoritative sign the game already started.
        const existingEvents = await getEventsForGame(gameId);
        if (existingEvents.length > 0) {
          setScreen({ name: "tracking", gameId, bundle: cached });
        } else {
          setScreen({ name: "lineup", gameId, bundle: cached });
        }
      } else {
        Alert.alert("Couldn't open game", "Connect once to download this game before tracking it offline.");
        setScreen({ name: "list" });
      }
    }
  };

  const startPractice = async () => {
    setScreen({ name: "loading" });
    try {
      const practiceGameId = `practice-${Crypto.randomUUID()}`;
      const bundle = await createPracticeGameBundle(SEED_GAMES[0].id, practiceGameId);
      setScreen({ name: "lineup", gameId: practiceGameId, bundle });
    } catch {
      Alert.alert("Couldn't start practice", "Connect once to download rosters before practicing offline.");
      setScreen({ name: "list" });
    }
  };

  if (screen.name === "list") {
    return (
      <View style={styles.root}>
        <GameListScreen
          leagueId={session.leagueId}
          leagueName={session.leagueName}
          onSelectGame={openGame}
          onStartPractice={startPractice}
          onOpenCompanionClock={(gameId) => setScreen({ name: "companion", gameId })}
          onLogout={logout}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (screen.name === "companion") {
    return (
      <View style={styles.root}>
        <CompanionClockScreen
          gameId={screen.gameId}
          periodLengthMs={10 * 60_000}
          onClose={() => setScreen({ name: "list" })}
        />
        <StatusBar style="light" />
      </View>
    );
  }

  if (screen.name === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading game…</Text>
      </View>
    );
  }

  if (screen.name === "lineup") {
    return (
      <View style={styles.root}>
        <LineupSetupScreen
          bundle={screen.bundle}
          onStart={(homeFive, awayFive) =>
            setScreen({
              name: "tracking",
              gameId: screen.gameId,
              bundle: screen.bundle,
              startingLineups: { home: homeFive, away: awayFive },
            })
          }
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* TrackerScreen owns its own StatusBar (hidden — spec fix B4's
          immersive mode); rendering another one here would conflict. */}
      <TrackerScreen
        gameId={screen.gameId}
        bundle={screen.bundle}
        deviceId={session.deviceId}
        startingLineups={screen.startingLineups}
        onDone={() => setScreen({ name: "list" })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f7" },
});
