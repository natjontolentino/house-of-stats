import { displayPlayerName } from "@courtstats/shared";
import type { SeasonStatsResult } from "./seasonData";
import { PLAYER_COLUMNS, TEAM_COLUMNS, sortRows } from "./seasonColumns";

function esc(value: unknown): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (c) => map[c]);
}

const cell = (header = false, left = false) =>
  `border:1px solid #ccc;padding:3px 6px;text-align:${left ? "left" : "center"};font-weight:${header ? 700 : 400};font-size:${header ? 9 : 10.5}px;${header ? "text-transform:uppercase;background:#f3f3f6;" : ""}`;

/** Season summary PDF -- team and player per-game averages, using the same column definitions as the season stats page. */
export function renderSeasonSummaryHtml(input: {
  leagueName: string;
  seasonName: string;
  stats: SeasonStatsResult;
}): string {
  const { stats } = input;
  const teams = sortRows(stats.teamStats, TEAM_COLUMNS, "pts", "pts");
  const players = sortRows(stats.players, PLAYER_COLUMNS, "pts", "pts");

  const teamRows = teams
    .map(
      (t) => `<tr>
        <td style="${cell(false, true)};font-weight:700">${esc(stats.teamsById[t.teamId]?.name ?? "?")}</td>
        ${TEAM_COLUMNS.map((c) => `<td style="${cell()}">${esc(c.format(t))}</td>`).join("")}
      </tr>`,
    )
    .join("");

  const playerRows = players
    .map((p, i) => {
      const player = stats.playersById[p.playerId];
      return `<tr>
        <td style="${cell()}">${i + 1}</td>
        <td style="${cell(false, true)};font-weight:700">${esc(player ? displayPlayerName(player, stats.settings) : "?")}</td>
        <td style="${cell()}">${esc(stats.teamsById[p.teamId]?.short_name ?? "?")}</td>
        ${PLAYER_COLUMNS.map((c) => `<td style="${cell()}">${esc(c.format(p))}</td>`).join("")}
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20px; } h2 { font-size: 13px; margin: 18px 0 6px; }</style>
  </head>
  <body>
    <h1 style="font-size:18px;margin:0">${esc(input.leagueName)} — Season summary</h1>
    <p style="color:#555;margin:4px 0 0">${esc(input.seasonName)} · per-game averages from finalized games</p>

    <h2>Team averages</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th style="${cell(true, true)}">Team</th>${TEAM_COLUMNS.map((c) => `<th style="${cell(true)}">${c.label}</th>`).join("")}</tr></thead>
      <tbody>${teamRows}</tbody>
    </table>

    <h2>Player averages</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th style="${cell(true)}">#</th><th style="${cell(true, true)}">Player</th><th style="${cell(true)}">Team</th>${PLAYER_COLUMNS.map((c) => `<th style="${cell(true)}">${c.label}</th>`).join("")}</tr></thead>
      <tbody>${playerRows}</tbody>
    </table>

    <p style="color:#666;font-size:9.5px;margin-top:10px">
      GP = games played. MIN shows a dash when the league ran without a game clock. Percentages are total makes over total attempts.
      EFF = (PTS + REB + AST + STL + BLK) − missed FG − missed FT − TO, per game.
    </p>
  </body>
</html>`;
}
