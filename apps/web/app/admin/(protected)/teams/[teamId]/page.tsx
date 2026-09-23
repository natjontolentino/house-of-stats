import { createSupabaseAdminClient } from "../../../../../lib/supabaseAdminClient";
import { NICKNAME_MAX_LENGTH } from "@courtstats/shared";
import { notFound } from "next/navigation";
import { updateTeamAction, updatePlayerAction, removeFromRosterAction } from "./actions";
import { AddPlayerForm } from "./AddPlayerForm";

export const dynamic = "force-dynamic";

interface RosterRow {
  id: string; // roster_entry id
  jersey_number: string;
  player: { id: string; full_name: string; nickname: string } | null;
}

export default async function AdminTeamPage({ params }: { params: { teamId: string } }) {
  const supabase = createSupabaseAdminClient();
  const { data: team } = await supabase.from("team").select("*").eq("id", params.teamId).single();
  if (!team) notFound();

  const { data: season } = await supabase.from("season").select("league_id").eq("id", team.season_id).single();
  const leagueId = season?.league_id ?? "";

  const { data: rosterRows } = await supabase
    .from("roster_entry")
    .select("id, jersey_number, player:player_id(id, full_name, nickname)")
    .eq("team_id", params.teamId)
    .order("jersey_number");
  const roster = (rosterRows ?? []) as unknown as RosterRow[];

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, margin: "4px 0 20px" }}>{team.name}</h1>

      <h2 className="section-title">Team details</h2>
      <form
        action={updateTeamAction}
        className="card"
        style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}
      >
        <input type="hidden" name="teamId" value={team.id} />
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Team name</span>
          <input
            type="text"
            name="name"
            defaultValue={team.name}
            required
            style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Short name</span>
          <input
            type="text"
            name="shortName"
            defaultValue={team.short_name}
            required
            maxLength={4}
            style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", maxWidth: 120 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Logo</span>
          {team.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logo_url} alt="" style={{ width: 56, height: 56, objectFit: "contain", marginBottom: 4 }} />
          )}
          <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
        </label>
        <button type="submit" className="button-primary" style={{ alignSelf: "flex-start" }}>
          Save
        </button>
      </form>

      <h2 className="section-title">Roster</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {roster.map((r) => (
          <form
            key={r.id}
            action={updatePlayerAction}
            className="card"
            style={{ padding: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
          >
            <input type="hidden" name="playerId" value={r.player?.id} />
            <input type="hidden" name="rosterEntryId" value={r.id} />
            <input type="hidden" name="teamId" value={team.id} />
            <input
              type="text"
              name="jerseyNumber"
              defaultValue={r.jersey_number}
              style={{ width: 44, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)", textAlign: "center" }}
              aria-label="Jersey number"
            />
            <input
              type="text"
              name="fullName"
              defaultValue={r.player?.full_name}
              style={{ flex: "1 1 160px", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)" }}
              aria-label="Full name"
            />
            <input
              type="text"
              name="nickname"
              defaultValue={r.player?.nickname}
              maxLength={NICKNAME_MAX_LENGTH}
              style={{ width: 110, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-strong)" }}
              aria-label="Nickname (max 10 characters, shown on the tracker app)"
              title="Shown on the tracker app and the public site — max 10 characters"
            />
            <button type="submit" className="button-secondary" style={{ fontSize: 12, padding: "6px 10px" }}>
              Save
            </button>
            <button
              type="submit"
              formAction={removeFromRosterAction}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                border: "1px solid var(--border-strong)",
                background: "none",
                borderRadius: 6,
                color: "var(--red)",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </form>
        ))}
        {roster.length === 0 && <p style={{ color: "var(--muted)" }}>No players yet — add the first one below.</p>}
      </div>

      <h2 className="section-title">Add a player</h2>
      <AddPlayerForm teamId={team.id} leagueId={leagueId} />
    </main>
  );
}
