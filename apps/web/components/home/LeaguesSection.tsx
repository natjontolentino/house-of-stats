import type { LeagueSummary } from "../../lib/leagueSummary";

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function statusLabel(status: string): string {
  if (status === "active") return "In season";
  if (status === "complete") return "Finished";
  if (status === "upcoming") return "Upcoming";
  return status;
}

export function LeaguesSection({ leagues }: { leagues: LeagueSummary[] }) {
  return (
    <section id="leagues" className="section-band">
      <div className="wide-page">
        <div className="section-band__head">
          <h2 className="section-band__title">Leagues</h2>
          <a href="#" className="section-band__link">
            See all leagues →
          </a>
        </div>

        <div className="league-grid">
          {leagues.map((l) => (
            <div className="league-card" key={l.id}>
              {l.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={l.logoUrl}
                  alt=""
                  className="league-card__badge"
                  style={{ objectFit: "contain", background: "var(--cream-bg)" }}
                />
              ) : (
                <div className="league-card__badge">{initials(l.name)}</div>
              )}
              <div>
                <p className="league-card__name">{l.name}</p>
                <p className="league-card__meta">
                  {[l.seasonName, l.teamCount > 0 ? `${l.teamCount} teams` : null, statusLabel(l.seasonStatus)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
          ))}

          <a href="#" className="league-card league-card--add" style={{ textDecoration: "none" }}>
            <div className="league-card__plus">+</div>
            <div>
              <p className="league-card__name" style={{ color: "var(--accent-dark)" }}>
                Add your league
              </p>
              <p className="league-card__meta">One season, one price</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
