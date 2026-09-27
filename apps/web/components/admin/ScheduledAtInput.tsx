"use client";

import { useEffect, useRef, useState } from "react";

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The server runs in UTC, so a plain datetime-local value ("2026-09-26T11:30")
 * would be read as 11:30 UTC rather than the organizer's own 11:30. Converting
 * to an absolute ISO timestamp in the browser, which knows the local zone,
 * keeps the time the organizer typed. `defaultIso` prefills the field (in the
 * browser's zone) when editing an existing game.
 */
export function ScheduledAtInput({ name, defaultIso }: { name: string; defaultIso?: string }) {
  const [iso, setIso] = useState(defaultIso ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultIso && inputRef.current) inputRef.current.value = toLocalInputValue(defaultIso);
  }, [defaultIso]);

  return (
    <>
      <input
        ref={inputRef}
        type="datetime-local"
        required
        onChange={(e) => setIso(e.target.value ? new Date(e.target.value).toISOString() : "")}
        style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
