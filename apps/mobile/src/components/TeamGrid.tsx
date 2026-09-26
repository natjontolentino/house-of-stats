import { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import type { CachedGameBundle } from "../db/localDb";
import type { GameEngine } from "../state/useGameEngine";
import { StatCellButton } from "./StatCellButton";
import { WtCell } from "./WtCell";
import { gridFont } from "../state/gridTheme";
import { colJersey, colName, colNarrow, MIN_ROW_WIDTH } from "./gridColumns";

const colGroupSpan2 = { flexGrow: 2, flexShrink: 1, flexBasis: 64, minWidth: 48 };
const colGroupSpan4 = { flexGrow: 4, flexShrink: 1, flexBasis: 128, minWidth: 96 };

function sortByJersey(playerIds: string[], jerseys: Record<string, string>): string[] {
  return [...playerIds].sort((a, b) => {
    const na = parseInt(jerseys[a] ?? "0", 10);
    const nb = parseInt(jerseys[b] ?? "0", 10);
    return (Number.isNaN(na) ? 0 : na) - (Number.isNaN(nb) ? 0 : nb);
  });
}

/**
 * The fixed header (group labels + column labels) for one team's grid — spec
 * fix A2: rendered outside any ScrollView so it never scrolls out of view,
 * no matter how the shared body ScrollView (see TeamGridRows) is positioned.
 */
export function TeamGridHeader({ teamId, engine }: { teamId: string; engine: GameEngine }) {
  const liveState = engine.liveState!;
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const warnedRef = useRef(false);

  const highlightForTeam = (column: "AST" | "OREB" | "DREB") =>
    engine.highlight?.columns.some((c) => c.teamId === teamId && c.column === column) ?? false;

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setContainerWidth(w);
        // Fix A1: this must never be able to regress silently — if the
        // container is narrower than every column's own minimum can fit,
        // something (screen size assumptions, a column re-add) broke the
        // "no horizontal scrolling" requirement.
        if (__DEV__ && !warnedRef.current && w > 0 && w < MIN_ROW_WIDTH) {
          warnedRef.current = true;
          console.warn(
            `TeamGrid: container width (${Math.round(w)}px) is narrower than the grid's minimum (${MIN_ROW_WIDTH}px) — columns will overflow.`,
          );
        }
      }}
    >
      <View style={styles.groupHeaderRow}>
        <View style={colJersey} />
        <View style={colName} />
        <View style={colNarrow} />
        <Text style={[styles.groupHeaderCell, colGroupSpan2]}>2PT</Text>
        <Text style={[styles.groupHeaderCell, colGroupSpan2]}>3PT</Text>
        <Text style={[styles.groupHeaderCell, colGroupSpan2]}>FT</Text>
        <Text style={[styles.groupHeaderCell, colGroupSpan2]}>REB</Text>
        <View style={colGroupSpan4} />
        <Text style={[styles.groupHeaderCell, colGroupSpan2]}>FOULS</Text>
      </View>

      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, colJersey]}>#</Text>
        <Text style={[styles.headerCell, colName, { textAlign: "left" }]}>Name</Text>
        <Text style={[styles.headerCell, colNarrow]}>PTS</Text>
        <Text style={[styles.headerSubCell, colNarrow]}>✓</Text>
        <Text style={[styles.headerSubCell, colNarrow]}>✗</Text>
        <Text style={[styles.headerSubCell, colNarrow]}>✓</Text>
        <Text style={[styles.headerSubCell, colNarrow]}>✗</Text>
        <Text style={[styles.headerSubCell, colNarrow]}>✓</Text>
        <Text style={[styles.headerSubCell, colNarrow]}>✗</Text>
        <Text style={[styles.headerSubCell, colNarrow, highlightForTeam("OREB") && styles.headerHighlight]}>Off</Text>
        <Text style={[styles.headerSubCell, colNarrow, highlightForTeam("DREB") && styles.headerHighlight]}>Def</Text>
        <Text style={[styles.headerCell, colNarrow, highlightForTeam("AST") && styles.headerHighlight]}>AST</Text>
        <Text style={[styles.headerCell, colNarrow]}>STL</Text>
        <Text style={[styles.headerCell, colNarrow]}>BLK</Text>
        <Text style={[styles.headerCell, colNarrow]}>TO</Text>
        <Text style={[styles.headerSubCell, colNarrow]}>PF</Text>
        <Text style={[styles.headerSubCell, colNarrow]}>W/T</Text>
      </View>
    </View>
  );
}

/**
 * The scrollable body (player rows, Team row, Totals row) for one team's
 * grid. The caller is responsible for placing this inside a single
 * ScrollView shared by both teams (spec fix A2: the two tables must never
 * reach different scroll offsets).
 */
