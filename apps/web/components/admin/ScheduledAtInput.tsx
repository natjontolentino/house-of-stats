"use client";

import { useState } from "react";
import { isoToPhLocal, phLocalToIso } from "../../lib/time";

/**
 * Date and time are always entered as Philippine time (UTC+8), whatever the
 * browser's own time zone is, and saved as an absolute timestamp. `defaultIso`
 * prefills the field when editing an existing game.
 */
export function ScheduledAtInput({ name, defaultIso }: { name: string; defaultIso?: string }) {
  const [iso, setIso] = useState(defaultIso ?? "");

  return (
    <>
      <input
        type="datetime-local"
        required
        defaultValue={defaultIso ? isoToPhLocal(defaultIso) : undefined}
        onChange={(e) => setIso(e.target.value ? phLocalToIso(e.target.value) : "")}
        style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
      />
      <span style={{ fontSize: 12, color: "var(--muted)" }}>Philippine time (UTC+8)</span>
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
