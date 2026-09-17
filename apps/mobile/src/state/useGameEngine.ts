import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import {
  computeLiveGameState,
  filterVoidedEvents,
  createGameEvent,
  canSubstituteIn,
  contextualHighlightForEvent,
  CONTEXTUAL_HIGHLIGHT_DURATION_MS,
  AUTO_PAUSE_EVENT_TYPES,
  slotsToExpireAtHalftime,
  regulationHalfBoundaryPeriod,
  computeWtLadder,
  canDecrementPersonalFoul,
  PF_FROM_TECHNICAL_MESSAGE,
  SUBSTITUTE_DISQUALIFIED_MESSAGE,
  DISQUALIFIED_PLAYER_STAT_MESSAGE,
  type GameEvent,
  type EventType,
  type LiveGameState,
  type HighlightHint,
  type GameStatus,
} from "@courtstats/shared";
import {
  getEventsForGame,
  insertLocalEvent,
  getUnsyncedEvents,
  type CachedGameBundle,
} from "../db/localDb";
import { pushUnsyncedEvents, type SyncStatus } from "../sync/syncEngine";
import { STAT_CELLS, type StatCellKey } from "./statCells";
import type { PromptState } from "./promptTypes";
import { isPracticeGameId } from "./practiceMode";
import { supabase } from "../sync/supabaseClient";

function defaultClockMsForPeriod(period: number, settings: CachedGameBundle["settings"]): number {
  const minutes = period > settings.period_structure_quarters ? settings.overtime_length_minutes : settings.period_length_minutes;
  return minutes * 60_000;
}

