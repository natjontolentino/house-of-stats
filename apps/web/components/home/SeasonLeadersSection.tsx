import Link from "next/link";
import type { Player, PlayerSeasonLine } from "@courtstats/shared";
import { displayPlayerName } from "@courtstats/shared";
import { PlayerAvatar } from "../PlayerAvatar";

interface LeaderRow {
  playerId: string;
  name: string;
  fullName: string;
  photoUrl: string | null;
  value: string;
}

interface LeaderCategory {
  title: string;
  rows: LeaderRow[];
}

function topFive(
  players: PlayerSeasonLine[],
  playersById: Record<string, Player>,
  settings: Parameters<typeof displayPlayerName>[1],
  metric: (p: PlayerSeasonLine) => number,
  format: (v: number) => string,
): LeaderRow[] {
  return [...players]
    .sort((a, b) => metric(b) - metric(a))
    .slice(0, 5)
    .map((p) => {
      const player = playersById[p.playerId];
      return {
        playerId: p.playerId,
        name: player ? displayPlayerName(player, settings) : "?",
        fullName: player?.full_name ?? "?",
        photoUrl: player?.photo_url ?? null,
        value: format(metric(p)),
      };
    });
}

/**
 * Season leaders (spec 9.2), computed from real finalized games -- see
 * apps/web/lib/seasonData.ts. Renders an honest "not enough games yet"
 * state instead of ever falling back to placeholder numbers, now that this
 * section is wired to the real computation.
 */
export function SeasonLeadersSection({
  players,
  playersById,
  settings,
}: {
  players: PlayerSeasonLine[];
  playersById: Record<string, Player>;
  settings: Parameters<typeof displayPlayerName>[1];
}) {
  const categories: LeaderCategory[] = [
    {
      title: "Points",
      rows: topFive(players, playersById, settings, (p) => p.pointsPerGame, (v) => v.toFixed(1)),
    },
    {
      title: "Rebounds",
      rows: topFive(players, playersById, settings, (p) => p.reboundsPerGame, (v) => v.toFixed(1)),
    },
    {
      title: "Assists",
      rows: topFive(players, playersById, settings, (p) => p.assistsPerGame, (v) => v.toFixed(1)),
    },
  ];

  const hasData = players.length > 0;

  return (
    <section id="leaders" className="section-band leaders-band">
      <div className="wide-page">
        <div className="section-band__head">
          <h2 className="section-band__title">Season leaders</h2>
        </div>

        {!hasData ? (
          <p className="card" style={{ padding: 16, color: "var(--muted)", background: "var(--panel)" }}>
            No finalized games yet — leaders will appear once games have been played.
          </p>
        ) : (
          <div className="leaders-grid">
            {categories.map((cat) => (
              <div className="leaders-card" key={cat.title}>
                <div className="leaders-card__head">
                  <span className="leaders-card__title">{cat.title}</span>
                  <span className="leaders-card__unit">per game</span>
                </div>
                {cat.rows.map((row, i) => (
                  <div className="leaders-row" key={row.name + i}>
                    <span className={`leaders-row__rank${i < 3 ? ` leaders-row__rank--medal${i + 1}` : ""}`}>{i + 1}</span>
                    <span className="leaders-row__name">
                      <Link
                        href={`/players/${row.playerId}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "inherit", textDecoration: "none", minWidth: 0 }}
                      >
                        <PlayerAvatar name={row.fullName} photoUrl={row.photoUrl} size={26} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                      </Link>
                    </span>
                    <span className="leaders-row__value">{row.value}</span>
                  </div>
                ))}
                {cat.rows.length === 0 && <p style={{ color: "var(--muted-light)", fontSize: 13 }}>No data yet.</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
