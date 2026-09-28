import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";
import { getAdminLeagueContext } from "../../../../lib/adminLeague";
import { updateLeagueAction, setLeagueLoginCodeAction, updateClockSettingsAction, deleteLeagueAction } from "./actions";
import { createLeagueAction } from "../leagueSwitchActions";
import { DeleteLeagueForm } from "../../../../components/admin/DeleteLeagueForm";
import { resolveLeagueSettings } from "@courtstats/shared";

export const dynamic = "force-dynamic";

export default async function AdminLeaguePage() {
  const supabase = createSupabaseAdminClient();
  const { league: selected } = await getAdminLeagueContext();
  const leagueId = selected.id;
  const { data: league } = await supabase.from("league").select("*").eq("id", leagueId).single();
  const settings = resolveLeagueSettings(league?.settings);
  const { data: credential } = await supabase
    .from("league_credential")
    .select("league_id")
    .eq("league_id", leagueId)
    .maybeSingle();
  const { count: leagueCount } = await supabase.from("league").select("id", { count: "exact", head: true });

  return (
    <main className="page" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, margin: "4px 0 20px" }}>League</h1>

      <form action={updateLeagueAction} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="leagueId" value={leagueId} />

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>League name</span>
          <input
            type="text"
            name="name"
            defaultValue={league?.name ?? ""}
            required
            style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Logo</span>
          {league?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={league.logo_url} alt="Current league logo" style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 4 }} />
          )}
          <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Leave blank to keep the current logo.</span>
        </label>

        <button type="submit" className="button-primary" style={{ alignSelf: "flex-start" }}>
          Save
        </button>
      </form>

      <h2 className="section-title" style={{ marginTop: 28 }}>
        Game clock
      </h2>
      <form
        action={updateClockSettingsAction}
        className="card"
        style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <input type="hidden" name="leagueId" value={leagueId} />
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          Player minutes can only be worked out from a running clock, so leave this off only if you don&apos;t need
          minutes. The clock stops by itself on a timeout, a foul, and at the end of a period.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Clock</span>
          <select
            name="clockMode"
            defaultValue={settings.clock_mode}
            style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
          >
            <option value="off">Off — no clock, no minutes</option>
            <option value="tracker">Tracker runs the clock (Start/Stop on the tracker&apos;s phone)</option>
            <option value="companion">Companion — a second person runs the clock on another phone</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Period length (minutes)</span>
          <input
            type="number"
            name="periodLengthMinutes"
            min={1}
            max={60}
            defaultValue={settings.period_length_minutes}
            required
            style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", maxWidth: 120 }}
          />
        </label>
        <button type="submit" className="button-primary" style={{ alignSelf: "flex-start" }}>
          Save clock settings
        </button>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
          Trackers pick up a change the next time they open the game while online.
        </p>
      </form>

      <h2 className="section-title" style={{ marginTop: 28 }}>
        Mobile device login
      </h2>
      <form
        action={setLeagueLoginCodeAction}
        className="card"
        style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <input type="hidden" name="leagueId" value={leagueId} />
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          {credential
            ? "A login code is set. Trackers enter it on the mobile app to sign into this league — the same phone or tablet can log out and log into a different league's code later."
            : "No login code set yet. Set one so trackers can sign the mobile app into this league."}
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{credential ? "Set a new code" : "Login code"}</span>
          <input
            type="text"
            name="code"
            required
            minLength={4}
            placeholder="At least 4 characters"
            style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", maxWidth: 220 }}
          />
        </label>
        <button type="submit" className="button-primary" style={{ alignSelf: "flex-start" }}>
          {credential ? "Update code" : "Set code"}
        </button>
      </form>

      <h2 className="section-title" style={{ marginTop: 28 }}>
        Add another league
      </h2>
      <form action={createLeagueAction} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          Creates a new league with a first season and switches the admin to it. Then add its logo, teams, and a mobile login code.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>New league name</span>
          <input
            type="text"
            name="name"
            required
            style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
          />
        </label>
        <button type="submit" className="button-primary" style={{ alignSelf: "flex-start" }}>
          Create league
        </button>
      </form>

      <h2 className="section-title" style={{ marginTop: 28, color: "var(--red)" }}>
        Danger zone
      </h2>
      {(leagueCount ?? 0) <= 1 ? (
        <p className="card" style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>
          This is the only league, so it can&apos;t be deleted — create another league first if you want to remove
          this one.
        </p>
      ) : (
        <DeleteLeagueForm leagueId={leagueId} leagueName={selected.name} action={deleteLeagueAction} />
      )}
    </main>
  );
}
