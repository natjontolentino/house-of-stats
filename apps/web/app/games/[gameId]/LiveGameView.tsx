"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameBundle } from "../../../lib/gameData";
import { FRESHNESS_STALE_AFTER_MS } from "../../../lib/gameData";
import { createSupabaseClient } from "../../../lib/supabaseClient";
import { computeLiveGameState, selectPlayerOfGame, displayPlayerName, type GameEvent } from "@courtstats/shared";
import { ScoreHeader } from "../../../components/ScoreHeader";
import { BoxScoreTable } from "../../../components/BoxScoreTable";
import { PlayByPlay } from "../../../components/PlayByPlay";
import { ExportButtons } from "../../../components/ExportButtons";
import { TeamFoulsAndTimeouts } from "../../../components/TeamFoulsAndTimeouts";
import { ScoreByPeriod } from "../../../components/ScoreByPeriod";

export function LiveGameView({ bundle }: { bundle: GameBundle }) {
  const [events, setEvents] = useState<GameEvent[]>(bundle.events);
  const [gameStatus, setGameStatus] = useState(bundle.game.status);
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

  const winningTeamId =
    gameStatus === "finalized"
      ? liveState.home.score === liveState.away.score
        ? null
        : liveState.home.score > liveState.away.score
          ? bundle.game.home_team_id
          : bundle.game.away_team_id
      : null;

  const playerOfGame =
    gameStatus === "finalized"
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

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <ScoreHeader
        bundle={bundle}
        liveState={liveState}
        gameStatus={gameStatus}
        isStale={isStale}
        lastEventAt={lastEventAt}
      />

      <ScoreByPeriod bundle={bundle} events={events} />

      <TeamFoulsAndTimeouts bundle={bundle} liveState={liveState} />

      {playerOfGame && (
        <p style={{ marginTop: 16, fontWeight: 600 }}>
          Player of the game:{" "}
          {(() => {
            const p = bundle.players[playerOfGame.playerId];
            return p ? displayPlayerName(p, bundle.settings) : null;
          })()}
          {playerOfGame.isOverride ? " (organizer selection)" : ""}
        </p>
      )}

      <ExportButtons gameId={bundle.game.id} />

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>{bundle.homeTeam.name}</h2>
        <BoxScoreTable bundle={bundle} teamId={bundle.game.home_team_id} liveState={liveState} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>{bundle.awayTeam.name}</h2>
        <BoxScoreTable bundle={bundle} teamId={bundle.game.away_team_id} liveState={liveState} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Play-by-play</h2>
        <PlayByPlay bundle={bundle} events={events} />
      </section>
    </main>
  );
}
