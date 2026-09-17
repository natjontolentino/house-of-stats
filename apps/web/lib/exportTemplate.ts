import type { GameBundle } from "./gameData";
import type { LiveGameState } from "@courtstats/shared";
import {
  computeScoreByPeriod,
  computeTeamTotalsFromPlayers,
  selectPlayerOfGame,
  filterVoidedEvents,
  displayPlayerName,
} from "@courtstats/shared";

function playerName(bundle: GameBundle, playerId: string): string {
  const player = bundle.players[playerId];
  return player ? displayPlayerName(player, bundle.settings) : "?";
}

function esc(value: unknown): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (c) => map[c]);
}

function cellStyle(header = false): string {
  return `border:1px solid #ccc;padding:4px 8px;text-align:center;font-weight:${header ? 700 : 400};font-size:${header ? 10 : 12}px;text-transform:${header ? "uppercase" : "none"};`;
}

function winningTeamId(liveState: LiveGameState, bundle: GameBundle): string | null {
  if (liveState.home.score === liveState.away.score) return null;
  return liveState.home.score > liveState.away.score ? bundle.game.home_team_id : bundle.game.away_team_id;
}

function playerOfGame(bundle: GameBundle, liveState: LiveGameState) {
  return selectPlayerOfGame(
    Object.values(liveState.players).map((p) => ({
      playerId: p.playerId,
      teamId: p.teamId,
      efficiency: p.efficiency,
      points: p.points,
      reboundsTotal: p.reboundsTotal,
      assists: p.assists,
    })),
    { winningTeamId: winningTeamId(liveState, bundle), restrictToWinningTeam: bundle.settings.player_of_game_limited_to_winners },
  );
}

/** Per-game PDF scoresheet — spec 12.1. */
export function renderScoresheetHtml(bundle: GameBundle, liveState: LiveGameState): string {
  const periods = computeScoreByPeriod(filterVoidedEvents(bundle.events), bundle.game.home_team_id, bundle.game.away_team_id);
  const homeTotals = computeTeamTotalsFromPlayers(bundle.game.home_team_id, liveState.players, liveState.teams[bundle.game.home_team_id]);
  const awayTotals = computeTeamTotalsFromPlayers(bundle.game.away_team_id, liveState.players, liveState.teams[bundle.game.away_team_id]);
  const pog = playerOfGame(bundle, liveState);

  const teamSection = (teamId: string, teamName: string, totals: ReturnType<typeof computeTeamTotalsFromPlayers>) => {
    const ids = bundle.rosterByTeam[teamId] ?? [];
    const headers = ["#", "Player", "PTS", "2PT", "3PT", "FT", "REB", "AST", "STL", "BLK", "TO", "PF"];
    const rows = ids
      .map((pid) => {
        const p = liveState.players[pid];
        const player = bundle.players[pid];
        if (!p || !player) return "";
        return `<tr>
          <td style="${cellStyle()}">${esc(bundle.jerseyByPlayer[pid])}</td>
          <td style="${cellStyle()};text-align:left">${esc(playerName(bundle, pid))}</td>
          <td style="${cellStyle()}">${p.points}</td>
          <td style="${cellStyle()}">${p.twoPointMade}/${p.twoPointAttempted}</td>
          <td style="${cellStyle()}">${p.threePointMade}/${p.threePointAttempted}</td>
          <td style="${cellStyle()}">${p.ftMade}/${p.ftAttempted}</td>
          <td style="${cellStyle()}">${p.reboundsTotal}</td>
          <td style="${cellStyle()}">${p.assists}</td>
          <td style="${cellStyle()}">${p.steals}</td>
          <td style="${cellStyle()}">${p.blocks}</td>
          <td style="${cellStyle()}">${p.turnovers}</td>
          <td style="${cellStyle()}">${p.personalFouls}</td>
        </tr>`;
      })
      .join("");

    return `<table style="width:100%;border-collapse:collapse;margin-top:8px">
      <caption style="text-align:left;font-weight:700;padding:4px 0">${esc(teamName)}</caption>
      <thead><tr>${headers.map((h) => `<th style="${cellStyle(true)}">${h}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows}
        <tr style="font-weight:700">
          <td style="${cellStyle()}"></td>
          <td style="${cellStyle()};text-align:left">Totals</td>
          <td style="${cellStyle()}">${totals.points}</td>
          <td style="${cellStyle()}">${totals.fieldGoalMade - totals.threePointMade}/${totals.fieldGoalAttempted - totals.threePointAttempted}</td>
          <td style="${cellStyle()}">${totals.threePointMade}/${totals.threePointAttempted}</td>
          <td style="${cellStyle()}">${totals.ftMade}/${totals.ftAttempted}</td>
          <td style="${cellStyle()}">${totals.reboundsOffensive + totals.reboundsDefensive}</td>
          <td style="${cellStyle()}">${totals.assists}</td>
          <td style="${cellStyle()}">${totals.steals}</td>
          <td style="${cellStyle()}">${totals.blocks}</td>
          <td style="${cellStyle()}">${totals.turnovers}</td>
          <td style="${cellStyle()}">${totals.personalFouls}</td>
        </tr>
      </tbody>
    </table>`;
  };

  const periodHeaderCells = periods.map((p) => `<th style="${cellStyle(true)}">Q${p.period}</th>`).join("");
  const awayPeriodCells = periods.map((p) => `<td style="${cellStyle()}">${p.awayPoints}</td>`).join("");
  const homePeriodCells = periods.map((p) => `<td style="${cellStyle()}">${p.homePoints}</td>`).join("");

  const signatureBlock = bundle.settings.signature_capture_at_finalize
    ? `<div style="margin-top:32px;display:flex;justify-content:space-between">
        <div style="border-top:1px solid #333;width:180px;padding-top:4px">Home coach</div>
        <div style="border-top:1px solid #333;width:180px;padding-top:4px">Away coach</div>
        <div style="border-top:1px solid #333;width:180px;padding-top:4px">Referee</div>
      </div>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }</style>
  </head>
  <body>
    <h1 style="font-size:18px;margin-bottom:0">${esc(bundle.awayTeam.name)} @ ${esc(bundle.homeTeam.name)}</h1>
    <p style="color:#555;margin-top:4px">${esc(new Date(bundle.game.scheduled_at).toLocaleString())} · ${esc(bundle.game.court_label ?? "")}</p>

    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <thead><tr><th style="${cellStyle(true)}">Team</th>${periodHeaderCells}<th style="${cellStyle(true)}">Final</th></tr></thead>
      <tbody>
        <tr>
          <td style="${cellStyle()};text-align:left">${esc(bundle.awayTeam.short_name)}</td>
          ${awayPeriodCells}
          <td style="${cellStyle()};font-weight:700">${liveState.away.score}</td>
        </tr>
        <tr>
          <td style="${cellStyle()};text-align:left">${esc(bundle.homeTeam.short_name)}</td>
          ${homePeriodCells}
          <td style="${cellStyle()};font-weight:700">${liveState.home.score}</td>
        </tr>
      </tbody>
    </table>

    <p style="margin-top:12px;font-size:12px">
      Team fouls: ${esc(bundle.awayTeam.short_name)} ${liveState.away.teamFoulCount} · ${esc(bundle.homeTeam.short_name)} ${liveState.home.teamFoulCount}
    </p>
    <p style="font-size:12px">
      Timeouts used: ${esc(bundle.awayTeam.short_name)} ${liveState.away.timeoutBoxes.filter((b) => b.status === "used").length}
      (${liveState.away.timeoutBoxes.filter((b) => b.status === "expired").length} expired) ·
      ${esc(bundle.homeTeam.short_name)} ${liveState.home.timeoutBoxes.filter((b) => b.status === "used").length}
      (${liveState.home.timeoutBoxes.filter((b) => b.status === "expired").length} expired)
    </p>

    ${teamSection(bundle.game.away_team_id, bundle.awayTeam.name, awayTotals)}
    ${teamSection(bundle.game.home_team_id, bundle.homeTeam.name, homeTotals)}

    ${pog ? `<p style="margin-top:16px;font-weight:700">Player of the game: ${esc(playerName(bundle, pog.playerId))}</p>` : ""}
    ${signatureBlock}
  </body>
