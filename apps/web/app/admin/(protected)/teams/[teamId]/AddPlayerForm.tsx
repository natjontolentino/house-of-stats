"use client";

import { useRef } from "react";
import { NICKNAME_MAX_LENGTH } from "@courtstats/shared";
import { addPlayerAction } from "./actions";

/**
 * A plain <form action={addPlayerAction}> leaves its fields showing the
 * last-typed values after a successful submit (revalidatePath re-renders
 * the roster below, but doesn't touch this form's own uncontrolled input
 * DOM nodes) -- confirmed on-device: clicking "Add player" a second time
 * without noticing would silently create a duplicate. Wrapping the action
 * so it can call formRef.reset() once it resolves fixes that.
 */
export function AddPlayerForm({ teamId, leagueId }: { teamId: string; leagueId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await addPlayerAction(formData);
        formRef.current?.reset();
      }}
      className="card"
      style={{ padding: 18, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}
    >
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="leagueId" value={leagueId} />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Jersey #</span>
        <input
          type="text"
          name="jerseyNumber"
          required
          style={{ width: 60, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-strong)" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Full name</span>
        <input
          type="text"
          name="fullName"
          required
          style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-strong)" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Nickname (max 10 chars)</span>
        <input
          type="text"
          name="nickname"
          required
          maxLength={NICKNAME_MAX_LENGTH}
          style={{ width: 130, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-strong)" }}
        />
      </label>
      <button type="submit" className="button-primary">
        Add player
      </button>
    </form>
  );
}