export function useGameEngine(gameId: string, bundle: CachedGameBundle, deviceId: string) {
  const settings = bundle.settings;
  const game = bundle.game as { home_team_id: string; away_team_id: string; status: GameStatus };
  const isPractice = isPracticeGameId(gameId);

  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [clockMs, setClockMsState] = useState<number | null>(null);
  const [clockRunning, setClockRunningState] = useState(false);
  const [prompt, setPrompt] = useState<PromptState>({ kind: "none" });
  const [highlight, setHighlight] = useState<HighlightHint | null>(null);
  const [selectedNameForSwap, setSelectedNameForSwap] = useState<{ teamId: string; playerId: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("pending");
  const [pendingCount, setPendingCount] = useState(0);

  const clockMsRef = useRef<number | null>(null);
  const clockRunningRef = useRef(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- load local events on mount, restoring exact state after a restart (spec 6.13) ---
  useEffect(() => {
    let cancelled = false;
    getEventsForGame(gameId).then((loadedEvents) => {
      if (cancelled) return;
      const maxSequence = loadedEvents.reduce((max, e) => Math.max(max, e.sequence), 0);
      nextSequenceRef.current = maxSequence + 1;
      setEvents(loadedEvents);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const liveState: LiveGameState | null = useMemo(() => {
    if (!loaded) return null;
    return computeLiveGameState({
      game,
      allEvents: events,
      rosterByTeam: bundle.rosterByTeam,
      settings,
    });
  }, [events, loaded, game, bundle.rosterByTeam, settings]);

  // --- seed the live clock from history once loaded, or on period change ---
  const lastSeenPeriod = useRef<number | null>(null);
  useEffect(() => {
    if (!liveState) return;
    if (settings.clock_mode === "off") {
      clockMsRef.current = null;
      setClockMsState(null);
      return;
    }
    if (lastSeenPeriod.current !== liveState.currentPeriod) {
      lastSeenPeriod.current = liveState.currentPeriod;
      const seeded = liveState.lastKnownClockMs ?? defaultClockMsForPeriod(liveState.currentPeriod, settings);
      clockMsRef.current = seeded;
      setClockMsState(seeded);
      clockRunningRef.current = liveState.clockRunning;
      setClockRunningState(liveState.clockRunning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveState?.currentPeriod, loaded]);

  // --- automatic disqualification prompt (spec 6.6): a player on court who
  // just fouled out or was ejected immediately gets a substitute-in prompt ---
  const previouslyDisqualified = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!liveState) return;
    for (const [teamId, teamState] of [
      [game.home_team_id, liveState.home],
      [game.away_team_id, liveState.away],
    ] as const) {
      for (const playerId of teamState.disqualifiedPlayerIds) {
        if (previouslyDisqualified.current.has(playerId)) continue;
        previouslyDisqualified.current.add(playerId);
        if (!teamState.onCourtPlayerIds.includes(playerId)) continue;
        const player = liveState.players[playerId];
        const benchOptions = teamState.benchPlayerIds
          .filter((id) => !teamState.disqualifiedPlayerIds.includes(id))
          .map((id) => ({ playerId: id, name: (bundle.players[id] as { nickname: string })?.nickname ?? "?" }));
        setPrompt({
          kind: "disqualification",
          teamId,
          playerId,
          playerName: (bundle.players[playerId] as { nickname: string })?.nickname ?? "?",
          reason: player?.fouledOut ? "fouls" : "technicals",
          benchOptions,
        });
      }
    }
  }, [liveState, game.home_team_id, game.away_team_id, bundle.players]);

  // --- tracker-mode local ticking ---
  useEffect(() => {
    if (settings.clock_mode !== "tracker") return;
    const id = setInterval(() => {
      if (clockRunningRef.current && clockMsRef.current !== null && clockMsRef.current > 0) {
        clockMsRef.current = Math.max(0, clockMsRef.current - 1000);
        setClockMsState(clockMsRef.current);
        if (clockMsRef.current === 0) {
          clockRunningRef.current = false;
          setClockRunningState(false);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [settings.clock_mode]);

  // --- companion-mode: mirror the companion device's broadcast clock ---
  useEffect(() => {
    if (settings.clock_mode !== "companion") return;
    const channel = supabase
      .channel(`companion-clock-${gameId}`)
      .on("broadcast", { event: "tick" }, ({ payload }) => {
        const p = payload as { clock_ms: number; running: boolean };
        clockMsRef.current = p.clock_ms;
        clockRunningRef.current = p.running;
        setClockMsState(p.clock_ms);
        setClockRunningState(p.running);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, settings.clock_mode]);

  // --- background sync loop ---
  // spec 7.4: "a small, honest sync indicator: synced, pending count, or
  // offline" — pendingCount is the actual number of locally-held events the
  // server hasn't acknowledged yet, not just a generic "syncing" label.
  useEffect(() => {
    if (isPractice) {
      setSyncStatus("synced");
      setPendingCount(0);
      return;
    }
    const runSync = () => {
      pushUnsyncedEvents(gameId)
        .then(setSyncStatus)
        .catch(() => setSyncStatus("offline"))
        .finally(() => {
          getUnsyncedEvents(gameId).then((rows) => setPendingCount(rows.length));
        });
    };
    const id = setInterval(runSync, 5000);
    runSync();
    return () => clearInterval(id);
  }, [gameId, isPractice]);

  const stopClockLocally = useCallback(() => {
    if (settings.clock_mode === "tracker") {
      clockRunningRef.current = false;
      setClockRunningState(false);
    }
  }, [settings.clock_mode]);

  // Seeded once from the loaded event log (not re-queried on every append —
  // appendEvent below already maintains it synchronously in memory, and
  // re-fetching from SQLite on a timer would race with rapid successive taps:
  // two taps before either's DB write lands could both read the same
  // "current max" and collide on the (game_id, sequence) unique constraint.
  const nextSequenceRef = useRef<number>(1);

  const appendEvent = useCallback(
    async <T extends EventType>(eventType: T, teamId: string | null, playerId: string | null, payload: Record<string, unknown>) => {
      const sequence = nextSequenceRef.current++;
      const period = liveState?.currentPeriod ?? 1;
      const clock = settings.clock_mode === "off" ? null : clockMsRef.current;
      const newEvent = createGameEvent({
        gameId,
        sequence,
        eventType,
        teamId,
        playerId,
        period,
        clockMs: clock,
        payload: payload as never,
        recordedByDeviceId: deviceId,
        recordedByUserId: null,
        generateUuid: () => Crypto.randomUUID(),
      });
      await insertLocalEvent(newEvent);
      // Sorted on every append, not just blind-appended: undo() and the
      // long-press "find the most recent matching event" helpers both trust
      // array order to mean sequence order, and two overlapping appendEvent
      // calls could otherwise have their SQLite writes resolve out of
      // call-order, leaving `events` briefly out of sequence.
      setEvents((prev) =>
        [...prev, { ...newEvent, id: newEvent.client_uuid } as GameEvent].sort((a, b) => a.sequence - b.sequence),
      );
      if (!isPractice) setPendingCount((c) => c + 1);

      if (AUTO_PAUSE_EVENT_TYPES.has(eventType)) {
        stopClockLocally();
      }
      if (!isPractice) {
        pushUnsyncedEvents(gameId)
          .then(setSyncStatus)
          .catch(() => setSyncStatus("offline"))
          .finally(() => {
            getUnsyncedEvents(gameId).then((rows) => setPendingCount(rows.length));
          });
      }
      return newEvent;
    },
    [gameId, deviceId, liveState?.currentPeriod, settings.clock_mode, stopClockLocally, isPractice],
  );

  const findLastMatching = useCallback(
    (predicate: (e: GameEvent) => boolean): GameEvent | null => {
      const visible = filterVoidedEvents(events);
      for (let i = visible.length - 1; i >= 0; i--) {
        if (predicate(visible[i])) return visible[i];
      }
      return null;
    },
    [events],
  );

  const triggerHighlight = useCallback((hint: HighlightHint | null) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlight(hint);
    if (hint) {
      highlightTimerRef.current = setTimeout(() => setHighlight(null), CONTEXTUAL_HIGHLIGHT_DURATION_MS);
    }
  }, []);

  const haptic = useCallback((kind: "tap" | "longpress") => {
    Haptics.impactAsync(kind === "tap" ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(
      () => {},
    );
  }, []);

  // --- recording a cell tap (spec 6.4, 6.5) ---
  const recordCellForPlayer = useCallback(
    async (cellKey: StatCellKey, teamId: string, playerId: string | null) => {
      const def = STAT_CELLS[cellKey];
      const isTeamRow = playerId === null;
      const payload = { ...def.payload };
      if (isTeamRow) {
        if (def.key === "reb_o" || def.key === "reb_d") payload.team_rebound = true;
        if (def.key === "to") payload.team_turnover = true;
      }
      await appendEvent(def.eventType, teamId, playerId, payload);
      haptic("tap");

      const opponentTeamId = teamId === game.home_team_id ? game.away_team_id : game.home_team_id;
      const hint = contextualHighlightForEvent(def.eventType, teamId, opponentTeamId);
      triggerHighlight(hint);
    },
    [appendEvent, haptic, triggerHighlight, game.home_team_id, game.away_team_id],
  );

  /** Tapping a stat cell. Only on-court players and the Team row accept new entries (spec 6.5). */
  const tapCell = useCallback(
    async (cellKey: StatCellKey, teamId: string, playerId: string | null) => {
      if (!liveState) return;
      if (playerId === null) {
        if (!STAT_CELLS[cellKey].teamRowEligible) return;
        await recordCellForPlayer(cellKey, teamId, null);
        return;
      }

      const teamState = teamId === game.home_team_id ? liveState.home : liveState.away;
      const onCourt = teamState.onCourtPlayerIds.includes(playerId);

      if (onCourt) {
        // A fouled-out/ejected player can still be marked on-court if the
        // tracker chose "Later" on the disqualification prompt (spec 6.6) —
        // they must not accrue further stats until actually subbed out.
        if (teamState.disqualifiedPlayerIds.includes(playerId)) {
          setPrompt({ kind: "message", text: DISQUALIFIED_PLAYER_STAT_MESSAGE });
          return;
        }
        await recordCellForPlayer(cellKey, teamId, playerId);
        return;
      }

      // Implicit substitution prompt (spec 6.5): tapping a bench player's stat
      // cell means a substitution was missed — record it, then the stat.
      const bench = bundle.players[playerId] as { nickname: string } | undefined;
      const onCourtOptions = teamState.onCourtPlayerIds.map((id) => ({
        playerId: id,
        name: (bundle.players[id] as { nickname: string })?.nickname ?? "?",
      }));
      setPrompt({
        kind: "implicit_substitution",
        teamId,
        benchPlayerId: playerId,
        benchPlayerName: bench?.nickname ?? "?",
        onCourtOptions,
        pendingCell: { key: cellKey },
      });
    },
    [liveState, game.home_team_id, recordCellForPlayer, bundle.players],
  );

  /** Long-press: âˆ’1 on any row, including bench (spec 6.4, 6.5). */
  const longPressCell = useCallback(
    async (cellKey: StatCellKey, teamId: string, playerId: string | null) => {
      const def = STAT_CELLS[cellKey];

      if (cellKey === "pf" && playerId) {
        const foulPersonalCount = filterVoidedEvents(events).filter(
          (e) => e.event_type === "foul_personal" && e.player_id === playerId,
        ).length;
        if (!canDecrementPersonalFoul(foulPersonalCount)) {
          setPrompt({ kind: "message", text: PF_FROM_TECHNICAL_MESSAGE });
          return;
        }
      }

      const target = findLastMatching(
        (e) => e.team_id === teamId && e.player_id === playerId && def.matches(e),
      );
      if (!target) return;
      await appendEvent("event_voided", null, null, { voids_client_uuid: target.client_uuid, reason: "correction" });
      haptic("longpress");
    },
    [events, findLastMatching, appendEvent, haptic],
  );

  /** W/T ladder — tap steps up, long-press steps down (spec 6.6). */
  const tapWt = useCallback(
    async (teamId: string, playerId: string | null) => {
      const subjectEvents = filterVoidedEvents(events).filter(
        (e) => e.team_id === teamId && e.player_id === playerId && (e.event_type === "warning" || e.event_type === "technical"),
      );
      const wt = computeWtLadder(subjectEvents);
      if (wt.level === 0) {
        await appendEvent("warning", teamId, playerId, { target: playerId ? "player" : "bench" });
      } else if (wt.level === 1) {
        await appendEvent("technical", teamId, playerId, { target: playerId ? "player" : "bench", ordinal: 1 });
      } else if (wt.level === 2) {
        await appendEvent("technical", teamId, playerId, { target: playerId ? "player" : "bench", ordinal: 2 });
      }
      haptic("tap");
    },
    [events, appendEvent, haptic],
  );

  const longPressWt = useCallback(
    async (teamId: string, playerId: string | null) => {
      const target = findLastMatching(
        (e) => e.team_id === teamId && e.player_id === playerId && (e.event_type === "warning" || e.event_type === "technical"),
      );
      if (!target) return;
      await appendEvent("event_voided", null, null, { voids_client_uuid: target.client_uuid, reason: "correction" });
      haptic("longpress");
    },
    [findLastMatching, appendEvent, haptic],
  );

  // --- substitutions (spec 6.5) ---
  const performSubstitution = useCallback(
    async (teamId: string, playerOut: string, playerIn: string) => {
      if (!liveState) return;
      const teamState = teamId === game.home_team_id ? liveState.home : liveState.away;
      if (!canSubstituteIn(playerIn, teamState.disqualifiedPlayerIds)) {
        setPrompt({ kind: "message", text: SUBSTITUTE_DISQUALIFIED_MESSAGE });
        return;
      }
      await appendEvent("substitution", teamId, null, { player_in: playerIn, player_out: playerOut });
      haptic("tap");
    },
    [liveState, game.home_team_id, appendEvent, haptic],
  );

  /** Name-tap swap (spec 6.5, method 1): tap out-player, then in-player, either order. */
  const tapPlayerName = useCallback(
    (teamId: string, playerId: string) => {
      if (selectedNameForSwap && selectedNameForSwap.teamId === teamId) {
        if (selectedNameForSwap.playerId === playerId) {
          setSelectedNameForSwap(null);
          return;
        }
        const a = selectedNameForSwap.playerId;
        const b = playerId;
        const teamState = teamId === game.home_team_id ? liveState?.home : liveState?.away;
        const aOnCourt = teamState?.onCourtPlayerIds.includes(a) ?? false;
        const [playerOut, playerIn] = aOnCourt ? [a, b] : [b, a];
        setSelectedNameForSwap(null);
        performSubstitution(teamId, playerOut, playerIn);
        return;
      }
      setSelectedNameForSwap({ teamId, playerId });
    },
    [selectedNameForSwap, liveState, game.home_team_id, performSubstitution],
  );

  /** Resolves the implicit-substitution prompt (spec 6.5, method 2). */
  const resolveImplicitSubstitution = useCallback(
    async (chosenOutPlayerId: string) => {
      if (prompt.kind !== "implicit_substitution") return;
      const { teamId, benchPlayerId, pendingCell } = prompt;
      await performSubstitution(teamId, chosenOutPlayerId, benchPlayerId);
      setPrompt({ kind: "none" });
      if (pendingCell) {
        await recordCellForPlayer(pendingCell.key as StatCellKey, teamId, benchPlayerId);
      }
    },
    [prompt, performSubstitution, recordCellForPlayer],
  );

  /** Resolves the disqualification prompt (spec 6.6): pick a substitute, or "Later". */
  const resolveDisqualification = useCallback(
    async (chosenInPlayerId: string | null) => {
      if (prompt.kind !== "disqualification") return;
      const { teamId, playerId } = prompt;
      setPrompt({ kind: "none" });
      if (chosenInPlayerId) {
        await performSubstitution(teamId, playerId, chosenInPlayerId);
      }
    },
    [prompt, performSubstitution],
  );

  const cancelPrompt = useCallback(() => setPrompt({ kind: "none" }), []);

  // --- undo (spec 6.12): reverses the most recent action of any kind ---
  const undo = useCallback(async () => {
    const visible = filterVoidedEvents(events).filter((e) => e.event_type !== "game_finalized");
    if (visible.length === 0) return;

    // End Q (spec 6.9 endQuarter) writes period_end, any halftime
    // timeout_expired events, and the next period_start as one action —
    // undo must reverse all of them together as spec 6.12's single
    // "end-of-period" undo, not just the last of the three.
    const toVoid: GameEvent[] = [];
    let i = visible.length - 1;
    if (visible[i].event_type === "period_start") {
      toVoid.push(visible[i]);
      i--;
      while (i >= 0 && visible[i].event_type === "timeout_expired") {
        toVoid.push(visible[i]);
        i--;
      }
      if (i >= 0 && visible[i].event_type === "period_end") {
        toVoid.push(visible[i]);
      }
    } else {
      toVoid.push(visible[i]);
    }

    for (const evt of toVoid) {
      await appendEvent("event_voided", null, null, { voids_client_uuid: evt.client_uuid, reason: "undo" });
    }
    haptic("longpress");
  }, [events, appendEvent, haptic]);

  // --- clock controls (spec 6.9) ---
  const toggleClock = useCallback(() => {
    if (settings.clock_mode !== "tracker") return;
    const running = !clockRunningRef.current;
    clockRunningRef.current = running;
    setClockRunningState(running);
    appendEvent(running ? "clock_start" : "clock_stop", null, null, {});
  }, [settings.clock_mode, appendEvent]);

  const syncClockAdjust = useCallback(
    (deltaMs: number) => {
      if (clockMsRef.current === null) return;
      const next = Math.max(0, clockMsRef.current + deltaMs);
      clockMsRef.current = next;
      setClockMsState(next);
      appendEvent("clock_sync", null, null, { clock_ms: next });
    },
    [appendEvent],
  );

  // --- period control (spec 6.9 End Q) ---
  const endQuarter = useCallback(async () => {
    if (!liveState) return;
    const period = liveState.currentPeriod;
    await appendEvent("period_end", null, null, { period });

    const crossesHalf = period === regulationHalfBoundaryPeriod(settings);
    // spec 10: "Unused first-half timeouts carry over" — default no, matching
    // 6.8's literal "unused first-half boxes are automatically marked
    // expired"; a league that turns this on skips the auto-expire.
    if (crossesHalf && !settings.unused_first_half_timeouts_carry_over) {
      for (const teamId of [game.home_team_id, game.away_team_id]) {
        const teamEvents = filterVoidedEvents(events).filter((e) => e.team_id === teamId);
        const toExpire = slotsToExpireAtHalftime(teamEvents, settings);
        for (const slot of toExpire) {
          await appendEvent("timeout_expired", teamId, null, { slot_index: slot });
        }
      }
    }

    const nextPeriod = period + 1;
    await appendEvent("period_start", null, null, { period: nextPeriod });
    const seeded = defaultClockMsForPeriod(nextPeriod, settings);
    clockMsRef.current = seeded;
    setClockMsState(seeded);
    clockRunningRef.current = false;
    setClockRunningState(false);
  }, [liveState, appendEvent, events, game.home_team_id, game.away_team_id, settings]);

  // --- timeouts (spec 6.8) ---
  const useTeamTimeout = useCallback(
    async (teamId: string, slotIndex: number) => {
      await appendEvent("timeout", teamId, null, { slot_index: slotIndex });
      stopClockLocally();
      haptic("tap");
    },
    [appendEvent, stopClockLocally, haptic],
  );

  const undoTimeout = useCallback(
    async (teamId: string, slotIndex: number) => {
      const target = findLastMatching(
        (e) => e.team_id === teamId && e.event_type === "timeout" && (e.payload as { slot_index: number }).slot_index === slotIndex,
      );
      if (!target) return;
      await appendEvent("event_voided", null, null, { voids_client_uuid: target.client_uuid, reason: "correction" });
      haptic("longpress");
    },
    [findLastMatching, appendEvent, haptic],
  );

  // --- ejection (spec 6.6) ---
  const ejectPlayer = useCallback(
    async (teamId: string, playerId: string, reason: string) => {
      await appendEvent("ejection", teamId, playerId, { reason });
    },
    [appendEvent],
  );

  // --- post-game finalize (spec 6.13 step 3, 6.14) ---
  const finalize = useCallback(async () => {
    await appendEvent("game_finalized", null, null, {});
    if (!isPractice) {
      try {
        await supabase
          .from("game")
          .update({ status: "finalized", finalized_at: new Date().toISOString() })
          .eq("id", gameId);
      } catch {
        // offline — the finalized status still syncs next time events push,
        // and game_finalized is already recorded locally as the source of truth.
      }
    }
  }, [appendEvent, isPractice, gameId]);

  // --- pre-game (spec 6.13) ---
  const startGame = useCallback(
    async (homeStartingFive: string[], awayStartingFive: string[]) => {
      const initialClock = settings.clock_mode === "off" ? null : defaultClockMsForPeriod(1, settings);
      clockMsRef.current = initialClock;
      setClockMsState(initialClock);
      await appendEvent("lineup_set", game.home_team_id, null, { player_ids: homeStartingFive });
      await appendEvent("lineup_set", game.away_team_id, null, { player_ids: awayStartingFive });
      await appendEvent("period_start", null, null, { period: 1 });
    },
    [appendEvent, game.home_team_id, game.away_team_id, settings],
  );

  return {
    loaded,
    events,
    liveState,
    clockMs,
    clockRunning,
    clockMode: settings.clock_mode,
    prompt,
    highlight,
    selectedNameForSwap,
    syncStatus,
    pendingCount,
    tapCell,
    longPressCell,
    tapWt,
    longPressWt,
    tapPlayerName,
    resolveImplicitSubstitution,
    resolveDisqualification,
    cancelPrompt,
    setPrompt,
    undo,
    toggleClock,
    syncClockAdjust,
    endQuarter,
    useTeamTimeout,
    undoTimeout,
    ejectPlayer,
    startGame,
    finalize,
  };
}

export type GameEngine = ReturnType<typeof useGameEngine>;

