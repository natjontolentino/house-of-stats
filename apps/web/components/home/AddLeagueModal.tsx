"use client";

import { useState } from "react";

const ADMIN_EMAIL = "natjon.tolentino@gmail.com";

/** Replaces the old dead "Add your league" link: a small popup that collects just enough to open a pre-filled email to the site owner, rather than a self-serve signup flow that doesn't exist yet. */
export function AddLeagueModal() {
  const [open, setOpen] = useState(false);
  const [leagueName, setLeagueName] = useState("");
  const [contactName, setContactName] = useState("");

  const mailtoHref = () => {
    const subject = `New league: ${leagueName.trim() || "(name not given)"}`;
    const body = `League name: ${leagueName.trim() || "-"}\nContact person: ${contactName.trim() || "-"}\n\n`;
    return `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="league-card league-card--add"
        style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "transparent", font: "inherit" }}
      >
        <div className="league-card__plus">+</div>
        <div className="league-card__body">
          <p className="league-card__name" style={{ color: "var(--accent-dark)" }}>
            Add your league
          </p>
          <p className="league-card__meta">One season, one price</p>
        </div>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add your league"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16,16,24,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 100,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 24, maxWidth: 380, width: "100%", display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Add your league</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ background: "none", border: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: "var(--muted)" }}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Tell us a couple of details, then email us — we&apos;ll set your league up.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>League name</span>
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Contact person</span>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
              />
            </label>
            <a href={mailtoHref()} className="button-primary" style={{ textAlign: "center", textDecoration: "none" }}>
              Email {ADMIN_EMAIL}
            </a>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, textAlign: "center" }}>
              Opens your email app, addressed to {ADMIN_EMAIL}, with these details filled in.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
