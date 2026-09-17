import Link from "next/link";
import { createSupabaseClient } from "../lib/supabaseClient";

export const dynamic = "force-dynamic";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "in_progress") return <span className="badge badge--live">Live</span>;
  if (status === "finalized") return <span className="badge badge--final">Final</span>;
  return <span className="badge badge--scheduled">Scheduled</span>;
}

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
    <main className="page">
      <h1 style={{ fontSize: 24, margin: "4px 0 2px" }}>Sunset Rec League</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 20px", fontSize: 14 }}>2026 Winter Season</p>

      <h2 className="section-title">Schedule</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(games ?? []).map((g) => {
          const home = teamById.get(g.home_team_id);
          const away = teamById.get(g.away_team_id);
          return (
            <Link
              key={g.id}
              href={`/games/${g.id}`}
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 16px",
                textDecoration: "none",
                color: "var(--text)",
                transition: "box-shadow 0.15s ease, transform 0.15s ease",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {away?.short_name ?? "?"} @ {home?.short_name ?? "?"}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2 }}>
                  {formatWhen(g.scheduled_at)} · {g.court_label}
                </div>
              </div>
              <StatusBadge status={g.status} />
            </Link>
          );
        })}
        {(games ?? []).length === 0 && (
          <p className="card" style={{ padding: 16, color: "var(--muted)" }}>
            No games scheduled yet.
          </p>
        )}
      </div>
    </main>
  );
}
