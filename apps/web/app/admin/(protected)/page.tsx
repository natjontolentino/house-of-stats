import Link from "next/link";
import { getAdminLeagueContext } from "../../../lib/adminLeague";
import { createLeagueAction } from "./leagueSwitchActions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { league } = await getAdminLeagueContext();

  return (
    <main className="page">
      <h1 style={{ fontSize: 24, margin: "4px 0 20px" }}>Admin</h1>
      <p style={{ fontSize: 16, color: "var(--muted)", margin: "-10px 0 20px" }}>
        Managing <strong style={{ fontWeight: 800, color: "var(--text)" }}>{league.name}</strong> — switch leagues
        from the dropdown above.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <Link href="/admin/league" className="card" style={{ padding: 18, textDecoration: "none", color: "var(--text)" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>League</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Name, logo, clock and mobile login</div>
        </Link>
        <Link href="/admin/teams" className="card" style={{ padding: 18, textDecoration: "none", color: "var(--text)" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Teams &amp; rosters</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Team names, logos, and players</div>
        </Link>
        <Link href="/admin/games" className="card" style={{ padding: 18, textDecoration: "none", color: "var(--text)" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Games</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Schedule new games</div>
        </Link>
        <Link href="/admin/leads" className="card" style={{ padding: 18, textDecoration: "none", color: "var(--text)" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Leads</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Inquiries from the public site</div>
        </Link>
      </div>

      <h2 className="section-title">Add another league</h2>
      <form action={createLeagueAction} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          Creates a new league with a first season and switches the admin to it. Then add its logo, teams, and a
          mobile login code from the League tab.
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
