import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";
import { getAdminLeagueContext } from "../../../../lib/adminLeague";
import { LEAGUE_TIME_ZONE, isoToPhLocal } from "../../../../lib/time";
import { LocalTime } from "../../../../components/LocalTime";
import { ConfirmButton } from "../../../../components/admin/ConfirmButton";
import {
  createStreamCodesAction,
  setStreamCodeStatusAction,
  removeStreamDeviceAction,
  setMaxDevicesAction,
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
  product: "hoops" | "pickle" | "hoops_adv";
  league_id: string | null;
  expires_at: string | null;
  status: "active" | "revoked";
  max_devices: number;
  created_at: string;
}

interface StreamDevice {
  id: string;
  license_id: string;
  device_label: string | null;
  activated_at: string;
  last_seen_at: string | null;
}

function codeState(l: StreamLicense, phones: number): { text: string; badge: string } {
  if (l.status === "revoked") return { text: "Switched off", badge: "scheduled" };
  if (l.expires_at && new Date(l.expires_at) <= new Date()) return { text: "Expired", badge: "stale" };
  if (phones === 0) return { text: "Not used yet", badge: "final" };
  return { text: "Active", badge: "live" };
}

/** Today + n days as a yyyy-mm-dd value for a date input, in Philippine time. */
function dateInputValue(daysFromNow: number): string {
  return isoToPhLocal(new Date(Date.now() + daysFromNow * 86_400_000).toISOString()).slice(0, 10);
}

/**
 * Activation codes for the streaming apps: each code covers a few phones (main phone + camera phones),
 * optional end date, optionally tied to a league. Streaming-only customers don't need a league here at all.
 */
export default async function AdminStreamCodesPage() {
  const supabase = createSupabaseAdminClient();
  const { leagues } = await getAdminLeagueContext();
  const [{ data }, { data: deviceData }] = await Promise.all([
    supabase.from("stream_license").select("*").order("created_at", { ascending: false }),
    supabase.from("stream_device").select("id, license_id, device_label, activated_at, last_seen_at").order("activated_at"),
  ]);
  const codes = (data ?? []) as StreamLicense[];
  const leagueName = new Map(leagues.map((l) => [l.id, l.name]));
  const devicesByCode = new Map<string, StreamDevice[]>();
  for (const d of (deviceData ?? []) as StreamDevice[]) {
    devicesByCode.set(d.license_id, [...(devicesByCode.get(d.license_id) ?? []), d]);
  }

  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, margin: "4px 0 4px" }}>Stream codes</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>
        Activation codes for the Pinoy Hoops Live, Pinoy Hoops Live Stream Advanced and Pinoy Pickle Live streaming
        apps. A code unlocks one app: 1 phone for the single-camera apps, 3 for Advanced (1 main phone + 2 camera
        phones). Raise the limit for spare phones, or remove a phone that&apos;s no longer used to free its place.
        Phones re-check whenever
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
          <span style={{ fontSize: 13, fontWeight: 600 }}>App</span>
          <select name="product" defaultValue="hoops" style={inputStyle}>
            <option value="hoops">Pinoy Hoops Live (basketball) — codes start with PHL</option>
            <option value="hoops_adv">Pinoy Hoops Live Stream Advanced (basketball, multi-camera) — codes start with PHA</option>
            <option value="pickle">Pinoy Pickle Live (pickleball) — codes start with PPL</option>
          </select>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>A code only unlocks the app it was made for.</span>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Label (who it&apos;s for)</span>
          <input type="text" name="label" required placeholder="e.g. Team Tipuno" style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Phones per code</span>
            <input type="number" name="maxDevices" min={1} max={20} placeholder="Auto" style={{ ...inputStyle, maxWidth: 100 }} />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Blank: 3 for Advanced, 1 otherwise</span>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>How many codes</span>
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
            const phones = devicesByCode.get(l.id) ?? [];
            const state = codeState(l, phones.length);
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
                  <span>
                    App:{" "}
                    {l.product === "pickle"
                      ? "Pinoy Pickle Live (pickleball)"
                      : l.product === "hoops_adv"
                        ? "Pinoy Hoops Live Stream Advanced (multi-camera)"
                        : "Pinoy Hoops Live (basketball)"}
                  </span>
                  <span>Valid until: {l.expires_at ? dateOnly.format(new Date(l.expires_at)) : "no end date (lifetime)"}</span>
                  <span>
                    Phones: {phones.length} of {l.max_devices}
                    {phones.length >= l.max_devices ? " (full)" : ""}
                  </span>
                </div>

                {phones.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {phones.map((d, i) => (
                      <form
                        key={d.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          fontSize: 13,
                          padding: "6px 10px",
                          border: "1px solid var(--border-strong)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        <input type="hidden" name="deviceId" value={d.id} />
                        <span>
                          <strong>
                            {i + 1}. {d.device_label ?? "Android phone"}
                          </strong>
                          <span style={{ color: "var(--muted)" }}>
                            {" "}
                            · activated <LocalTime iso={d.activated_at} />
                            {d.last_seen_at && (
                              <>
                                {" "}
                                · last checked in <LocalTime iso={d.last_seen_at} />
                              </>
                            )}
                          </span>
                        </span>
                        <ConfirmButton
                          message={`Remove "${d.device_label ?? "this phone"}" from ${l.code}? That phone loses access at its next check, and its place can be used by another phone.`}
                          formAction={removeStreamDeviceAction}
                          style={{ ...smallButton, cursor: "pointer" }}
                        >
                          Remove phone
                        </ConfirmButton>
                      </form>
                    ))}
                  </div>
                )}

                <form action={setMaxDevicesAction} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="hidden" name="id" value={l.id} />
                  <span style={{ fontSize: 13 }}>Phones allowed</span>
                  <input
                    type="number"
                    name="maxDevices"
                    min={1}
                    max={20}
                    defaultValue={l.max_devices}
                    style={{ ...inputStyle, padding: "6px 8px", fontSize: 12, width: 70 }}
                  />
                  <button type="submit" className="button-secondary" style={smallButton}>
                    Save
                  </button>
                </form>

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
                  <form>
                    <input type="hidden" name="id" value={l.id} />
                    <ConfirmButton
                      message={`Delete ${l.code} permanently? Every phone using it loses access at its next check.`}
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
