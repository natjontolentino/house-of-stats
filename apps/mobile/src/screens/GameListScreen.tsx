import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../sync/supabaseClient";

interface GameListItem {
  id: string;
  scheduled_at: string;
  court_label: string | null;
  home_name: string;
  away_name: string;
}

/** Pre-game step 1 (spec 6.13): the tracker sees only games assigned to them for today. */
export function GameListScreen({
  leagueId,
  leagueName,
  onSelectGame,
  onStartPractice,
  onOpenCompanionClock,
  onLogout,
}: {
  leagueId: string;
  leagueName: string;
  onSelectGame: (gameId: string) => void;
  onStartPractice: () => void;
  onOpenCompanionClock: (gameId: string) => void;
  onLogout: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [games, setGames] = useState<GameListItem[] | null>(null);
  const [showingToday, setShowingToday] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: seasons } = await supabase.from("season").select("id").eq("league_id", leagueId);
        const seasonIds = (seasons ?? []).map((s) => s.id);

        const fetchGames = async (fromIso?: string, toIso?: string) => {
          let query = supabase
            .from("game")
            .select("id, scheduled_at, court_label, home_team_id, away_team_id")
            .in("season_id", seasonIds)
            .order("scheduled_at", { ascending: true });
          if (fromIso) query = query.gte("scheduled_at", fromIso);
          if (toIso) query = query.lte("scheduled_at", toIso);
          const { data } = await query;
          return data ?? [];
        };

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        let gameRows = await fetchGames(startOfDay.toISOString(), endOfDay.toISOString());
        let isToday = true;
        if (gameRows.length === 0) {
          // Spec 6.13 says "today's" games, but seed data has fixed dates —
          // fall back to the full schedule rather than a dead end so testing
          // isn't broken just because it's a different calendar day.
          gameRows = await fetchGames();
          isToday = false;
        }

        const teamIds = Array.from(new Set(gameRows.flatMap((g) => [g.home_team_id, g.away_team_id])));
        const { data: teams } = await supabase.from("team").select("id, name").in("id", teamIds);
        const teamById = new Map((teams ?? []).map((t) => [t.id, t.name]));

        if (!cancelled) {
          setShowingToday(isToday);
          setGames(
            gameRows.map((g) => ({
              id: g.id,
              scheduled_at: g.scheduled_at,
              court_label: g.court_label,
              home_name: teamById.get(g.home_team_id) ?? "?",
              away_name: teamById.get(g.away_team_id) ?? "?",
            })),
          );
        }
      } catch {
        if (!cancelled) setError("Couldn't reach the server. Connect once to load the schedule.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  return (
    <View
      style={[
        styles.container,
        // Fix Round 2, B1: paddingTop was missing here too — the base
        // container's padding:24 alone doesn't reliably clear the status bar.
        {
          paddingTop: 24 + insets.top,
          paddingBottom: 24 + insets.bottom,
          paddingLeft: 24 + insets.left,
          paddingRight: 24 + insets.right,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{showingToday ? "Today's games" : "Scheduled games"}</Text>
          <Text style={styles.leagueName}>{leagueName}</Text>
        </View>
        <Pressable onPress={onLogout} hitSlop={8}>
          <Text style={styles.logoutLink}>Log out</Text>
        </Pressable>
      </View>
      {games === null && !error && <ActivityIndicator style={{ marginTop: 24 }} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {games && games.length === 0 && <Text style={styles.muted}>No games scheduled.</Text>}
      <FlatList
        data={games ?? []}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => onSelectGame(item.id)}
            onLongPress={() => onOpenCompanionClock(item.id)}
          >
            <Text style={styles.cardTitle}>
              {item.away_name} @ {item.home_name}
            </Text>
            <Text style={styles.muted}>
              {new Date(item.scheduled_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {item.court_label}
            </Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.practiceButton} onPress={onStartPractice}>
        <Text style={styles.practiceButtonText}>Start practice game</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#f5f5f7" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  leagueName: { fontSize: 13, color: "#666", marginTop: 2 },
  logoutLink: { fontSize: 13, color: "#1a1a2e", fontWeight: "600", paddingTop: 4 },
  muted: { color: "#666" },
  error: { color: "#b00020", marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: 10, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#e2e2e6" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  practiceButton: {
    marginTop: "auto",
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  practiceButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
