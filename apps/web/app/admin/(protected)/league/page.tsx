import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";
import { SEED_LEAGUE_ID } from "@courtstats/shared";
import { updateLeagueAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLeaguePage() {
  const supabase = createSupabaseAdminClient();
  const { data: league } = await supabase.from("league").select("*").eq("id", SEED_LEAGUE_ID).single();

  return (
    <main className="page" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, margin: "4px 0 20px" }}>League</h1>

      <form action={updateLeagueAction} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="leagueId" value={SEED_LEAGUE_ID} />

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
    </main>
  );
}
