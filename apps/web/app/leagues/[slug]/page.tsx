import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { fetchLeagueBySlug } from "../../../lib/leaguePage";
import { COOKIE_NAME, isValidSessionCookie } from "../../../lib/adminSession";
import { selectLeagueAction } from "../../admin/(protected)/leagueSwitchActions";
import { StandingsTable } from "../../../components/StandingsTable";
import { TeamLogo } from "../../../components/TeamLogo";

export const dynamic = "force-dynamic";

function statusBadge(status: string): { label: string; className: string } {
  if (status === "in_progress") return { label: "Live", className: "badge badge--live" };
  if (status === "finalized") return { label: "Final", className: "badge badge--final" };
  return { label: "Scheduled", className: "badge badge--scheduled" };
}

export default async function LeaguePage({ params }: { params: { slug: string } }) {
  const data = await fetchLeagueBySlug(params.slug);
  if (!data) notFound();
  const { league, season, teams, games, stats } = data;

  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const isAdmin = await isValidSessionCookie(cookies().get(COOKIE_NAME)?.value);

  return (
    <main className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "4px 0 24px" }}>
        {league.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={league.logo_url} alt="" style={{ width: 64, height: 64, objectFit: "contain" }} />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 26, margin: 0 }}>{league.name}</h1>
          <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: 14 }}>
            {season ? `${season.name} · ${teams.length} ${teams.length === 1 ? "team" : "teams"}` : "No season yet"}
          </p>
        </div>
        {isAdmin && (
          <form action={selectLeagueAction}>
            <input type="hidden" name="leagueId" value={league.id} />
            <input type="hidden" name="next" value="/admin/league" />
            <button type="submit" className="button-secondary">
              Edit this league
            </button>
          </form>
        )}
      </div>

      <h2 className="section-title">Games</h2>
      {games.length === 0 ? (
        <p className="card" style={{ padding: 16, color: "var(--muted)", marginBottom: 28 }}>
          No games scheduled yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {games.map((g) => {
            const badge = statusBadge(g.status);
            return (
              <Link
                key={g.id}
                href={`/games/${g.id}`}
                className="card"
                style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "var(--text)" }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {teamsById[g.away_team_id]?.name ?? "?"} @ {teamsById[g.home_team_id]?.name ?? "?"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {new Date(g.scheduled_at).toLocaleString()} {g.court_label ? `· ${g.court_label}` : ""}
                  </div>
                </div>
                <span className={badge.className}>{badge.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <h2 className="section-title">Standings</h2>
      {stats && stats.standings.length > 0 ? (
        <div style={{ marginBottom: 28 }}>
          <StandingsTable standings={stats.standings} teamsById={stats.teamsById} />
        </div>
      ) : (
        <p className="card" style={{ padding: 16, color: "var(--muted)", marginBottom: 28 }}>
          Standings appear once the first game is finalized.
        </p>
      )}

      <h2 className="section-title">Teams</h2>
      {teams.length === 0 ? (
        <p className="card" style={{ padding: 16, color: "var(--muted)" }}>No teams yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {teams.map((t) => (
            <div key={t.id} className="card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <TeamLogo url={t.logo_url} size={28} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