</html>`;
}

/** Shareable JPEG graphic — spec 12.2. Sized for social media, readable at phone size. */
export function renderGraphicHtml(bundle: GameBundle, liveState: LiveGameState): string {
  const players = Object.values(liveState.players).sort((a, b) => b.efficiency - a.efficiency);
  const top = players.slice(0, 3);
  const pog = playerOfGame(bundle, liveState);

  const topBlocks = top
    .map(
      (p) => `<div style="text-align:center">
        <div style="font-size:22px;font-weight:700">${esc(playerName(bundle, p.playerId))}</div>
        <div style="font-size:16px;opacity:0.7">${p.points} PTS · ${p.reboundsTotal} REB · ${p.assists} AST</div>
      </div>`,
    )
    .join("");

  const pogBlock = pog
    ? `<div style="margin-top:48px;text-align:center">
        <div style="font-size:18px;opacity:0.7">Player of the game</div>
        <div style="font-size:32px;font-weight:700">${esc(playerName(bundle, pog.playerId))}</div>
      </div>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>body { margin: 0; font-family: Arial, sans-serif; }</style>
  </head>
  <body>
    <div style="width:1080px;height:1080px;background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;box-sizing:border-box">
      <div style="font-size:28px;opacity:0.7;margin-bottom:24px">Final</div>
      <div style="display:flex;align-items:center;gap:40px">
        <div style="text-align:center">
          <div style="font-size:28px;opacity:0.8">${esc(bundle.awayTeam.short_name)}</div>
          <div style="font-size:96px;font-weight:800;font-variant-numeric:tabular-nums">${liveState.away.score}</div>
        </div>
        <div style="font-size:36px;opacity:0.5">–</div>
        <div style="text-align:center">
          <div style="font-size:28px;opacity:0.8">${esc(bundle.homeTeam.short_name)}</div>
          <div style="font-size:96px;font-weight:800;font-variant-numeric:tabular-nums">${liveState.home.score}</div>
        </div>
      </div>
      ${pogBlock}
      <div style="margin-top:40px;display:flex;gap:32px">${topBlocks}</div>
    </div>
  </body>
</html>`;
}
