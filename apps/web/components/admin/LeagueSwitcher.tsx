"use client";

import { useRef } from "react";

export function LeagueSwitcher({
  leagues,
  currentId,
  action,
}: {
  leagues: { id: string; name: string }[];
  currentId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action}>
      <select
        name="leagueId"
        defaultValue={currentId}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="League being managed"
        style={{
          background: "rgba(255,255,255,0.1)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 6,
          padding: "4px 8px",
          fontSize: 13,
          maxWidth: 200,
        }}
      >
        {leagues.map((l) => (
          <option key={l.id} value={l.id} style={{ color: "black" }}>
            {l.name}
          </option>
        ))}
      </select>
    </form>
  );
}
