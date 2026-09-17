import type { GameBundle } from "../lib/gameData";
import type { GameEvent } from "@courtstats/shared";
import { computeScoreByPeriod, filterVoidedEvents } from "@courtstats/shared";

/** Score by period (spec 8.1: game page lists "Score by period" explicitly). */
export function ScoreByPeriod({ bundle, events }: { bundle: GameBundle; events: GameEvent[] }) {
  const periods = computeScoreByPeriod(filterVoidedEvents(events), bundle.game.home_team_id, bundle.game.away_team_id);
  if (periods.length === 0) return null;

  return (
    <table style={{ marginTop: 16, maxWidth: 420 }}>
      <thead>
        <tr>
          <th></th>
          {periods.map((p) => (
            <th key={p.period}>Q{p.period}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ textAlign: "left" }}>{bundle.awayTeam.short_name}</td>
          {periods.map((p) => (
            <td key={p.period}>{p.awayPoints}</td>
          ))}
        </tr>
        <tr>
          <td style={{ textAlign: "left" }}>{bundle.homeTeam.short_name}</td>
          {periods.map((p) => (
            <td key={p.period}>{p.homePoints}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
