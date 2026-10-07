import Link from "next/link";
import { searchPlayers } from "../../lib/playerPage";
import { PlayerAvatar } from "../../components/PlayerAvatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Players · House of Stats" };

export default async function PlayersPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const hits = await searchPlayers(q);

  return (
    <main className="page" style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 24, margin: "4px 0 16px" }}>Find a player</h1>

      <form method="get" action="/players" style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Player name or nickname"
          autoComplete="off"
          style={{ flex: 1, padding: "11px 13px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", fontSize: 15 }}
        />
        <button type="submit" className="button-primary">
          Search
        </button>
      </form>

      {q.length > 0 && q.length < 2 && <p style={{ color: "var(--muted)" }}>Type at least 2 letters.</p>}
      {q.length >= 2 && hits.length === 0 && <p style={{ color: "var(--muted)" }}>No players match &ldquo;{q}&rdquo;.</p>}

      {hits.length > 0 && (
        <ul className="card" style={{ listStyle: "none", margin: 0, padding: "4px 14px" }}>
          {hits.map((p) => (
            <li key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <Link href={`/players/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", textDecoration: "none", color: "inherit" }}>
                <PlayerAvatar name={p.fullName} photoUrl={p.photoUrl} size={40} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700 }}>
                    {p.fullName}
                    {p.jersey && <span style={{ color: "var(--muted)", fontWeight: 500 }}> #{p.jersey}</span>}
                  </span>
                  <span style={{ display: "block", fontSize: 13, color: "var(--muted)" }}>
                    {[p.teamName, p.leagueName].filter(Boolean).join(" · ") || "No team yet"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
