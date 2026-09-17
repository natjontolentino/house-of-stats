import type { GameBundle } from "../lib/gameData";
import type { GameEvent } from "@courtstats/shared";
import { filterVoidedEvents, displayPlayerName } from "@courtstats/shared";

function playerName(bundle: GameBundle, playerId: string): string | undefined {
  const player = bundle.players[playerId];
  return player ? displayPlayerName(player, bundle.settings) : undefined;
}

function describe(evt: GameEvent, bundle: GameBundle): string {
  const player = evt.player_id ? playerName(bundle, evt.player_id) : null;
  const team = evt.team_id === bundle.game.home_team_id ? bundle.homeTeam.short_name : bundle.awayTeam.short_name;
  const who = player ?? `${team} (team)`;

  switch (evt.event_type) {
    case "period_start":
      return `Period ${(evt.payload as { period: number }).period} begins.`;
    case "period_end":
      return `Period ${(evt.payload as { period: number }).period} ends.`;
    case "shot_made":
      return `${who} made a ${(evt.payload as { points: number }).points}-pointer.`;
    case "shot_missed":
      return `${who} missed a ${(evt.payload as { points: number }).points}-point attempt.`;
    case "free_throw_made":
      return `${who} made a free throw.`;
    case "free_throw_missed":
      return `${who} missed a free throw.`;
    case "rebound": {
      const kind = (evt.payload as { kind: string }).kind;
      return `${who} grabbed a${kind === "offensive" ? "n offensive" : " defensive"} rebound.`;
    }
    case "assist":
      return `${who} recorded an assist.`;
    case "steal":
      return `${who} recorded a steal.`;
    case "block":
      return `${who} recorded a block.`;
    case "turnover":
      return `${who} turned the ball over.`;
    case "foul_personal":
      return `${who} committed a personal foul.`;
    case "warning":
      return `Warning issued to ${who}.`;
    case "technical": {
      const ordinal = (evt.payload as { ordinal: number }).ordinal;
      return `Technical foul (#${ordinal}) on ${who}.`;
    }
    case "substitution": {
      const { player_in, player_out } = evt.payload as { player_in: string; player_out: string };
      return `${team}: ${playerName(bundle, player_in) ?? "?"} in for ${playerName(bundle, player_out) ?? "?"}.`;
    }
    case "timeout":
      return `${team} timeout.`;
    case "timeout_expired":
      return `${team} timeout expired unused.`;
    case "ejection":
      return `${who} ejected.`;
    case "lineup_set":
      return `${team} starting lineup set.`;
    case "game_finalized":
      return `Game finalized.`;
    default:
      return evt.event_type;
  }
}

export function PlayByPlay({ bundle, events }: { bundle: GameBundle; events: GameEvent[] }) {
  const visible = filterVoidedEvents(events)
    .slice()
    .sort((a, b) => b.sequence - a.sequence)
    .slice(0, 100);

  return (
    <ul className="card" style={{ listStyle: "none", margin: 0, padding: "4px 16px" }}>
      {visible.map((evt) => (
        <li
          key={evt.client_uuid}
          style={{ padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 13.5, display: "flex", gap: 10 }}
        >
          <span
            style={{
              color: "var(--muted)",
              minWidth: 26,
              fontSize: 11,
              fontWeight: 700,
              paddingTop: 1,
            }}
          >
            Q{evt.period}
          </span>
          <span>{describe(evt, bundle)}</span>
        </li>
      ))}
      {visible.length === 0 && (
        <li style={{ color: "var(--muted)", padding: "14px 0", fontSize: 13.5 }}>No plays recorded yet.</li>
      )}
    </ul>
  );
}