export function TeamGridRows({
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
    <View>
      {orderedIds.map((playerId) => {
        const p = liveState.players[playerId];
        const player = bundle.players[playerId] as { nickname: string };
        if (!p) return null;
        const onCourt = teamState.onCourtPlayerIds.includes(playerId);
        const disqualified = teamState.disqualifiedPlayerIds.includes(playerId);
        const selected =
          engine.selectedNameForSwap?.teamId === teamId && engine.selectedNameForSwap?.playerId === playerId;

        return (
          <View key={playerId} style={[styles.row, !onCourt && styles.rowDim]}>
            <Text style={[styles.cellText, colJersey, { fontFamily: gridFont() }]}>{jerseys[playerId]}</Text>
            <Pressable
              style={[colName, selected ? styles.nameSelectedBg : onCourt && styles.nameOnCourtBg]}
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
              <Text
                style={[styles.cellText, styles.nameText, { fontFamily: gridFont() }, selected && styles.nameSelected]}
                numberOfLines={1}
              >
                {player.nickname}
                {disqualified ? " ⛔" : ""}
              </Text>
            </Pressable>
            <Text style={[styles.cellText, colNarrow, { fontFamily: gridFont() }]}>{p.points}</Text>

            <StatCellButton
              value={p.twoPointMade}
              disabled={!onCourt}
              style={colNarrow}
              onTap={() => engine.tapCell("2pt_made", teamId, playerId)}
              onLongPress={() => engine.longPressCell("2pt_made", teamId, playerId)}
            />
            <StatCellButton
              value={p.twoPointAttempted - p.twoPointMade}
              disabled={!onCourt}
              style={colNarrow}
              onTap={() => engine.tapCell("2pt_missed", teamId, playerId)}
              onLongPress={() => engine.longPressCell("2pt_missed", teamId, playerId)}
            />
            <StatCellButton
              value={p.threePointMade}
              disabled={!onCourt}
              style={colNarrow}
              onTap={() => engine.tapCell("3pt_made", teamId, playerId)}
              onLongPress={() => engine.longPressCell("3pt_made", teamId, playerId)}
            />
            <StatCellButton
              value={p.threePointAttempted - p.threePointMade}
              disabled={!onCourt}
              style={colNarrow}
              onTap={() => engine.tapCell("3pt_missed", teamId, playerId)}
              onLongPress={() => engine.longPressCell("3pt_missed", teamId, playerId)}
            />
            <StatCellButton
              value={p.ftMade}
              disabled={!onCourt}
              style={colNarrow}
              onTap={() => engine.tapCell("ft_made", teamId, playerId)}
              onLongPress={() => engine.longPressCell("ft_made", teamId, playerId)}
            />
            <StatCellButton
              value={p.ftAttempted - p.ftMade}
              disabled={!onCourt}
              style={colNarrow}
              onTap={() => engine.tapCell("ft_missed", teamId, playerId)}
              onLongPress={() => engine.longPressCell("ft_missed", teamId, playerId)}
            />
            <StatCellButton
              value={p.reboundsOffensive}
              disabled={!onCourt}
              style={colNarrow}
              highlighted={highlightForTeam("OREB")}
              onTap={() => engine.tapCell("reb_o", teamId, playerId)}
              onLongPress={() => engine.longPressCell("reb_o", teamId, playerId)}
            />
            <StatCellButton
              value={p.reboundsDefensive}
              disabled={!onCourt}
              style={colNarrow}
              highlighted={highlightForTeam("DREB")}
              onTap={() => engine.tapCell("reb_d", teamId, playerId)}
              onLongPress={() => engine.longPressCell("reb_d", teamId, playerId)}
            />
            <StatCellButton
              value={p.assists}
              disabled={!onCourt}
              style={colNarrow}
              highlighted={highlightForTeam("AST")}
              onTap={() => engine.tapCell("ast", teamId, playerId)}
              onLongPress={() => engine.longPressCell("ast", teamId, playerId)}
            />
            <StatCellButton
              value={p.steals}
              disabled={!onCourt}
              style={colNarrow}
              onTap={() => engine.tapCell("stl", teamId, playerId)}
              onLongPress={() => engine.longPressCell("stl", teamId, playerId)}
            />
            <StatCellButton
              value={p.blocks}
              disabled={!onCourt}
              style={colNarrow}
              onTap={() => engine.tapCell("blk", teamId, playerId)}
              onLongPress={() => engine.longPressCell("blk", teamId, playerId)}
            />
            <StatCellButton
              value={p.turnovers}
              disabled={!onCourt}
              style={colNarrow}
              onTap={() => engine.tapCell("to", teamId, playerId)}
              onLongPress={() => engine.longPressCell("to", teamId, playerId)}
            />
            <StatCellButton
              value={p.personalFouls}
              disabled={!onCourt}
              style={colNarrow}
              onTap={() => engine.tapCell("pf", teamId, playerId)}
              onLongPress={() => engine.longPressCell("pf", teamId, playerId)}
            />
            <WtCell
              level={p.wtLevel}
              label={p.wtLabel}
              style={colNarrow}
              disabled={!onCourt}
              onTap={() => engine.tapWt(teamId, playerId)}
              onLongPress={() => engine.longPressWt(teamId, playerId)}
            />
          </View>
        );
      })}

      {/* Team row (spec 6.3): always editable, accepts O/D rebounds, turnovers, bench W/T only. */}
      <View style={[styles.row, styles.teamRow]}>
        <Text style={[styles.cellText, colJersey]}></Text>
        <Text style={[styles.cellText, styles.nameText, colName, { fontFamily: gridFont() }]}>Team</Text>
        <Text style={[styles.cellText, colNarrow]}></Text>
        <Text style={[styles.cellText, colNarrow]}></Text>
        <Text style={[styles.cellText, colNarrow]}></Text>
        <Text style={[styles.cellText, colNarrow]}></Text>
        <Text style={[styles.cellText, colNarrow]}></Text>
        <Text style={[styles.cellText, colNarrow]}></Text>
        <StatCellButton
          value={liveState.teams[teamId]?.reboundsOffensive ?? 0}
          style={colNarrow}
          onTap={() => engine.tapCell("reb_o", teamId, null)}
          onLongPress={() => engine.longPressCell("reb_o", teamId, null)}
        />
        <StatCellButton
          value={liveState.teams[teamId]?.reboundsDefensive ?? 0}
          style={colNarrow}
          onTap={() => engine.tapCell("reb_d", teamId, null)}
          onLongPress={() => engine.longPressCell("reb_d", teamId, null)}
        />
        <Text style={[styles.cellText, colNarrow]}></Text>
        <Text style={[styles.cellText, colNarrow]}></Text>
        <Text style={[styles.cellText, colNarrow]}></Text>
        <StatCellButton
          value={liveState.teams[teamId]?.turnovers ?? 0}
          style={colNarrow}
          onTap={() => engine.tapCell("to", teamId, null)}
          onLongPress={() => engine.longPressCell("to", teamId, null)}
        />
        <Text style={[styles.cellText, colNarrow]}></Text>
        <WtCell
          level={liveState.teams[teamId]?.benchWtLevel ?? 0}
          label={liveState.teams[teamId]?.benchWtLabel ?? ""}
          style={colNarrow}
          onTap={() => engine.tapWt(teamId, null)}
          onLongPress={() => engine.longPressWt(teamId, null)}
        />
      </View>

      {/* Totals row: read-only, updates live (spec 6.3). */}
      <TotalsRow bundle={bundle} teamId={teamId} engine={engine} />
    </View>
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
  const f = { fontFamily: gridFont(true) };

  return (
    <View style={[styles.row, styles.totalsRow]}>
      <Text style={[styles.cellText, colJersey]}></Text>
      <Text style={[styles.cellText, styles.nameText, colName, f]}>Totals</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{teamLine?.score ?? 0}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.twoPointMade)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.twoPointAttempted - p.twoPointMade)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.threePointMade)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.threePointAttempted - p.threePointMade)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.ftMade)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.ftAttempted - p.ftMade)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.reboundsOffensive) + (teamLine?.reboundsOffensive ?? 0)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.reboundsDefensive) + (teamLine?.reboundsDefensive ?? 0)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.assists)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.steals)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.blocks)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.turnovers) + (teamLine?.turnovers ?? 0)}</Text>
      <Text style={[styles.cellText, colNarrow, f]}>{sum((p) => p.personalFouls)}</Text>
      <Text style={[styles.cellText, colNarrow]}></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  groupHeaderRow: { flexDirection: "row", paddingTop: 4 },
  groupHeaderCell: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
  },
  headerRow: { flexDirection: "row", paddingBottom: 4, borderBottomWidth: 1, borderColor: "#ccc" },
  headerCell: { textAlign: "center", fontSize: 10, fontWeight: "700", color: "#666", textTransform: "uppercase" },
  headerSubCell: { textAlign: "center", fontSize: 11, fontWeight: "700", color: "#666" },
  headerHighlight: { color: "#b8790a" },
  // Fix Round 2, A5: no vertical padding here — StatCellButton/WtCell's own
  // fixed 48px cell height is what determines the row's height now, so it
  // stays a predictable value instead of compounding with font metrics.
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  rowDim: { opacity: 0.45 },
  // Fix B3: on-court players need a positive/affirmative highlight, not
  // just bench dimming. Applied to the name cell specifically so it reads
  // clearly even in poor gym lighting without competing with the amber
  // "selected for swap" state below.
  nameOnCourtBg: { backgroundColor: "#d7f0e0", borderRadius: 4 },
  nameSelectedBg: { backgroundColor: "#fde9c8", borderRadius: 4 },
  teamRow: { backgroundColor: "#f3f3f6" },
  totalsRow: { backgroundColor: "#eaeaf0" },
  cellText: { textAlign: "center", fontSize: 13, fontVariant: ["tabular-nums"] },
  nameText: { textAlign: "left", fontWeight: "600", paddingHorizontal: 4 },
  nameSelected: { color: "#7a4a00" },
});
