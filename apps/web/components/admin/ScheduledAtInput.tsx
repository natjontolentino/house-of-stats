"use client";

import { useState } from "react";

/**
 * The server runs in UTC, so a plain datetime-local value ("2026-09-26T11:30")
 * would be read as 11:30 UTC rather than the organizer's own 11:30. Converting
 * to an absolute ISO timestamp in the browser, which knows the local zone,
 * keeps the time the organizer typed.
 */
export function ScheduledAtInput({ name }: { name: string }) {
  const [iso, setIso] = useState("");
  return (
    <>
      <input
        type="datetime-local"
        required
        onChange={(e) => setIso(e.target.value ? new Date(e.target.value).toISOString() : "")}
        style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
