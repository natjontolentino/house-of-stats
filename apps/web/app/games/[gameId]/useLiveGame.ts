"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameBundle } from "../../../lib/gameData";
import { FRESHNESS_STALE_AFTER_MS } from "../../../lib/gameData";
import { createSupabaseClient } from "../../../lib/supabaseClient";
import { computeLiveGameState, selectPlayerOfGame, type GameEvent } from "@courtstats/shared";

/**
 * Keeps a game's events and status current for any page that shows it live:
 * a realtime subscription for instant updates, plus a periodic re-read as a
 * backup (the live connection can drop for a few seconds on a phone hotspot
 * or a sleeping laptop and does not replay what it missed), taking the
 * server's copy as the truth.
 */
export function useLiveGame(
  bundle: GameBundle,
  { pollMs = 10_000, stopPollingWhenFinal = false }: { pollMs?: number; stopPollingWhenFinal?: boolean } = {},
) {
  const [events, setEvents] = useState<GameEvent[]>(bundle.events);
  const [gameStatus, setGameStatus] = useState(bundle.game.status);
  // Null until the page has mounted: a time created during the server render would differ from the browser's and break hydration.
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  useEffect(() => setLastRefreshedAt(new Date()), []);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);
  const supabaseRef = useRef(createSupabaseClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`game-${bundle.game.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_event", filter: `game_id=eq.${bundle.game.id}` },
        (payload) => {
          const newEvent = payload.new as GameEvent;
          setEvents((prev) =>
            prev.some((e) => e.client_uuid === newEvent.client_uuid) ? prev : [...prev, newEvent].sort((a, b) => a.sequence - b.sequence),
          );
          setLastRefreshedAt(new Date());
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game", filter: `id=eq.${bundle.game.id}` },
        (payload) => {
          setGameStatus((payload.new as { status: typeof gameStatus }).status);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle.game.id]);

  const refresh = useCallback(async () => {
    const supabase = supabaseRef.current;
    setRefreshing(true);
    try {
      const [{ data: rows }, { data: game }] = await Promise.all([
        supabase.from("game_event").select("*").eq("game_id", bundle.game.id).order("sequence", { ascending: true }),
        supabase.from("game").select("status").eq("id", bundle.game.id).maybeSingle(),
      ]);
      if (rows) {
        setEvents((prev) => {
          const same = prev.length === rows.length && prev.every((e, i) => e.client_uuid === (rows[i] as GameEvent).client_uuid);
          return same ? prev : (rows as GameEvent[]);
        });
      }
      if (game) setGameStatus(game.status as typeof gameStatus);
      if (rows || game) setLastRefreshedAt(new Date());
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle.game.id]);

  const finalized = gameStatus === "finalized";

  useEffect(() => {
    if (stopPollingWhenFinal && finalized) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs, stopPollingWhenFinal, finalized]);

  // One last read the moment the game ends, so the final plays are never missed by a page that then stops polling.
  const wasFinalized = useRef(finalized);
  useEffect(() => {
    if (finalized && !wasFinalized.current) refresh();
    wasFinalized.current = finalized;
  }, [finalized, refresh]);

  // Re-render periodically so the freshness message ("N minutes ago") stays current.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const liveState = useMemo(
    () =>
      computeLiveGameState({
        game: { home_team_id: bundle.game.home_team_id, away_team_id: bundle.game.away_team_id, status: gameStatus },
        allEvents: events,
        rosterByTeam: bundle.rosterByTeam,
        settings: bundle.settings,
      }),
    [events, gameStatus, bundle],
  );

  const lastEventAt = events.length > 0 ? new Date(events[events.length - 1].created_at) : null;
  const isStale = lastEventAt ? Date.now() - lastEventAt.getTime() > FRESHNESS_STALE_AFTER_MS : true;

  const winningTeamId = finalized
    ? liveState.home.score === liveState.away.score
      ? null
      : liveState.home.score > liveState.away.score
        ? bundle.game.home_team_id
        : bundle.game.away_team_id
    : null;

  const playerOfGame = finalized
    ? selectPlayerOfGame(
        Object.values(liveState.players).map((p) => ({
          playerId: p.playerId,
          teamId: p.teamId,
          efficiency: p.efficiency,
          points: p.points,
          reboundsTotal: p.reboundsTotal,
          assists: p.assists,
        })),
        {
          winningTeamId,
          restrictToWinningTeam: bundle.settings.player_of_game_limited_to_winners,
        },
      )
    : null;

  return { events, gameStatus, liveState, lastEventAt, isStale, lastRefreshedAt, refreshing, refresh, winningTeamId, playerOfGame };
}
