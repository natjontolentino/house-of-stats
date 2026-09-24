import Link from "next/link";
import { logoutAction } from "../login/actions";
import { getAdminLeagueContext } from "../../../lib/adminLeague";
import { LeagueSwitcher } from "../../../components/admin/LeagueSwitcher";
import { selectLeagueAction } from "./leagueSwitchActions";

export const dynamic = "force-dynamic";

/** Nav shared by every real admin page. In the "(protected)" route group so /admin/login (outside it) never gets this bar — no point showing "Log out" before you're actually in. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminLeagueContext();
  return (
    <>
      <div style={{ background: "var(--navy-light)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="wide-page"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px" }}
        >
          <nav style={{ display: "flex", gap: 16 }}>
            <Link href="/admin" style={{ color: "white", fontSize: 13, fontWeight: 700 }}>
              Admin
            </Link>
            <Link href="/admin/league" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              League
            </Link>
            <Link href="/admin/teams" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              Teams &amp; rosters
            </Link>
            <Link href="/admin/games" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              Games
            </Link>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LeagueSwitcher leagues={ctx.leagues} currentId={ctx.league.id} action={selectLeagueAction} />
            <Link href="/"style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              View site
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: 0,
                  font: "inherit",
                }}
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
