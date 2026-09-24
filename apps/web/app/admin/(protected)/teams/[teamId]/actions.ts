"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "../../../../../lib/supabaseAdminClient";
import { NICKNAME_MAX_LENGTH } from "@courtstats/shared";

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type === "image/png" ? "png" : "jpg";
}

export async function updateTeamAction(formData: FormData) {
  const teamId = formData.get("teamId");
  const name = formData.get("name");
  const shortName = formData.get("shortName");
  if (typeof teamId !== "string" || typeof name !== "string" || typeof shortName !== "string") return;
  if (name.trim().length === 0 || shortName.trim().length === 0) return;

  const supabase = createSupabaseAdminClient();
  const update: Record<string, unknown> = { name: name.trim(), short_name: shortName.trim().toUpperCase() };

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const path = `team-logos/${teamId}-${Date.now()}.${extFromFile(logo)}`;
    const { error: uploadError } = await supabase.storage
      .from("league-assets")
      .upload(path, logo, { contentType: logo.type, upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from("league-assets").getPublicUrl(path);
      update.logo_url = data.publicUrl;
    }
  }

  await supabase.from("team").update(update).eq("id", teamId);
  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/teams");
  revalidatePath("/");
}

/** Nicknames are what the tracker app and public site display — spec 5.1 caps them at 10 characters. Enforced here too, not just in the input's maxLength, since a server action can be called directly. */
function clampNickname(raw: string): string {
  return raw.trim().slice(0, NICKNAME_MAX_LENGTH);
}

export async function addPlayerAction(formData: FormData) {
  const teamId = formData.get("teamId");
  const fullName = formData.get("fullName");
  const nickname = formData.get("nickname");
  const jerseyNumber = formData.get("jerseyNumber");
  if (
    typeof teamId !== "string" ||
    typeof fullName !== "string" ||
    typeof nickname !== "string" ||
    typeof jerseyNumber !== "string"
  ) {
    return;
  }
  if (fullName.trim().length === 0 || nickname.trim().length === 0 || jerseyNumber.trim().length === 0) return;

  const supabase = createSupabaseAdminClient();
  const { data: player, error: playerError } = await supabase
    .from("player")
    .insert({
      league_id: formData.get("leagueId"),
      full_name: fullName.trim(),
      nickname: clampNickname(nickname),
    })
    .select()
    .single();

  if (playerError || !player) return;

  const { data: team } = await supabase.from("team").select("season_id").eq("id", teamId).single();
  if (!team) return;

  await supabase.from("roster_entry").insert({
    season_id: team.season_id,
    team_id: teamId,
    player_id: player.id,
    jersey_number: jerseyNumber.trim(),
  });

  revalidatePath(`/admin/teams/${teamId}`);
}

export async function updatePlayerAction(formData: FormData) {
  const playerId = formData.get("playerId");
  const rosterEntryId = formData.get("rosterEntryId");
  const teamId = formData.get("teamId");
  const fullName = formData.get("fullName");
  const nickname = formData.get("nickname");
  const jerseyNumber = formData.get("jerseyNumber");
  if (
    typeof playerId !== "string" ||
    typeof rosterEntryId !== "string" ||
    typeof teamId !== "string" ||
    typeof fullName !== "string" ||
    typeof nickname !== "string" ||
    typeof jerseyNumber !== "string"
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  await supabase.from("player").update({ full_name: fullName.trim(), nickname: clampNickname(nickname) }).eq("id", playerId);
  await supabase.from("roster_entry").update({ jersey_number: jerseyNumber.trim() }).eq("id", rosterEntryId);

  revalidatePath(`/admin/teams/${teamId}`);
}

/** Removes the player from this team's roster without deleting the player record itself -- their past events/stats reference player_id directly and must stay intact. */
export async function removeFromRosterAction(formData: FormData) {
  const rosterEntryId = formData.get("rosterEntryId");
  const teamId = formData.get("teamId");
  if (typeof rosterEntryId !== "string" || typeof teamId !== "string") return;

  const supabase = createSupabaseAdminClient();
  await supabase.from("roster_entry").delete().eq("id", rosterEntryId);
  revalidatePath(`/admin/teams/${teamId}`);
}
