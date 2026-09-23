import Link from "next/link";

export default function AdminDashboard() {
  return (
    <main className="page">
      <h1 style={{ fontSize: 24, margin: "4px 0 20px" }}>Admin</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <Link href="/admin/league" className="card" style={{ padding: 18, textDecoration: "none", color: "var(--text)" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>League</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Name and logo</div>
        </Link>
        <Link href="/admin/teams" className="card" style={{ padding: 18, textDecoration: "none", color: "var(--text)" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Teams &amp; rosters</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Team names, logos, and players</div>
        </Link>
        <Link href="/admin/games" className="card" style={{ padding: 18, textDecoration: "none", color: "var(--text)" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Games</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Schedule new games</div>
        </Link>
      </div>
    </main>
  );
}
