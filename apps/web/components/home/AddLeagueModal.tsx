"use client";

import { useState } from "react";
import { submitLeagueLeadAction } from "../../app/actions/leagueLead";

const ADMIN_EMAIL = "natjon.tolentino@gmail.com";

function buildMessage(leagueName: string, contactName: string, contactNumber: string): { subject: string; body: string } {
  const subject = `New league: ${leagueName.trim() || "(name not given)"}`;
  const body = [
    `League name: ${leagueName.trim() || "-"}`,
    `Contact person: ${contactName.trim() || "-"}`,
    `Contact number: ${contactNumber.trim() || "-"}`,
    "",
  ].join("\n");
  return { subject, body };
}

type SendState = "idle" | "sending" | "sent" | "failed";

/**
 * Replaces the old dead "Add your league" link. Submitting records the
 * inquiry in league_lead (visible in the admin under Leads) and emails the
 * site owner -- see app/actions/leagueLead.ts. The mailto/copy/manual-text
 * options below stay as a fallback for whenever that fails or isn't
 * configured yet, since none of them depend on the server action working.
 */
export function AddLeagueModal() {
  const [open, setOpen] = useState(false);
  const [leagueName, setLeagueName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");

  const { subject, body } = buildMessage(leagueName, contactName, contactNumber);
  const mailtoHref = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(`To: ${ADMIN_EMAIL}\nSubject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser; the fallback text below still works.
    }
  };

  const submit = async () => {
    if (!leagueName.trim() || !contactName.trim()) return;
    setSendState("sending");
    try {
      const result = await submitLeagueLeadAction({ leagueName, contactName, contactNumber });
      setSendState(result.ok ? "sent" : "failed");
    } catch {
      setSendState("failed");
    }
  };

  const canSubmit = leagueName.trim().length > 0 && contactName.trim().length > 0;

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

            {sendState === "sent" ? (
              <>
                <p style={{ fontSize: 14, margin: 0 }}>Thanks — we&apos;ve got it and will be in touch.</p>
                <button type="button" onClick={() => setOpen(false)} className="button-primary" style={{ textAlign: "center" }}>
                  Close
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                  Tell us a couple of details and send — we&apos;ll set your league up.
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
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Contact number</span>
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
                  />
                </label>

                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit || sendState === "sending"}
                  className="button-primary"
                  style={{ textAlign: "center", opacity: !canSubmit || sendState === "sending" ? 0.6 : 1 }}
                >
                  {sendState === "sending" ? "Sending…" : "Send inquiry"}
                </button>
                {sendState === "failed" && (
                  <p style={{ fontSize: 12, color: "var(--red)", margin: 0, textAlign: "center" }}>
                    That didn&apos;t go through. Use one of the options below instead.
                  </p>
                )}

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, textAlign: "center" }}>
                    Or reach out directly:
                  </p>
                  <a href={mailtoHref} className="button-secondary" style={{ textAlign: "center", textDecoration: "none" }}>
                    Email {ADMIN_EMAIL}
                  </a>
                  <button type="button" onClick={copyDetails} className="button-secondary" style={{ textAlign: "center" }}>
                    {copied ? "Copied!" : "Copy details instead"}
                  </button>
                  <textarea
                    readOnly
                    value={`To: ${ADMIN_EMAIL}\nSubject: ${subject}\n\n${body}`}
                    onFocus={(e) => e.currentTarget.select()}
                    rows={4}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-strong)",
                      fontFamily: "inherit",
                      fontSize: 12,
                      color: "var(--muted)",
                      resize: "vertical",
                      background: "var(--bg)",
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
