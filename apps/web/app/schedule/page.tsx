import Link from "next/link";
import { fetchSchedule, type ScheduleGame } from "../../lib/schedule";
import { LocalTime } from "../../components/LocalTime";

export const dynamic = "force-dynamic";

function badge(status: string): { label: string; className: string } {
  if (status === "in_progress") return { label: "Live", className: "badge badge--live" };
  if (status === "finalized") return { label: "Final", className: "badge badge--final" };
  return { label: "Scheduled", className: "badge badge--scheduled" };
}

function GameRow({ g }: { g: ScheduleGame }) {
  const b = badge(g.status);
  return (
    <Link
      href={`/games/${g.id}`}
      className="card"
      style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--text)" }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          {g.awayTeam} @ {g.homeTeam}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          <LocalTime iso={g.scheduledAt} /> {g.courtLabel ? `· ${g.courtLabel}` : ""} · {g.leagueName}
        </div>
      </div>
      <span className={b.className}>{b.label}</span>
    </Link>
  );
}

export default async function SchedulePage() {
  const games = await fetchSchedule();
  const upcoming = games.filter((g) => g.status !== "finalized");
  const results = games.filter((g) => g.status === "finalized").reverse();

  return (
    <main className="page">
      <h1 style={{ fontSize: 24, margin: "4px 0 20px" }}>Schedule</h1>

      <h2 className="section-title">Live and upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="card" style={{ padding: 16, color: "var(--muted)", marginBottom: 28 }}>No games scheduled.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {upcoming.map((g) => (
            <GameRow key={g.id} g={g} />
          ))}
        </div>
      )}

      <h2 className="section-title">Results</h2>
      {results.length === 0 ? (
        <p className="card" style={{ padding: 16, color: "var(--muted)" }}>No finished games yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {results.map((g) => (
            <GameRow key={g.id} g={g} />
          ))}
        </div>
      )}
    </main>
  );
}
