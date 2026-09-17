import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CachedGameBundle } from "../db/localDb";

/** Pre-game step 3 (spec 6.13): the tracker sets the starting five for each team. */
export function LineupSetupScreen({
  bundle,
  onStart,
}: {
  bundle: CachedGameBundle;
  onStart: (homeFive: string[], awayFive: string[]) => void;
}) {
  const insets = useSafeAreaInsets();
  const game = bundle.game as { home_team_id: string; away_team_id: string };
  const homeTeam = bundle.homeTeam as { name: string };
  const awayTeam = bundle.awayTeam as { name: string };
  const [homeFive, setHomeFive] = useState<string[]>([]);
  const [awayFive, setAwayFive] = useState<string[]>([]);

  const toggle = (list: string[], setList: (v: string[]) => void, playerId: string) => {
    if (list.includes(playerId)) {
      setList(list.filter((id) => id !== playerId));
    } else if (list.length < 5) {
      setList([...list, playerId]);
    }
  };

  const ready = homeFive.length === 5 && awayFive.length === 5;

  return (
    <View
      style={[
        styles.container,
        // Fix Round 2, B1: paddingTop was missing here too — see GameListScreen.
        {
          paddingTop: 24 + insets.top,
          paddingBottom: 24 + insets.bottom,
          paddingLeft: 24 + insets.left,
          paddingRight: 24 + insets.right,
        },
      ]}
    >
      <Text style={styles.title}>Set starting lineups</Text>
      {/* style={{flex:1}} bounds this row's height to the space between the
          title and the Start button; without it a ScrollView sizes itself to
          its content instead of the available space, so nothing below ever
          becomes scrollable — on a short landscape phone screen that left
          most of the roster completely unreachable. contentContainerStyle's
          flexGrow:1 then lets that bounded height reach each TeamPicker's own
          vertical ScrollView. */}
      <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, gap: 24 }}>
        <TeamPicker
          name={homeTeam.name}
          playerIds={bundle.rosterByTeam[game.home_team_id] ?? []}
          players={bundle.players}
          jerseys={bundle.jerseyByPlayer}
          selected={homeFive}
          onToggle={(id) => toggle(homeFive, setHomeFive, id)}
        />
        <TeamPicker
          name={awayTeam.name}
          playerIds={bundle.rosterByTeam[game.away_team_id] ?? []}
          players={bundle.players}
          jerseys={bundle.jerseyByPlayer}
          selected={awayFive}
          onToggle={(id) => toggle(awayFive, setAwayFive, id)}
        />
      </ScrollView>
      <Pressable
        style={[styles.startButton, !ready && styles.startButtonDisabled]}
        disabled={!ready}
        onPress={() => onStart(homeFive, awayFive)}
      >
        <Text style={styles.startButtonText}>Start game</Text>
      </Pressable>
    </View>
  );
}

function TeamPicker({
  name,
  playerIds,
  players,
  jerseys,
  selected,
  onToggle,
}: {
  name: string;
  playerIds: string[];
  players: Record<string, unknown>;
  jerseys: Record<string, string>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View style={{ minWidth: 260, flex: 1 }}>
      <Text style={styles.teamName}>
        {name} ({selected.length}/5)
      </Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator>
        {playerIds.map((id) => {
          const player = players[id] as { nickname: string } | undefined;
          const isSelected = selected.includes(id);
          return (
            <Pressable
              key={id}
              style={[styles.playerRow, isSelected && styles.playerRowSelected]}
              onPress={() => onToggle(id)}
            >
              <Text style={styles.jersey}>{jerseys[id]}</Text>
              <Text style={styles.playerName}>{player?.nickname}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#f5f5f7" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  teamName: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  playerRow: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e2e6",
    marginBottom: 6,
    backgroundColor: "white",
  },
  playerRowSelected: { backgroundColor: "#fde9c8", borderColor: "#f5a623" },
  jersey: { width: 24, color: "#666" },
  playerName: { fontWeight: "500" },
  startButton: { marginTop: 16, backgroundColor: "#1a8f4c", borderRadius: 10, padding: 16, alignItems: "center" },
  startButtonDisabled: { backgroundColor: "#aaa" },
  startButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
