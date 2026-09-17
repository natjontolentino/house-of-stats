import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import type { CachedGameBundle } from "../db/localDb";
import type { GameEngine } from "../state/useGameEngine";
import { StatCellButton } from "./StatCellButton";
import { WtCell } from "./WtCell";

const PAIR_CELL_WIDTH = 28;

function sortByJersey(playerIds: string[], jerseys: Record<string, string>): string[] {
  return [...playerIds].sort((a, b) => {
    const na = parseInt(jerseys[a] ?? "0", 10);
    const nb = parseInt(jerseys[b] ?? "0", 10);
    return (Number.isNaN(na) ? 0 : na) - (Number.isNaN(nb) ? 0 : nb);
  });
}

export function TeamGrid({
  bundle,
  teamId,
  engine,
  pinOnCourtFirst,
}: {
  bundle: CachedGameBundle;
  teamId: string;
  engine: GameEngine;
  /** Phone layout pins on-court players to the top (spec 6.1); tablet keeps fixed jersey order. */
  pinOnCourtFirst: boolean;
}) {
  const liveState = engine.liveState!;
  const teamState = teamId === (bundle.game as { home_team_id: string }).home_team_id ? liveState.home : liveState.away;
  const roster = bundle.rosterByTeam[teamId] ?? [];
  const jerseys = bundle.jerseyByPlayer;

  let orderedIds = sortByJersey(roster, jerseys);
  if (pinOnCourtFirst) {
    const onCourtSet = new Set(teamState.onCourtPlayerIds);
    orderedIds = [...orderedIds.filter((id) => onCourtSet.has(id)), ...orderedIds.filter((id) => !onCourtSet.has(id))];
  }

  const highlightForTeam = (column: "AST" | "OREB" | "DREB") =>
    engine.highlight?.columns.some((c) => c.teamId === teamId && c.column === column) ?? false;

  return (
    <ScrollView style={styles.container}>
      {/* Group header row (spec 6.3: "2PT group", "3PT group", "FT group", "REB group, O and D", "FOULS group, PF and W/T"). */}
      <View style={styles.groupHeaderRow}>
        <Text style={{ width: 28 }} />
        <Text style={{ width: 110 }} />
        <Text style={{ width: 44 }} />
        <Text style={[styles.groupHeaderCell, { width: PAIR_CELL_WIDTH * 2 }]}>2PT</Text>
        <Text style={[styles.groupHeaderCell, { width: PAIR_CELL_WIDTH * 2 }]}>3PT</Text>
        <Text style={[styles.groupHeaderCell, { width: PAIR_CELL_WIDTH * 2 }]}>FT</Text>
        <Text style={[styles.groupHeaderCell, { width: PAIR_CELL_WIDTH * 2 }]}>REB</Text>
        <Text style={{ width: 44 * 3 }} />
        <Text style={[styles.groupHeaderCell, { width: PAIR_CELL_WIDTH * 2 }]}>FOULS</Text>
      </View>

      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { width: 28 }]}>#</Text>
        <Text style={[styles.headerCell, { width: 110, textAlign: "left" }]}>Name</Text>
        <Text style={styles.headerCell}>PTS</Text>
        <Text style={[styles.headerSubCell, { width: PAIR_CELL_WIDTH }]}>✓</Text>
        <Text style={[styles.headerSubCell, { width: PAIR_CELL_WIDTH }]}>✗</Text>
        <Text style={[styles.headerSubCell, { width: PAIR_CELL_WIDTH }]}>✓</Text>
        <Text style={[styles.headerSubCell, { width: PAIR_CELL_WIDTH }]}>✗</Text>
        <Text style={[styles.headerSubCell, { width: PAIR_CELL_WIDTH }]}>✓</Text>
        <Text style={[styles.headerSubCell, { width: PAIR_CELL_WIDTH }]}>✗</Text>
        <Text style={[styles.headerSubCell, { width: PAIR_CELL_WIDTH }, highlightForTeam("OREB") && styles.headerHighlight]}>O</Text>
        <Text style={[styles.headerSubCell, { width: PAIR_CELL_WIDTH }, highlightForTeam("DREB") && styles.headerHighlight]}>D</Text>
        <Text style={[styles.headerCell, highlightForTeam("AST") && styles.headerHighlight]}>AST</Text>
        <Text style={styles.headerCell}>STL</Text>
        <Text style={styles.headerCell}>BLK</Text>
        <Text style={styles.headerCell}>TO</Text>
        <Text style={[styles.headerSubCell, { width: PAIR_CELL_WIDTH }]}>PF</Text>
        <Text style={[styles.headerSubCell, { width: PAIR_CELL_WIDTH }]}>W/T</Text>
      </View>

      {orderedIds.map((playerId) => {
        const p = liveState.players[playerId];
        const player = bundle.players[playerId] as { nickname: string };
        if (!p) return null;
        const onCourt = teamState.onCourtPlayerIds.includes(playerId);
        const disqualified = teamState.disqualifiedPlayerIds.includes(playerId);
        const selected =
          engine.selectedNameForSwap?.teamId === teamId && engine.selectedNameForSwap?.playerId === playerId;

        return (
          <View key={playerId} style={[styles.row, !onCourt && styles.rowDim, selected && styles.rowSelected]}>
            <Text style={[styles.cellText, { width: 28 }]}>{jerseys[playerId]}</Text>
            <Pressable
              style={{ width: 110 }}
              onPress={() => engine.tapPlayerName(teamId, playerId)}
              onLongPress={() => {
                Alert.alert(player.nickname, "Player options", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Eject player",
                    style: "destructive",
                    onPress: () => engine.ejectPlayer(teamId, playerId, "manual"),
                  },
                ]);
              }}
            >
              <Text style={[styles.cellText, styles.nameText, selected && styles.nameSelected]} numberOfLines={1}>
                {player.nickname}
                {disqualified ? " ⛔" : ""}
              </Text>
            </Pressable>
            <Text style={styles.cellText}>{p.points}</Text>

            <StatCellButton
              value={p.twoPointMade}
              disabled={!onCourt}
              width={PAIR_CELL_WIDTH}
              onTap={() => engine.tapCell("2pt_made", teamId, playerId)}
              onLongPress={() => engine.longPressCell("2pt_made", teamId, playerId)}
            />
            <StatCellButton
              value={p.twoPointAttempted - p.twoPointMade}
              disabled={!onCourt}
              width={PAIR_CELL_WIDTH}
              onTap={() => engine.tapCell("2pt_missed", teamId, playerId)}
              onLongPress={() => engine.longPressCell("2pt_missed", teamId, playerId)}
            />
            <StatCellButton
              value={p.threePointMade}
              disabled={!onCourt}
              width={PAIR_CELL_WIDTH}
              onTap={() => engine.tapCell("3pt_made", teamId, playerId)}
              onLongPress={() => engine.longPressCell("3pt_made", teamId, playerId)}
            />
            <StatCellButton
              value={p.threePointAttempted - p.threePointMade}
              disabled={!onCourt}
              width={PAIR_CELL_WIDTH}
              onTap={() => engine.tapCell("3pt_missed", teamId, playerId)}
              onLongPress={() => engine.longPressCell("3pt_missed", teamId, playerId)}
            />
            <StatCellButton
              value={p.ftMade}
              disabled={!onCourt}
              width={PAIR_CELL_WIDTH}
              onTap={() => engine.tapCell("ft_made", teamId, playerId)}
              onLongPress={() => engine.longPressCell("ft_made", teamId, playerId)}
            />
            <StatCellButton
              value={p.ftAttempted - p.ftMade}
              disabled={!onCourt}
              width={PAIR_CELL_WIDTH}
              onTap={() => engine.tapCell("ft_missed", teamId, playerId)}
              onLongPress={() => engine.longPressCell("ft_missed", teamId, playerId)}
            />
            <StatCellButton
              value={p.reboundsOffensive}
              disabled={!onCourt}
              width={PAIR_CELL_WIDTH}
              highlighted={highlightForTeam("OREB")}
              onTap={() => engine.tapCell("reb_o", teamId, playerId)}
              onLongPress={() => engine.longPressCell("reb_o", teamId, playerId)}
            />
            <StatCellButton
              value={p.reboundsDefensive}
              disabled={!onCourt}
              width={PAIR_CELL_WIDTH}
              highlighted={highlightForTeam("DREB")}
              onTap={() => engine.tapCell("reb_d", teamId, playerId)}
              onLongPress={() => engine.longPressCell("reb_d", teamId, playerId)}
            />
            <StatCellButton
              value={p.assists}
              disabled={!onCourt}
              highlighted={highlightForTeam("AST")}
              onTap={() => engine.tapCell("ast", teamId, playerId)}
              onLongPress={() => engine.longPressCell("ast", teamId, playerId)}
            />
            <StatCellButton
              value={p.steals}
              disabled={!onCourt}
              onTap={() => engine.tapCell("stl", teamId, playerId)}
              onLongPress={() => engine.longPressCell("stl", teamId, playerId)}
            />
            <StatCellButton
              value={p.blocks}
              disabled={!onCourt}
              onTap={() => engine.tapCell("blk", teamId, playerId)}
              onLongPress={() => engine.longPressCell("blk", teamId, playerId)}
            />
            <StatCellButton
              value={p.turnovers}
              disabled={!onCourt}
              onTap={() => engine.tapCell("to", teamId, playerId)}
              onLongPress={() => engine.longPressCell("to", teamId, playerId)}
            />
            <StatCellButton
              value={p.personalFouls}
              disabled={!onCourt}
              width={PAIR_CELL_WIDTH}
              onTap={() => engine.tapCell("pf", teamId, playerId)}
              onLongPress={() => engine.longPressCell("pf", teamId, playerId)}
            />
            <WtCell
              level={p.wtLevel}
              label={p.wtLabel}
              width={PAIR_CELL_WIDTH}
              disabled={!onCourt}
              onTap={() => engine.tapWt(teamId, playerId)}
              onLongPress={() => engine.longPressWt(teamId, playerId)}
            />
          </View>
        );
      })}

      {/* Team row (spec 6.3): always editable, accepts O/D rebounds, turnovers, bench W/T only. */}
      <View style={[styles.row, styles.teamRow]}>
        <Text style={[styles.cellText, { width: 28 }]}></Text>
        <Text style={[styles.cellText, styles.nameText, { width: 110 }]}>Team</Text>
        <Text style={styles.cellText}></Text>
        <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}></Text>
        <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}></Text>
        <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}></Text>
        <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}></Text>
        <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}></Text>
        <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}></Text>
        <StatCellButton
          value={liveState.teams[teamId]?.reboundsOffensive ?? 0}
          width={PAIR_CELL_WIDTH}
          onTap={() => engine.tapCell("reb_o", teamId, null)}
          onLongPress={() => engine.longPressCell("reb_o", teamId, null)}
        />
        <StatCellButton
          value={liveState.teams[teamId]?.reboundsDefensive ?? 0}
          width={PAIR_CELL_WIDTH}
          onTap={() => engine.tapCell("reb_d", teamId, null)}
          onLongPress={() => engine.longPressCell("reb_d", teamId, null)}
        />
        <Text style={styles.cellText}></Text>
        <Text style={styles.cellText}></Text>
        <Text style={styles.cellText}></Text>
        <StatCellButton
          value={liveState.teams[teamId]?.turnovers ?? 0}
          onTap={() => engine.tapCell("to", teamId, null)}
          onLongPress={() => engine.longPressCell("to", teamId, null)}
        />
        <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}></Text>
        <WtCell
          level={liveState.teams[teamId]?.benchWtLevel ?? 0}
          label={liveState.teams[teamId]?.benchWtLabel ?? ""}
          width={PAIR_CELL_WIDTH}
          onTap={() => engine.tapWt(teamId, null)}
          onLongPress={() => engine.longPressWt(teamId, null)}
        />
      </View>

      {/* Totals row: read-only, updates live (spec 6.3). */}
      <TotalsRow bundle={bundle} teamId={teamId} engine={engine} />
    </ScrollView>
  );
}

