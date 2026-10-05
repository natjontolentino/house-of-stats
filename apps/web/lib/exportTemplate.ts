import type { GameBundle } from "./gameData";
import { formatPhTime } from "./time";
import type { LiveGameState } from "@courtstats/shared";
import {
  computeScoreByPeriod,
  computeTeamTotalsFromPlayers,
  selectPlayerOfGame,
  computeTeamLeaders,
  type GameLeader,
  type LeaderCategory,
  filterVoidedEvents,
  displayPlayerName,
  msToMinutesDisplay,
} from "@courtstats/shared";

function playerName(bundle: GameBundle, playerId: string): string {
  const player = bundle.players[playerId];
  return player ? displayPlayerName(player, bundle.settings) : "?";
}

function esc(value: unknown): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (c) => map[c]);
}

/** Inline team logo for the export HTML; drops itself if the image fails to load rather than leaving a broken-image icon. */
function logoImg(url: string | null, px: number, extraStyle = ""): string {
  if (!url) return "";
  return `<img src="${esc(url)}" alt="" width="${px}" height="${px}" onerror="this.remove()" style="object-fit:contain;vertical-align:middle;${extraStyle}" />`;
}

function cellStyle(header = false): string {
  return `border:1px solid #ccc;padding:3px 8px;text-align:center;font-weight:${header ? 700 : 400};font-size:${header ? 10 : 12}px;text-transform:${header ? "uppercase" : "none"};`;
}

/** The scoresheet's team-totals row: bold, shaded and ruled off so it reads as the tally, not another player. */
const totalsCellStyle =
  "border:1px solid #999;border-top:2px solid #222;padding:3px 8px;text-align:center;font-weight:700;font-size:12px;background:#e9ecf2;";

function shotTotalCell(made: number, attempted: number): string {
  const pct = attempted > 0 ? `<div style="font-size:10px;font-weight:400;color:#444">${Math.round((made / attempted) * 100)}%</div>` : "";
  return `<td style="${totalsCellStyle}">${made}/${attempted}${pct}</td>`;
}

function winningTeamId(liveState: LiveGameState, bundle: GameBundle): string | null {
  if (liveState.home.score === liveState.away.score) return null;
  return liveState.home.score > liveState.away.score ? bundle.game.home_team_id : bundle.game.away_team_id;
}

/**
 * Player of the game is only meaningful once the game is actually decided —
 * not just started. A still-live game's leader can (and often does) change
 * by the final buzzer, and "restrict to the winning team" (spec 9.1) has no
 * winner to restrict to yet. Confirmed via testing: the JPEG export was
 * showing a "Player of the game" mid-Period-1, which the live website page
 * already correctly avoids (it gates on gameStatus === "finalized").
 */
