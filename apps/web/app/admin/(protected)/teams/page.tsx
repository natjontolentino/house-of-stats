import Link from "next/link";
import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";
import { getAdminLeagueContext } from "../../../../lib/adminLeague";
import { createTeamAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const supabase = createSupabaseAdminClient();
  const { season } = await getAdminLeagueContext();
  const { data: teams } = await supabase.from("team").select("*").eq("season_id", season.id).order("name");

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, margin: "4px 0 20px" }}>Teams &amp; rosters</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {(teams ?? []).map((t) => (
          <Link
            key={t.id}
            href={`/admin/teams/${t.id}`}
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, textDecoration: "none", color: "var(--text)" }}
          >
            {t.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logo_url} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: "var(--navy)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {t.short_name}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{t.short_name}</div>
            </div>
          </Link>
        ))}
        {(teams ?? []).length === 0 && <p style={{ color: "var(--muted)" }}>No teams yet — add the first one below.</p>}
      </div>

      <h2 className="section-title">Add a team</h2>
      <form action={createTeamAction} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="seasonId" value={season.id} />
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Team name</span>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Ridgeline Hawks"
            style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Short name</span>
          <input
            type="text"
            name="shortName"
            required
            maxLength={4}
            placeholder="e.g. RDG"
            style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", maxWidth: 120 }}
          />
        </label>
        <button type="submit" className="button-primary" style={{ alignSelf: "flex-start" }}>
          Add team
        </button>
      </form>
    </main>
  );
}
