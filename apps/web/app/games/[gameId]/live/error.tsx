"use client";

import "./live.css";

export default function LiveError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="live-root live-state">
      <div className="live-state__title">Couldn&apos;t load the scoreboard</div>
      <p className="live-state__sub">Check your connection and try again.</p>
      <button type="button" className="live-button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