function playerOfGame(bundle: GameBundle, liveState: LiveGameState) {
  if (bundle.game.status !== "finalized") return null;
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

  const teamSection = (
    teamId: string,
    teamName: string,
    logoUrl: string | null,
    totals: ReturnType<typeof computeTeamTotalsFromPlayers>,
  ) => {
    const ids = bundle.rosterByTeam[teamId] ?? [];
    const headers = ["#", "Player", "PTS", "2PT", "3PT", "FT", "REB", "AST", "STL", "BLK", "TO", "PF", "EFF", "MIN"];
    const teamEfficiency = ids.reduce((sum, pid) => sum + (liveState.players[pid]?.efficiency ?? 0), 0);
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
          <td style="${cellStyle()}">${p.efficiency}</td>
          <td style="${cellStyle()}">${p.minutesMs !== null ? msToMinutesDisplay(p.minutesMs) : "-"}</td>
        </tr>`;
      })
      .join("");

    return `<table style="width:100%;border-collapse:collapse;margin-top:8px">
      <caption style="text-align:left;font-weight:700;padding:4px 0">${logoImg(logoUrl, 20, "margin-right:6px;")}${esc(teamName)}</caption>
      <thead><tr>${headers.map((h) => `<th style="${cellStyle(true)}">${h}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows}
        <tr>
          <td style="${totalsCellStyle}"></td>
          <td style="${totalsCellStyle};text-align:left">TEAM TOTALS</td>
          <td style="${totalsCellStyle}">${totals.points}</td>
          ${shotTotalCell(totals.fieldGoalMade - totals.threePointMade, totals.fieldGoalAttempted - totals.threePointAttempted)}
          ${shotTotalCell(totals.threePointMade, totals.threePointAttempted)}
          ${shotTotalCell(totals.ftMade, totals.ftAttempted)}
          <td style="${totalsCellStyle}">${totals.reboundsOffensive + totals.reboundsDefensive}</td>
          <td style="${totalsCellStyle}">${totals.assists}</td>
          <td style="${totalsCellStyle}">${totals.steals}</td>
          <td style="${totalsCellStyle}">${totals.blocks}</td>
          <td style="${totalsCellStyle}">${totals.turnovers}</td>
          <td style="${totalsCellStyle}">${totals.personalFouls}</td>
          <td style="${totalsCellStyle}">${teamEfficiency}</td>
          <td style="${totalsCellStyle}"></td>
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
    <style>body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 18px; }</style>
  </head>
  <body>
    <h1 style="font-size:18px;margin-bottom:0">${esc(bundle.awayTeam.name)} @ ${esc(bundle.homeTeam.name)}</h1>
    <p style="color:#555;margin-top:4px">${esc(formatPhTime(bundle.game.scheduled_at))} · ${esc(bundle.game.court_label ?? "")}</p>

    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <thead><tr><th style="${cellStyle(true)}">Team</th>${periodHeaderCells}<th style="${cellStyle(true)}">Final</th></tr></thead>
      <tbody>
        <tr>
          <td style="${cellStyle()};text-align:left">${logoImg(bundle.awayTeam.logo_url, 16, "margin-right:6px;")}${esc(bundle.awayTeam.short_name)}</td>
          ${awayPeriodCells}
          <td style="${cellStyle()};font-weight:700">${liveState.away.score}</td>
        </tr>
        <tr>
          <td style="${cellStyle()};text-align:left">${logoImg(bundle.homeTeam.logo_url, 16, "margin-right:6px;")}${esc(bundle.homeTeam.short_name)}</td>
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

    ${teamSection(bundle.game.away_team_id, bundle.awayTeam.name, bundle.awayTeam.logo_url, awayTotals)}
    ${teamSection(bundle.game.home_team_id, bundle.homeTeam.name, bundle.homeTeam.logo_url, homeTotals)}

    ${pog ? `<p style="margin-top:16px;font-weight:700">Player of the game: ${esc(playerName(bundle, pog.playerId))}</p>` : ""}
    ${signatureBlock}
  </body>
</html>`;
}

const LEADER_ROWS: Array<{ category: LeaderCategory; label: string }> = [
  { category: "points", label: "Points" },
  { category: "rebounds", label: "Rebounds" },
  { category: "assists", label: "Assists" },
  { category: "steals", label: "Steals" },
  { category: "blocks", label: "Blocks" },
  { category: "fieldGoalPct", label: "FG%" },
  { category: "threePointMade", label: "3PT made" },
];

/** The big number beside a leader's name; FG% also carries a small makes/attempts line. */
function leaderValue(category: LeaderCategory, leader: GameLeader): string {
  const text = category === "fieldGoalPct" ? `${(leader.value * 100).toFixed(1)}%` : String(leader.value);
  const detail =
    category === "fieldGoalPct"
      ? `<div style="font-size:16px;font-weight:400;opacity:0.7;line-height:1">${leader.made}/${leader.attempted}</div>`
      : "";
  return `<div style="flex:none;text-align:center;font-size:46px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums">${text}${detail}</div>`;
}

/** One team's leader in one category, or an empty cell when there isn't one. The number sits next to the category label, the name outside it. */
function leaderCell(bundle: GameBundle, category: LeaderCategory, leader: GameLeader | null, align: "left" | "right"): string {
  const cellStyle = "display:flex;align-items:center;gap:16px;min-width:0;";
  if (!leader) return `<div style="${cellStyle}"></div>`;
  const name = `<div style="flex:1;min-width:0;text-align:${align};font-size:26px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(playerName(bundle, leader.playerId))}</div>`;
  const value = leaderValue(category, leader);
  return `<div style="${cellStyle}">${align === "right" ? name + value : value + name}</div>`;
}

/** Shareable JPEG graphic — spec 12.2. Final score plus each team's game leaders, sized for social media. */
export function renderGraphicHtml(bundle: GameBundle, liveState: LiveGameState): string {
  const players = Object.values(liveState.players);
  const awayLeaders = computeTeamLeaders(players, bundle.game.away_team_id);
  const homeLeaders = computeTeamLeaders(players, bundle.game.home_team_id);

  const statusLabel =
    bundle.game.status === "finalized"
      ? "Final"
      : bundle.game.status === "in_progress"
        ? `Live — Period ${liveState.currentPeriod}`
        : "Scheduled";

  const columns = "grid-template-columns:1fr 150px 1fr;column-gap:24px;";

  const teamBlock = (team: GameBundle["homeTeam"], score: number) => `<div style="text-align:center;min-width:0">
      <div style="height:84px">${logoImg(team.logo_url, 84)}</div>
      <div style="font-size:28px;font-weight:700;opacity:0.9;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(team.name)}</div>
      <div style="font-size:104px;font-weight:800;line-height:1.05;font-variant-numeric:tabular-nums">${score}</div>
    </div>`;

  const rows = LEADER_ROWS.map(
    ({ category, label }) => `<div style="display:grid;${columns}align-items:center;padding:10px 0;min-height:56px;border-top:1px solid rgba(255,255,255,0.14)">
      ${leaderCell(bundle, category, awayLeaders[category], "right")}
      <div style="text-align:center;font-size:17px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#e8845a">${esc(label)}</div>
      ${leaderCell(bundle, category, homeLeaders[category], "left")}
    </div>`,
  ).join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>body { margin: 0; font-family: Arial, sans-serif; }</style>
  </head>
  <body>
    <div style="width:1080px;height:1080px;background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;display:flex;flex-direction:column;padding:48px 60px;box-sizing:border-box">
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;height:64px">
        ${logoImg(bundle.league.logo_url, 64)}
        <div style="font-size:34px;font-weight:800">${esc(bundle.league.name)}</div>
      </div>
      <div style="text-align:center;font-size:24px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;margin:10px 0 18px">${esc(statusLabel)}</div>

      <div style="display:grid;${columns}align-items:start">
        ${teamBlock(bundle.awayTeam, liveState.away.score)}
        <div style="text-align:center;font-size:44px;opacity:0.45;padding-top:150px">–</div>
        ${teamBlock(bundle.homeTeam, liveState.home.score)}
      </div>

      <div style="margin-top:auto">${rows}</div>
    </div>
  </body>
</html>`;
}
