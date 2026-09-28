import Link from "next/link";
import type { LeagueSummary } from "../../lib/leagueSummary";
import { AddLeagueModal } from "./AddLeagueModal";

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function statusLabel(status: string): { label: string; className: string } {
  if (status === "active") return { label: "In season", className: "status-pill--active" };
  if (status === "complete") return { label: "Finished", className: "status-pill--complete" };
  if (status === "upcoming") return { label: "Upcoming", className: "status-pill--upcoming" };
  return { label: status, className: "" };
}

export function LeaguesSection({ leagues }: { leagues: LeagueSummary[] }) {
  return (
    <section id="leagues" className="section-band">
      <div className="wide-page">
        <div className="section-band__head">
          <h2 className="section-band__title">Leagues</h2>
          <span className="section-band__link" style={{ cursor: "default" }}>
            {leagues.length} {leagues.length === 1 ? "league" : "leagues"}
          </span>
        </div>

        <div className="league-grid">
          {leagues.map((l) => {
            const status = statusLabel(l.seasonStatus);
            return (
              <Link href={`/leagues/${l.slug}`} className="league-card" key={l.id}>
                {l.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.logoUrl} alt="" className="league-card__badge" style={{ objectFit: "contain" }} />
                ) : (
                  <div className="league-card__badge">{initials(l.name)}</div>
                )}
                <div className="league-card__body">
                  <p className="league-card__name">{l.name}</p>
                  <p className="league-card__meta">
                    {[l.seasonName, l.teamCount > 0 ? `${l.teamCount} teams` : null].filter(Boolean).join(" · ")}
                  </p>
                  {status.label && <span className={`status-pill ${status.className}`}>{status.label}</span>}
                </div>
              </Link>
            );
          })}

          <AddLeagueModal />
        </div>
      </div>
    </section>
  );
}
