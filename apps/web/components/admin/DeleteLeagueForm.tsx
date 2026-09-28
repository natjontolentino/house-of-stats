"use client";

import { useState } from "react";

/** Requires typing the league's exact name before the delete button will even submit -- this is permanent, so a plain confirm() dialog isn't enough friction. */
export function DeleteLeagueForm({
  leagueId,
  leagueName,
  action,
}: {
  leagueId: string;
  leagueName: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed === leagueName;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!matches || !window.confirm(`Permanently delete "${leagueName}"? Every team, player, game and stat in it will be gone for good.`)) {
          e.preventDefault();
        }
      }}
      className="card"
      style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--red)" }}
    >
      <input type="hidden" name="leagueId" value={leagueId} />
      <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
        Deletes this league and everything in it — seasons, teams, players, rosters, games and stats — for good.
        This can&apos;t be undone.
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          Type <strong>{leagueName}</strong> to confirm
        </span>
        <input
          type="text"
          name="confirmName"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
        />
      </label>
      <button
        type="submit"
        disabled={!matches}
        style={{
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--red)",
          background: matches ? "var(--red)" : "var(--red-bg)",
          color: matches ? "white" : "var(--red)",
          fontWeight: 700,
          fontSize: 14,
          cursor: matches ? "pointer" : "not-allowed",
        }}
      >
        Delete league permanently
      </button>
    </form>
  );
}
