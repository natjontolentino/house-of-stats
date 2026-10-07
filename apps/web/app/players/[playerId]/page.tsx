import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPlayerProfile } from "../../../lib/playerPage";
import { formatPhTime } from "../../../lib/time";
import { PlayerAvatar } from "../../../components/PlayerAvatar";
import { PlayerShotChartPanel } from "../../../components/PlayerShotChartPanel";
import { TeamLogo } from "../../../components/TeamLogo";

export const dynamic = "force-dynamic";

function pct(value: number | null): string {
  return value === null ? "-" : `${Math.round(value * 100)}%`;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__value">{value}</div>
      <div className="stat-tile__label">{label}</div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: { playerId: string } }) {
  const profile = await fetchPlayerProfile(params.playerId);
  return { title: profile ? `${profile.displayName} · House of Stats` : "Player · House of Stats" };
}

export default async function PlayerPage({ params }: { params: { playerId: string } }) {
  const profile = await fetchPlayerProfile(params.playerId);
  if (!profile) notFound();

  const { player, displayName, jersey, team, league, season, seasonLine, games } = profile;
  const gameOptions = games.map((g) => ({
    gameId: g.gameId,
    label: `${g.isHome ? "vs" : "@"} ${g.opponent.short_name} · ${formatPhTime(g.playedAt).replace(/ \d+:\d+ [AP]M PHT$/, "")}`,
  }));

  return (
    <main className="page">
      <header className="card player-hero">
        <PlayerAvatar name={player.full_name} photoUrl={player.photo_url} size={96} />
        <div style={{ minWidth: 0 }}>
          <h1 className="player-hero__name">
            {displayName}
            {jersey && <span className="player-hero__jersey">#{jersey}</span>}
          </h1>
          {player.full_name !== displayName && <p className="player-hero__sub">{player.full_name}</p>}
          <p className="player-hero__sub" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {team && (
              <>
                <TeamLogo url={team.logo_url} size={18} />
                <span>{team.name}</span>
              </>
            )}
            {league && (
              <>
                <span aria-hidden="true">·</span>
                <Link href={`/leagues/${league.slug}`}>{league.name}</Link>
              </>
            )}
            {season && (
              <>
                <span aria-hidden="true">·</span>
                <span>{season.name}</span>
              </>
            )}
          </p>
        </div>
      </header>

      <section style={{ marginTop: 22 }}>
        <h2 className="section-title">Season averages</h2>
        {seasonLine ? (
          <div className="stat-tiles">
            <Tile label="GP" value={String(seasonLine.gamesPlayed)} />
            <Tile label="PTS" value={seasonLine.pointsPerGame.toFixed(1)} />
            <Tile label="REB" value={seasonLine.reboundsPerGame.toFixed(1)} />
            <Tile label="AST" value={seasonLine.assistsPerGame.toFixed(1)} />
            <Tile label="STL" value={seasonLine.stealsPerGame.toFixed(1)} />
            <Tile label="BLK" value={seasonLine.blocksPerGame.toFixed(1)} />
            <Tile label="FG%" value={pct(seasonLine.fieldGoalPct)} />
            <Tile label="3P%" value={pct(seasonLine.threePointPct)} />
            <Tile label="FT%" value={pct(seasonLine.ftPct)} />
            <Tile label="EFF" value={seasonLine.efficiencyPerGame.toFixed(1)} />
          </div>
        ) : (
          <p className="card" style={{ padding: 16, color: "var(--muted)" }}>
            No finished games yet — averages appear once this player has played a final game.
          </p>
        )}
      </section>

      <section style={{ marginTop: 26 }}>
        <h2 className="section-title">Shot chart</h2>
        <PlayerShotChartPanel
          playerName={displayName}
          playerZones={profile.playerZones}
          teamZones={profile.teamZones}
          games={gameOptions}
        />
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 2px 0" }}>
          Zones come from shots the stat tracker tagged with a location. Shots recorded without one count toward the totals but aren&apos;t drawn on the court.
        </p>
      </section>

      <section style={{ marginTop: 26 }}>
        <h2 className="section-title">Game log</h2>
        {games.length === 0 ? (
          <p className="card" style={{ padding: 16, color: "var(--muted)" }}>
            No games played yet.
          </p>
        ) : (
          <div className="card" style={{ overflowX: "auto", padding: "4px 4px" }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>PTS</th>
                  <th>REB</th>
                  <th>AST</th>
                  <th>STL</th>
                  <th>BLK</th>
                  <th>FG</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => {
                  const done = g.status === "finalized";
                  const won = g.teamScore > g.opponentScore;
                  const l = g.line;
                  return (
                    <tr key={g.gameId}>
                      <td>
                        <Link href={`/games/${g.gameId}`}>{formatPhTime(g.playedAt).replace(/ \d+:\d+ [AP]M PHT$/, "")}</Link>
                      </td>
                      <td>
                        {g.isHome ? "vs" : "@"} {g.opponent.short_name}
                      </td>
                      <td>
                        {done ? (
                          <strong style={{ color: won ? "var(--green)" : g.teamScore === g.opponentScore ? "var(--muted)" : "var(--red)" }}>
                            {won ? "W" : g.teamScore === g.opponentScore ? "T" : "L"}
                          </strong>
                        ) : (
                          <span style={{ color: "var(--accent-dark)", fontWeight: 700 }}>Live</span>
                        )}{" "}
                        {g.teamScore}-{g.opponentScore}
                      </td>
                      <td>{l ? l.points : "-"}</td>
                      <td>{l ? l.reboundsTotal : "-"}</td>
                      <td>{l ? l.assists : "-"}</td>
                      <td>{l ? l.steals : "-"}</td>
                      <td>{l ? l.blocks : "-"}</td>
                      <td>{l ? `${l.fieldGoalMade}/${l.fieldGoalAttempted}` : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
