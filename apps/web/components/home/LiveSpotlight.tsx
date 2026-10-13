"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LiveFeedGame } from "../../lib/liveFeed";
import { SpotlightCard } from "./SpotlightCard";
import { AutoRefresh } from "./AutoRefresh";

const ROTATE_MS = 8000;

/** What a chip calls a game: its court, else its league. */
function chipLabel(game: LiveFeedGame): string {
  return game.courtLabel || game.league.name || `${game.away.shortName} vs ${game.home.shortName}`;
}

/**
 * The hero card when games are live. With several at once it steps through
 * them every few seconds and lists every live score as a chip underneath, so
 * all of them stay visible and any can be picked. Choosing one (or hovering
 * the card) stops the rotation, and visitors who prefer reduced motion never
 * get automatic rotation at all.
 */
export function LiveSpotlight({ games }: { games: LiveFeedGame[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const count = games.length;
  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(id);
  }, [count, paused, reducedMotion]);

  const current = games[Math.min(index, count - 1)];

  return (
    <div
      className="live-spotlight"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AutoRefresh intervalMs={15_000} />
      <SpotlightCard key={current.gameId} game={current} clock={current.clock} />

      {count > 1 && (
        <div className="live-chips" role="tablist" aria-label="Live games">
          {games.map((g, i) => (
            <button
              key={g.gameId}
              type="button"
              role="tab"
              aria-selected={games[Math.min(index, count - 1)] === g}
              className={`live-chip${i === Math.min(index, count - 1) ? " live-chip--on" : ""}`}
              onClick={() => {
                setIndex(i);
                setPaused(true);
              }}
            >
              <span className="live-chip__label">{chipLabel(g)}</span>
              <span className="live-chip__score">
                {g.away.score}–{g.home.score}
              </span>
            </button>
          ))}
          <Link href="/live" className="live-chips__all">
            Watch all →
          </Link>
        </div>
      )}
    </div>
  );
}