function TotalsRow({
  bundle,
  teamId,
  engine,
}: {
  bundle: CachedGameBundle;
  teamId: string;
  engine: GameEngine;
}) {
  const liveState = engine.liveState!;
  const roster = bundle.rosterByTeam[teamId] ?? [];
  const teamLine = liveState.teams[teamId];
  const players = roster.map((id) => liveState.players[id]).filter(Boolean);
  const sum = (fn: (p: (typeof players)[number]) => number) => players.reduce((s, p) => s + fn(p), 0);

  return (
    <View style={[styles.row, styles.totalsRow]}>
      <Text style={[styles.cellText, { width: 28 }]}></Text>
      <Text style={[styles.cellText, styles.nameText, { width: 110 }]}>Totals</Text>
      <Text style={styles.cellText}>{teamLine?.score ?? 0}</Text>
      <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}>{sum((p) => p.twoPointMade)}</Text>
      <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}>{sum((p) => p.twoPointAttempted - p.twoPointMade)}</Text>
      <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}>{sum((p) => p.threePointMade)}</Text>
      <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}>
        {sum((p) => p.threePointAttempted - p.threePointMade)}
      </Text>
      <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}>{sum((p) => p.ftMade)}</Text>
      <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}>{sum((p) => p.ftAttempted - p.ftMade)}</Text>
      <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}>
        {sum((p) => p.reboundsOffensive) + (teamLine?.reboundsOffensive ?? 0)}
      </Text>
      <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}>
        {sum((p) => p.reboundsDefensive) + (teamLine?.reboundsDefensive ?? 0)}
      </Text>
      <Text style={styles.cellText}>{sum((p) => p.assists)}</Text>
      <Text style={styles.cellText}>{sum((p) => p.steals)}</Text>
      <Text style={styles.cellText}>{sum((p) => p.blocks)}</Text>
      <Text style={styles.cellText}>{sum((p) => p.turnovers) + (teamLine?.turnovers ?? 0)}</Text>
      <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}>{sum((p) => p.personalFouls)}</Text>
      <Text style={[styles.cellText, { width: PAIR_CELL_WIDTH }]}></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  groupHeaderRow: { flexDirection: "row", paddingTop: 4 },
  groupHeaderCell: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
  },
  headerRow: { flexDirection: "row", paddingBottom: 4, borderBottomWidth: 1, borderColor: "#ccc" },
  headerCell: { width: 44, textAlign: "center", fontSize: 10, fontWeight: "700", color: "#666", textTransform: "uppercase" },
  headerSubCell: { textAlign: "center", fontSize: 11, fontWeight: "700", color: "#666" },
  headerHighlight: { color: "#b8790a" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  rowDim: { opacity: 0.45 },
  rowSelected: { backgroundColor: "#fde9c8" },
  teamRow: { backgroundColor: "#f3f3f6" },
  totalsRow: { backgroundColor: "#eaeaf0" },
  cellText: { width: 44, textAlign: "center", fontSize: 13, fontVariant: ["tabular-nums"] },
  nameText: { textAlign: "left", fontWeight: "600" },
  nameSelected: { color: "#b8790a" },
});
