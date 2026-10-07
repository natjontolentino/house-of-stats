"use client";

import "./live.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  computeScoreByPeriod,
  computeScoreTimeline,
  computeTeamTotalsFromPlayers,
  displayPlayerName,
  filterVoidedEvents,
  msToMinutesDisplay,
  selectPlayerOfGame,
  type LiveGameState,
} from "@courtstats/shared";
import type { GameBundle } from "../../../../lib/gameData";
import { formatPhTime } from "../../../../lib/time";
import { describeEvent, isPlayByPlayEvent } from "../../../../components/PlayByPlay";
import { PlayerAvatar } from "../../../../components/PlayerAvatar";
import { Logo } from "../../../../components/Logo";
import { useLiveGame } from "../useLiveGame";

export type LiveView = "scoreboard" | "box" | "pbp";

const VIEWS: Array<{ id: LiveView; label: string }> = [
  { id: "scoreboard", label: "Scoreboard" },
  { id: "box", label: "Box score" },
  { id: "pbp", label: "Play-by-play" },
];

const POLL_MS = 15_000;

function periodLabel(period: number, quarters: number): string {
  return period > quarters ? `OT${period - quarters}` : `Q${period}`;
}

function TeamLogoMark({ url, size }: { url: string | null; size: number }) {
  if (!url) return <span style={{ width: size, height: size, display: "inline-block" }} aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" width={size} height={size} style={{ objectFit: "contain" }} onError={(e) => (e.currentTarget.style.visibility = "hidden")} />;
}

/** A score that pops briefly whenever it changes, so a basket is noticed from across the room. */
function Score({ value, side }: { value: number; side: "home" | "away" }) {
  const [bump, setBump] = useState(false);
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setBump(true);
    const t = setTimeout(() => setBump(false), 400);
    return () => clearTimeout(t);
  }, [value]);
  return <div className={`live-score live-score--${side}${bump ? " live-score--bump" : ""}`}>{value}</div>;
}

/**
 * The game clock as the spectator should see it. The tracker records the clock
 * reading with each play; between plays a running clock is counted down
 * locally from the moment this page last saw the reading change, so the
 * viewer's own device clock never has to agree with the tracker's.
 */
function useDisplayClock(liveState: LiveGameState, enabled: boolean, defaultMs: number): number | null {
  const reading = liveState.lastKnownClockMs;
  const running = liveState.clockRunning;
  const anchorKey = `${liveState.currentPeriod}|${reading}|${running}`;
  const [anchorAt, setAnchorAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setAnchorAt(Date.now());
  }, [anchorKey]);

  useEffect(() => {
    if (!enabled || !running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [enabled, running, anchorKey]);

  if (!enabled) return null;
  const base = reading ?? defaultMs;
  if (!running || anchorAt === null || now === null) return base;
  return Math.max(0, base - Math.max(0, now - anchorAt));
}

export function LiveScoreboard({ bundle, initialView }: { bundle: GameBundle; initialView: LiveView }) {
  const { events, gameStatus, liveState, lastRefreshedAt, refreshing, playerOfGame } = useLiveGame(bundle, {
    pollMs: POLL_MS,
    stopPollingWhenFinal: true,
  });
  const [view, setView] = useState<LiveView>(initialView);

  const { settings, game, homeTeam, awayTeam } = bundle;
  const visibleEvents = useMemo(() => filterVoidedEvents(events), [events]);
  const started = visibleEvents.length > 0;
  const finalized = gameStatus === "finalized";
  const phase: "upcoming" | "live" | "final" = finalized ? "final" : started ? "live" : "upcoming";

  const quarters = settings.period_structure_quarters;
  const clockEnabled = settings.clock_mode !== "off" && phase === "live";
  const periodMinutes = liveState.currentPeriod > quarters ? settings.overtime_length_minutes : settings.period_length_minutes;
  const clockMs = useDisplayClock(liveState, clockEnabled, periodMinutes * 60_000);

  const changeView = (next: LiveView) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "scoreboard") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.replaceState(null, "", url);
  };

  // Current efficiency leader (or the official Player of the Game once final), badged in the box score.
  const potgId = useMemo(() => {
    if (playerOfGame) return playerOfGame.playerId;
    if (!started) return null;
    const leader = selectPlayerOfGame(
      Object.values(liveState.players).map((p) => ({
        playerId: p.playerId,
        teamId: p.teamId,
        efficiency: p.efficiency,
        points: p.points,
        reboundsTotal: p.reboundsTotal,
        assists: p.assists,
      })),
      { winningTeamId: null, restrictToWinningTeam: false },
    );
    return leader && liveState.players[leader.playerId]?.efficiency > 0 ? leader.playerId : null;
  }, [playerOfGame, started, liveState.players]);

  return (
    <div className="live-root">
      <header className="live-top">
        <Link href="/" className="live-brand">
          <Logo size={22} />
          House of Stats
        </Link>
        <div className="live-league">
          <TeamLogoMark url={bundle.league.logo_url} size={22} />
          <span>{bundle.league.name}</span>
        </div>
        <div className={`live-badge live-badge--${phase}`} aria-live="polite">
          <span className="live-badge__dot" />
          {phase === "live" ? "Live" : phase === "final" ? "Final" : "Upcoming"}
        </div>
      </header>

      {phase === "upcoming" ? (
        <NotStarted bundle={bundle} />
      ) : (
        <>
          <nav className="live-tabs" role="tablist" aria-label="Scoreboard views">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                className={`live-tab${view === v.id ? " live-tab--on" : ""}`}
                onClick={() => changeView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </nav>

          <main className="live-main">
            {view === "scoreboard" && (
              <ScoreboardView bundle={bundle} liveState={liveState} events={visibleEvents} phase={phase} clockMs={clockMs} playerOfGameId={playerOfGame?.playerId ?? null} />
            )}
            {view === "box" && <BoxScoreView bundle={bundle} liveState={liveState} potgId={potgId} />}
            {view === "pbp" && <PlayByPlayView bundle={bundle} events={visibleEvents} />}
          </main>
        </>
      )}

      <footer className="live-status">
        <span className="live-status__left">
          <span className={`live-status__dot${refreshing ? " live-status__dot--spin" : ""}${phase === "final" ? " live-status__dot--off" : ""}`} />
          {phase === "final"
            ? "Final — this page has stopped updating"
            : `Updated ${lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila" }) : "—"} · refreshes every ${POLL_MS / 1000}s`}
        </span>
        <Link href={`/games/${game.id}`} className="live-status__link">
          Full stats on House of Stats →
        </Link>
      </footer>
    </div>
  );
}

