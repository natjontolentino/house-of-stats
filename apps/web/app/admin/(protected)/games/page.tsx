import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";
import { SEED_SEASON_ID } from "@courtstats/shared";
import { createGameAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage() {
  const supabase = createSupabaseAdminClient();
  const { data: teams } = await supabase.from("team").select("*").eq("season_id", SEED_SEASON_ID).order("name");
  const { data: games } = await supabase
    .from("game")
    .select("*")
    .eq("season_id", SEED_SEASON_ID)
    .order("scheduled_at", { ascending: false });

  const teamsById: Record<string, { name: string; short_name: string }> = {};
  (teams ?? []).forEach((t) => (teamsById[t.id] = t));

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, margin: "4px 0 20px" }}>Games</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {(games ?? []).map((g) => (
          <div key={g.id} className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {teamsById[g.away_team_id]?.short_name ?? "?"} @ {teamsById[g.home_team_id]?.short_name ?? "?"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {new Date(g.scheduled_at).toLocaleString()} {g.court_label ? `· ${g.court_label}` : ""}
              </div>
            </div>
            <span className={`badge badge--${g.status === "in_progress" ? "live" : g.status === "finalized" ? "final" : "scheduled"}`}>
              {g.status === "in_progress" ? "Live" : g.status === "finalized" ? "Final" : "Scheduled"}
            </span>
          </div>
        ))}
        {(games ?? []).length === 0 && <p style={{ color: "var(--muted)" }}>No games yet — schedule the first one below.</p>}
      </div>

      <h2 className="section-title">Schedule a game</h2>
      {(teams ?? []).length < 2 ? (
        <p className="card" style={{ padding: 16, color: "var(--muted)" }}>
          Add at least two teams first, on the Teams &amp; rosters page.
        </p>
      ) : (
        <form action={createGameAction} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Away team</span>
            <select name="awayTeamId" required style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}>
              {(teams ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Home team</span>
            <select name="homeTeamId" required defaultValue={(teams ?? [])[1]?.id} style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}>
              {(teams ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Date &amp; time</span>
            <input
              type="datetime-local"
              name="scheduledAt"
              required
              style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Court (optional)</span>
            <input
              type="text"
              name="courtLabel"
              placeholder="e.g. Court 1"
              style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
            />
          </label>
          <button type="submit" className="button-primary" style={{ alignSelf: "flex-start" }}>
            Schedule game
          </button>
        </form>
      )}
    </main>
  );
}
