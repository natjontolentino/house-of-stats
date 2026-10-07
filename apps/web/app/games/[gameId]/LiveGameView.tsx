"use client";

import Link from "next/link";
import type { GameBundle } from "../../../lib/gameData";
import { displayPlayerName } from "@courtstats/shared";
import { ScoreHeader } from "../../../components/ScoreHeader";
import { TeamLogo } from "../../../components/TeamLogo";
import { BoxScoreTable } from "../../../components/BoxScoreTable";
import { PlayByPlay } from "../../../components/PlayByPlay";
import { ExportButtons } from "../../../components/ExportButtons";
import { TeamFoulsAndTimeouts } from "../../../components/TeamFoulsAndTimeouts";
import { ScoreByPeriod } from "../../../components/ScoreByPeriod";
import { PlayerAvatar } from "../../../components/PlayerAvatar";
import { useLiveGame } from "./useLiveGame";

export function LiveGameView({ bundle }: { bundle: GameBundle }) {
  const { events, gameStatus, liveState, lastEventAt, isStale, playerOfGame } = useLiveGame(bundle);
  const potg = playerOfGame ? bundle.players[playerOfGame.playerId] : null;

  return (
    <main className="page">
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
        <div
          className="card"
          style={{ marginTop: 14, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}
        >
          {potg && <PlayerAvatar name={potg.full_name} photoUrl={potg.photo_url} size={44} />}
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>
              Player of the game
            </div>
            <div style={{ fontWeight: 700 }}>
              {potg ? (
                <Link href={`/players/${playerOfGame.playerId}`} style={{ color: "inherit" }}>
                  {displayPlayerName(potg, bundle.settings)}
                </Link>
              ) : null}
              {playerOfGame.isOverride ? " (organizer selection)" : ""}
            </div>
          </div>
        </div>
      )}

      <ExportButtons gameId={bundle.game.id} />

      <section style={{ marginTop: 28 }}>
        <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TeamLogo url={bundle.homeTeam.logo_url} size={24} />
          {bundle.homeTeam.name}
        </h2>
        <BoxScoreTable bundle={bundle} teamId={bundle.game.home_team_id} liveState={liveState} events={events} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TeamLogo url={bundle.awayTeam.logo_url} size={24} />
          {bundle.awayTeam.name}
        </h2>
        <BoxScoreTable bundle={bundle} teamId={bundle.game.away_team_id} liveState={liveState} events={events} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 className="section-title">Play-by-play</h2>
        <PlayByPlay bundle={bundle} events={events} />
      </section>
    </main>
  );
}
