import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";
import { getAdminLeagueContext } from "../../../../lib/adminLeague";
import { updateLeagueAction, setLeagueLoginCodeAction } from "./actions";
import { createLeagueAction } from "../leagueSwitchActions";

export const dynamic = "force-dynamic";

export default async function AdminLeaguePage() {
  const supabase = createSupabaseAdminClient();
  const { league: selected } = await getAdminLeagueContext();
  const leagueId = selected.id;
  const { data: league } = await supabase.from("league").select("*").eq("id", leagueId).single();
  const { data: credential } = await supabase
    .from("league_credential")
    .select("league_id")
    .eq("league_id", leagueId)
    .maybeSingle();

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
    </main>
  );
}