function NotStarted({ bundle }: { bundle: GameBundle }) {
  const { awayTeam, homeTeam, game } = bundle;
  return (
    <main className="live-state">
      <div className="live-state__teams">
        <div>
          <TeamLogoMark url={awayTeam.logo_url} size={72} />
          <div className="live-state__team">{awayTeam.name}</div>
        </div>
        <span className="live-state__vs">vs</span>
        <div>
          <TeamLogoMark url={homeTeam.logo_url} size={72} />
          <div className="live-state__team">{homeTeam.name}</div>
        </div>
      </div>
      <div className="live-state__title">Game not started yet</div>
      <p className="live-state__sub">
        {formatPhTime(game.scheduled_at)}
        {game.court_label ? ` · ${game.court_label}` : ""}
      </p>
      <p className="live-state__sub">This page updates on its own — it will switch to the live scoreboard as soon as the first play is recorded.</p>
    </main>
  );
}

function ScoreboardView({
  bundle,
  liveState,
  events,
  phase,
  clockMs,
  playerOfGameId,
}: {
  bundle: GameBundle;
  liveState: LiveGameState;
  events: ReturnType<typeof filterVoidedEvents>;
  phase: "live" | "final";
  clockMs: number | null;
  playerOfGameId: string | null;
}) {
  const { awayTeam, homeTeam, game, settings } = bundle;
  const quarters = settings.period_structure_quarters;
  const current = liveState.currentPeriod;
  const shownPeriods = Math.max(quarters, current);
  const periodScores = computeScoreByPeriod(events, game.home_team_id, game.away_team_id);
  const byPeriod = new Map(periodScores.map((p) => [p.period, p]));
  const periods = Array.from({ length: shownPeriods }, (_, i) => i + 1);
  const potg = playerOfGameId ? bundle.players[playerOfGameId] : null;
  // Reserve the logo slot on both sides, but only when at least one team has a logo to show.
  const showLogoSlot = Boolean(awayTeam.logo_url || homeTeam.logo_url);

  return (
    <>
      <section className="live-score-section">
        <p className="live-meta">
          {game.court_label ? `${game.court_label} · ` : ""}
          {formatPhTime(game.scheduled_at)}
        </p>

        <div className="live-board">
          <TeamBlock side="away" name={awayTeam.name} abbr={awayTeam.short_name} logo={awayTeam.logo_url} showLogoSlot={showLogoSlot} score={liveState.away.score} />

          <div className="live-mid">
            <div className="live-mid__sep">–</div>
            <div className="live-clock">
              {clockMs !== null && <div className="live-clock__time">{msToMinutesDisplay(clockMs)}</div>}
              <div className="live-clock__label">{phase === "final" ? "Final" : periodLabel(current, quarters)}</div>
            </div>
          </div>

          <TeamBlock side="home" name={homeTeam.name} abbr={homeTeam.short_name} logo={homeTeam.logo_url} showLogoSlot={showLogoSlot} score={liveState.home.score} />
        </div>

        <div className="live-pips" aria-label="Periods">
          {periods.map((p) => (
            <span key={p} className={`live-pip${phase === "live" && p === current ? " live-pip--on" : p < current || phase === "final" ? " live-pip--done" : ""}`}>
              {periodLabel(p, quarters)}
            </span>
          ))}
        </div>

        <div className="live-qtable-wrap">
          <table className="live-qtable">
            <thead>
              <tr>
                <th className="live-left">Team</th>
                {periods.map((p) => (
                  <th key={p}>{periodLabel(p, quarters)}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  { side: "away", team: awayTeam, score: liveState.away.score, pts: (p: number) => byPeriod.get(p)?.awayPoints },
                  { side: "home", team: homeTeam, score: liveState.home.score, pts: (p: number) => byPeriod.get(p)?.homePoints },
                ] as const
              ).map((row) => (
                <tr key={row.side}>
                  <td className={`live-left live-team-name live-team-name--${row.side}`}>{row.team.short_name}</td>
                  {periods.map((p) => (
                    <td key={p} className={p === current && phase === "live" ? "live-qtable__now" : undefined}>
                      {p <= current || byPeriod.has(p) ? (row.pts(p) ?? 0) : "—"}
                    </td>
                  ))}
                  <td className="live-qtable__total">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="live-fouls" aria-label="Team fouls">
        <FoulTracker side="away" label={awayTeam.short_name} count={liveState.away.teamFoulCount} limit={settings.fouls_before_team_penalty} penalty={liveState.away.penaltyStatus === "red"} />
        <span className="live-fouls__title">Team fouls</span>
        <FoulTracker side="home" label={homeTeam.short_name} count={liveState.home.teamFoulCount} limit={settings.fouls_before_team_penalty} penalty={liveState.home.penaltyStatus === "red"} />
      </section>

      {potg && playerOfGameId && (
        <section className="live-potg">
          <PlayerAvatar name={potg.full_name} photoUrl={potg.photo_url} size={64} ring="#f5a623" />
          <div>
            <div className="live-potg__label">Player of the game</div>
            <Link href={`/players/${playerOfGameId}`} className="live-potg__name">
              {displayPlayerName(potg, settings)}
            </Link>
            <div className="live-potg__line">
              {(() => {
                const l = liveState.players[playerOfGameId];
                return l ? `${l.points} PTS · ${l.reboundsTotal} REB · ${l.assists} AST` : "";
              })()}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function TeamBlock({ side, name, abbr, logo, showLogoSlot, score }: { side: "home" | "away"; name: string; abbr: string; logo: string | null; showLogoSlot: boolean; score: number }) {
  return (
    <div className="live-team">
      {showLogoSlot && <TeamLogoMark url={logo} size={64} />}
      <div className="live-team__abbr">{abbr}</div>
      <div className={`live-team__name live-team__name--${side}`}>{name}</div>
      <Score value={score} side={side} />
    </div>
  );
}

function FoulTracker({ side, label, count, limit, penalty }: { side: "home" | "away"; label: string; count: number; limit: number; penalty: boolean }) {
  return (
    <div className={`live-foul live-foul--${side}`}>
      <span className="live-foul__label">{label}</span>
      <span className="live-foul__pips" aria-hidden="true">
        {Array.from({ length: limit }, (_, i) => (
          <span key={i} className={`live-foul__pip${i < count ? (penalty ? " live-foul__pip--penalty" : " live-foul__pip--on") : ""}`} />
        ))}
      </span>
      <span className="live-foul__count">{count}</span>
      {penalty && <span className="live-foul__tag">Penalty</span>}
    </div>
  );
}

function BoxScoreView({ bundle, liveState, potgId }: { bundle: GameBundle; liveState: LiveGameState; potgId: string | null }) {
  return (
    <div className="live-box">
      {(
        [
          { side: "away", team: bundle.awayTeam, teamId: bundle.game.away_team_id, score: liveState.away.score },
          { side: "home", team: bundle.homeTeam, teamId: bundle.game.home_team_id, score: liveState.home.score },
        ] as const
      ).map(({ side, team, teamId, score }) => {
        const totals = computeTeamTotalsFromPlayers(teamId, liveState.players, liveState.teams[teamId]);
        const ids = bundle.rosterByTeam[teamId] ?? [];
        const teamEff = ids.reduce((sum, id) => sum + (liveState.players[id]?.efficiency ?? 0), 0);
        return (
          <section key={teamId} className="live-box__team">
            <div className={`live-box__head live-box__head--${side}`}>
              <span className="live-box__title">
                <TeamLogoMark url={team.logo_url} size={26} />
                {team.name}
              </span>
              <span className="live-box__pts">{score} PTS</span>
            </div>
            <div className="live-box__scroll">
              <table className="live-btable">
                <thead>
                  <tr>
                    <th className="live-left live-sticky">Player</th>
                    {["PTS", "2PT", "3PT", "FT", "REB", "AST", "STL", "BLK", "TO", "PF", "+/-", "EFF", "MIN"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ids.map((id) => {
                    const p = liveState.players[id];
                    const player = bundle.players[id];
                    if (!p || !player) return null;
                    return (
                      <tr key={id} className={p.onCourt ? undefined : "live-btable__bench"}>
                        <td className="live-left live-sticky">
                          <Link href={`/players/${id}`} className="live-player">
                            <PlayerAvatar name={player.full_name} photoUrl={player.photo_url} size={30} />
                            <span>
                              <span className="live-player__name">
                                <span className="live-player__num">#{bundle.jerseyByPlayer[id]}</span> {displayPlayerName(player, bundle.settings)}
                              </span>
                              {potgId === id && <span className="live-potg-badge">★ POTG</span>}
                            </span>
                          </Link>
                        </td>
                        <td className="live-btable__pts">{p.points}</td>
                        <td className="live-btable__dim">
                          {p.twoPointMade}/{p.twoPointAttempted}
                        </td>
                        <td className="live-btable__dim">
                          {p.threePointMade}/{p.threePointAttempted}
                        </td>
                        <td className="live-btable__dim">
                          {p.ftMade}/{p.ftAttempted}
                        </td>
                        <td>{p.reboundsTotal}</td>
                        <td>{p.assists}</td>
                        <td>{p.steals}</td>
                        <td>{p.blocks}</td>
                        <td>{p.turnovers}</td>
                        <td>{p.personalFouls}</td>
                        <td className={p.plusMinus > 0 ? "live-pos" : p.plusMinus < 0 ? "live-neg" : undefined}>{p.plusMinus > 0 ? `+${p.plusMinus}` : p.plusMinus}</td>
                        <td className="live-btable__eff">{p.efficiency}</td>
                        <td className="live-btable__dim">{p.minutesMs !== null ? msToMinutesDisplay(p.minutesMs) : "-"}</td>
                      </tr>
                    );
                  })}
                  <tr className="live-btable__totals">
                    <td className="live-left live-sticky">Team totals</td>
                    <td className="live-btable__pts">{totals.points}</td>
                    <td>
                      {totals.fieldGoalMade - totals.threePointMade}/{totals.fieldGoalAttempted - totals.threePointAttempted}
                    </td>
                    <td>
                      {totals.threePointMade}/{totals.threePointAttempted}
                    </td>
                    <td>
                      {totals.ftMade}/{totals.ftAttempted}
                    </td>
                    <td>{totals.reboundsOffensive + totals.reboundsDefensive}</td>
                    <td>{totals.assists}</td>
                    <td>{totals.steals}</td>
                    <td>{totals.blocks}</td>
                    <td>{totals.turnovers}</td>
                    <td>{totals.personalFouls}</td>
                    <td>—</td>
                    <td className="live-btable__eff">{teamEff}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PlayByPlayView({ bundle, events }: { bundle: GameBundle; events: ReturnType<typeof filterVoidedEvents> }) {
  const timeline = useMemo(() => computeScoreTimeline(events, bundle.game.home_team_id, bundle.game.away_team_id), [events, bundle.game.home_team_id, bundle.game.away_team_id]);
  const plays = useMemo(() => events.filter(isPlayByPlayEvent).sort((a, b) => b.sequence - a.sequence).slice(0, 120), [events]);
  const quarters = bundle.settings.period_structure_quarters;
  const showClock = bundle.settings.clock_mode !== "off";

  if (plays.length === 0) return <p className="live-empty">No plays recorded yet.</p>;

  return (
    <ol className="live-pbp">
      {plays.map((evt) => {
        const side = evt.team_id === bundle.game.home_team_id ? "home" : evt.team_id === bundle.game.away_team_id ? "away" : "none";
        const snap = timeline.get(evt.client_uuid);
        return (
          <li key={evt.client_uuid} className={`live-play live-play--${side}`}>
            <span className="live-play__q">{periodLabel(evt.period, quarters)}</span>
            {showClock && evt.clock_ms !== null && <span className="live-play__clock">{msToMinutesDisplay(evt.clock_ms)}</span>}
            <span className="live-play__text">{describeEvent(evt, bundle)}</span>
            {snap && (
              <span className="live-play__score">
                {snap.away}–{snap.home}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
