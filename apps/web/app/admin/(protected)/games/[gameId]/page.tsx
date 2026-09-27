import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "../../../../../lib/supabaseAdminClient";
import { ScheduledAtInput } from "../../../../../components/admin/ScheduledAtInput";
import { ConfirmButton } from "../../../../../components/admin/ConfirmButton";
import { updateGameAction, deleteGameAction } from "./actions";

export const dynamic = "force-dynamic";

const inputStyle = { padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" } as const;

export default async function EditGamePage({ params }: { params: { gameId: string } }) {
  const supabase = createSupabaseAdminClient();
  const { data: game } = await supabase.from("game").select("*").eq("id", params.gameId).single();
  if (!game) notFound();

  const { data: teams } = await supabase.from("team").select("id, name").eq("season_id", game.season_id).order("name");
  const { count } = await supabase.from("game_event").select("id", { count: "exact", head: true }).eq("game_id", game.id);
  const hasEvents = (count ?? 0) > 0;
  const teamsLocked = game.status !== "scheduled" || hasEvents;
  const canDelete = !teamsLocked;

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <p style={{ margin: "4px 0 8px", fontSize: 13 }}>
        <Link href="/admin/games">← Games</Link>
      </p>
      <h1 style={{ fontSize: 22, margin: "0 0 20px" }}>Edit game</h1>

      <form action={updateGameAction} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="gameId" value={game.id} />

        {teamsLocked ? (
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            This game has {game.status === "finalized" ? "been played" : "started"}, so the teams can&apos;t be changed —
            only the date and court.
          </p>
        ) : (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Away team</span>
              <select name="awayTeamId" required defaultValue={game.away_team_id} style={inputStyle}>
                {(teams ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Home team</span>
              <select name="homeTeamId" required defaultValue={game.home_team_id} style={inputStyle}>
                {(teams ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Date &amp; time</span>
          <ScheduledAtInput name="scheduledAt" defaultIso={game.scheduled_at} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Court (optional)</span>
          <input type="text" name="courtLabel" defaultValue={game.court_label ?? ""} placeholder="e.g. Court 1" style={inputStyle} />
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" className="button-primary">
            Save changes
          </button>
          {canDelete && (
            <ConfirmButton
              formAction={deleteGameAction}
              message="Delete this game? This can't be undone."
              style={{
                border: "1px solid var(--border-strong)",
                background: "none",
                borderRadius: 6,
                color: "var(--red)",
                padding: "8px 14px",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              Delete game
            </ConfirmButton>
          )}
        </div>
        {!canDelete && (
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            A game that has started can&apos;t be deleted, because its recorded plays are part of the league&apos;s stats.
          </p>
        )}
      </form>
    </main>
  );
}
