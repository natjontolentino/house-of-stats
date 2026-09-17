import Link from "next/link";
import { createSupabaseClient } from "../lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createSupabaseClient();
  const { data: games } = await supabase
    .from("game")
    .select("id, scheduled_at, status, court_label, home_team_id, away_team_id")
    .order("scheduled_at", { ascending: true });

  const teamIds = Array.from(
    new Set((games ?? []).flatMap((g) => [g.home_team_id, g.away_team_id])),
  );
  const { data: teams } = await supabase.from("team").select("id, name, short_name").in("id", teamIds);
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Sunset Rec League</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>2026 Winter Season — schedule</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {(games ?? []).map((g) => {
          const home = teamById.get(g.home_team_id);
          const away = teamById.get(g.away_team_id);
          return (
            <Link
              key={g.id}
              href={`/games/${g.id}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              <span>
                {away?.short_name ?? "?"} @ {home?.short_name ?? "?"}
              </span>
              <span style={{ color: "var(--muted)" }}>
                {new Date(g.scheduled_at).toLocaleString()} · {g.court_label} ·{" "}
                {g.status}
              </span>
            </Link>
          );
        })}
        {(games ?? []).length === 0 && <p>No games seeded yet.</p>}
      </div>
    </main>
  );
}
