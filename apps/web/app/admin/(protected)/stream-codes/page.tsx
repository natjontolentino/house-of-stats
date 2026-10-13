import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";
import { getAdminLeagueContext } from "../../../../lib/adminLeague";
import { LEAGUE_TIME_ZONE, isoToPhLocal } from "../../../../lib/time";
import { LocalTime } from "../../../../components/LocalTime";
import { ConfirmButton } from "../../../../components/admin/ConfirmButton";
import {
  createStreamCodesAction,
  setStreamCodeStatusAction,
  releaseStreamPhoneAction,
  setStreamExpiryAction,
  deleteStreamCodeAction,
} from "./actions";

export const dynamic = "force-dynamic";

const dateOnly = new Intl.DateTimeFormat("en-PH", { timeZone: LEAGUE_TIME_ZONE, year: "numeric", month: "short", day: "numeric" });

const inputStyle = { padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" };
const smallButton = { fontSize: 12, padding: "6px 10px" };

interface StreamLicense {
  id: string;
  code: string;
  label: string;
  league_id: string | null;
  expires_at: string | null;
  status: "active" | "revoked";
  installation_id: string | null;
  device_label: string | null;
  activated_at: string | null;
  last_seen_at: string | null;
  created_at: string;
}

function codeState(l: StreamLicense): { text: string; badge: string } {
  if (l.status === "revoked") return { text: "Switched off", badge: "scheduled" };
  if (l.expires_at && new Date(l.expires_at) <= new Date()) return { text: "Expired", badge: "stale" };
  if (!l.installation_id) return { text: "Not used yet", badge: "final" };
  return { text: "Active", badge: "live" };
}

/** Today + n days as a yyyy-mm-dd value for a date input, in Philippine time. */
function dateInputValue(daysFromNow: number): string {
  return isoToPhLocal(new Date(Date.now() + daysFromNow * 86_400_000).toISOString()).slice(0, 10);
}

/**
 * Activation codes for the Pinoy Hoops Live streaming app: one code per phone, optional end date,
 * optionally tied to a league. Streaming-only customers don't need a league here at all.
 */
export default async function AdminStreamCodesPage() {
  const supabase = createSupabaseAdminClient();
  const { leagues } = await getAdminLeagueContext();
  const { data } = await supabase.from("stream_license").select("*").order("created_at", { ascending: false });
  const codes = (data ?? []) as StreamLicense[];
  const leagueName = new Map(leagues.map((l) => [l.id, l.name]));

  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, margin: "4px 0 4px" }}>Stream codes</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>
        Activation codes for the Pinoy Hoops Live streaming app. Each code unlocks one phone. Phones re-check whenever
        they&apos;re online (at least every 14 days), so switching a code off or changing its end date reaches the phone
        then — never in the middle of a game.
      </p>

      <form
        action={createStreamCodesAction}
        className="card"
        style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}
      >
        <h2 className="section-title" style={{ margin: 0 }}>
          New code
        </h2>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Label (who it&apos;s for)</span>
          <input type="text" name="label" required placeholder="e.g. Team Tipuno" style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>How many phones</span>
            <input type="number" name="quantity" min={1} max={20} defaultValue={1} style={{ ...inputStyle, maxWidth: 100 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>League (optional)</span>
            <select name="leagueId" defaultValue="" style={inputStyle}>
              <option value="">— Streaming only, no league —</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Valid until (end of day)</span>
            <input type="date" name="expiresOn" defaultValue={dateInputValue(90)} style={inputStyle} />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, paddingBottom: 10 }}>
            <input type="checkbox" name="noExpiry" />
            No end date (lifetime)
          </label>
        </div>
        <button type="submit" className="button-primary" style={{ alignSelf: "flex-start" }}>
          Create code
        </button>
      </form>

      {codes.length === 0 ? (
        <p className="card" style={{ padding: 16, color: "var(--muted)" }}>No codes yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {codes.map((l) => {
            const state = codeState(l);
            return (
              <div key={l.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: 1 }}>{l.code}</p>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: "2px 0 0" }}>
                      {l.label}
                      {l.league_id && leagueName.get(l.league_id) ? (
                        <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {leagueName.get(l.league_id)}</span>
                      ) : null}
                    </p>
                  </div>
                  <span className={`badge badge--${state.badge}`}>{state.text}</span>
                </div>

                <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>Valid until: {l.expires_at ? dateOnly.format(new Date(l.expires_at)) : "no end date (lifetime)"}</span>
                  {l.installation_id ? (
                    <>
                      <span>Phone: {l.device_label ?? "Android phone"}</span>
                      {l.activated_at && (
                        <span>
                          Activated <LocalTime iso={l.activated_at} />
                        </span>
                      )}
                      {l.last_seen_at && (
                        <span>
                          Last checked in <LocalTime iso={l.last_seen_at} />
                        </span>
                      )}
                    </>
                  ) : (
                    <span>Not activated on any phone yet</span>
                  )}
                </div>

                <form action={setStreamExpiryAction} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="hidden" name="id" value={l.id} />
                  <input
                    type="date"
                    name="expiresOn"
                    defaultValue={l.expires_at ? isoToPhLocal(l.expires_at).slice(0, 10) : dateInputValue(90)}
                    style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
                  />
                  <button type="submit" className="button-secondary" style={smallButton}>
                    Set end date
                  </button>
                  {l.expires_at && (
                    <button type="submit" name="clear" value="1" className="button-secondary" style={smallButton}>
                      Make lifetime
                    </button>
                  )}
                </form>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {/* Its own form with the new status in a hidden field: React overwrites the `name` of any
                      button whose formAction is a server action, so a name/value on the button would be lost. */}
                  <form action={setStreamCodeStatusAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="status" value={l.status === "active" ? "revoked" : "active"} />
                    <button type="submit" className="button-secondary" style={smallButton}>
                      {l.status === "active" ? "Switch off" : "Switch back on"}
                    </button>
                  </form>
                  <form style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input type="hidden" name="id" value={l.id} />
                  {l.installation_id && (
                    <ConfirmButton
                      message={`Release ${l.code} from "${l.device_label ?? "this phone"}"? That phone loses access at its next check, and the code can then be activated on a new phone.`}
                      formAction={releaseStreamPhoneAction}
                      style={{ ...smallButton, cursor: "pointer" }}
                    >
                      Release phone
                    </ConfirmButton>
                  )}
                  <ConfirmButton
                    message={`Delete ${l.code} permanently? Any phone using it loses access at its next check.`}
                    formAction={deleteStreamCodeAction}
                    style={{ ...smallButton, color: "var(--red)", cursor: "pointer" }}
                  >
                    Delete
                  </ConfirmButton>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
