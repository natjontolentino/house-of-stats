"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type === "image/png" ? "png" : "jpg";
}

export async function updateLeagueAction(formData: FormData) {
  const leagueId = formData.get("leagueId");
  const name = formData.get("name");
  if (typeof leagueId !== "string" || typeof name !== "string" || name.trim().length === 0) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const update: Record<string, unknown> = { name: name.trim() };

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const path = `league-logos/${leagueId}-${Date.now()}.${extFromFile(logo)}`;
    const { error: uploadError } = await supabase.storage
      .from("league-assets")
      .upload(path, logo, { contentType: logo.type, upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from("league-assets").getPublicUrl(path);
      update.logo_url = data.publicUrl;
    }
  }

  await supabase.from("league").update(update).eq("id", leagueId);
  revalidatePath("/admin/league");
  revalidatePath("/");
}

const CLOCK_MODES = ["off", "tracker", "companion"] as const;

/** Game clock settings live in league.settings (jsonb); merge so every other setting is left untouched. */
export async function updateClockSettingsAction(formData: FormData) {
  const leagueId = formData.get("leagueId");
  const clockMode = formData.get("clockMode");
  const periodMinutes = Number(formData.get("periodLengthMinutes"));
  if (typeof leagueId !== "string" || typeof clockMode !== "string") return;
  if (!(CLOCK_MODES as readonly string[]).includes(clockMode)) return;
  if (!Number.isFinite(periodMinutes) || periodMinutes < 1 || periodMinutes > 60) return;

  const supabase = createSupabaseAdminClient();
  const { data: league } = await supabase.from("league").select("settings").eq("id", leagueId).single();
  if (!league) return;

  const settings = {
    ...((league.settings as Record<string, unknown> | null) ?? {}),
    clock_mode: clockMode,
    period_length_minutes: Math.round(periodMinutes),
  };
  await supabase.from("league").update({ settings }).eq("id", leagueId);
  revalidatePath("/admin/league");
}

/**
 * Removes just this one league's or team's logo files from a shared folder
 * (every league's/team's logos sit flatly in the same "league-logos" /
 * "team-logos" folder, named "{id}-{timestamp}.ext") -- matching on the id
 * prefix is required, since listing the whole folder would delete every
 * other league's logos too. Best-effort: a failure here must never block
 * the actual data delete.
 */
async function deleteStorageLogo(supabase: ReturnType<typeof createSupabaseAdminClient>, folder: string, id: string) {
  try {
    const { data: files } = await supabase.storage.from("league-assets").list(folder);
    const matches = (files ?? []).filter((f) => f.name.startsWith(`${id}-`));
    if (matches.length > 0) {
      await supabase.storage.from("league-assets").remove(matches.map((f) => `${folder}/${f.name}`));
    }
  } catch {
    // logo cleanup is a nicety; the delete itself must still proceed
  }
}

/**
 * Permanently deletes a league and everything under it (seasons, teams,
 * players, rosters, games, events, the mobile login code and paired
 * devices) -- every one of those tables has `on delete cascade` back to
 * `league` (0001_init.sql / 0004-0005), so removing the league row is
 * enough at the database level. Uploaded logo files are not part of that
 * cascade (they live in storage, not Postgres), so they're removed here
 * explicitly. Confirmation is the exact league name, checked server-side
 * too -- a client-only check would just be UI decoration.
 */
export async function deleteLeagueAction(formData: FormData) {
  const leagueId = formData.get("leagueId");
  const confirmName = formData.get("confirmName");
  const fail = (reason: string) => redirect(`/admin/league?deleteError=${reason}`);
  if (typeof leagueId !== "string" || typeof confirmName !== "string") return fail("bad-request");

  const supabase = createSupabaseAdminClient();
  const { data: league } = await supabase.from("league").select("name").eq("id", leagueId).single();
  if (!league) return fail("not-found");
  if (confirmName.trim() !== league.name) return fail("mismatch");

  const { count } = await supabase.from("league").select("id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) return fail("last-league"); // at least one league must always exist for the admin to have somewhere to land

  const { data: seasons } = await supabase.from("season").select("id").eq("league_id", leagueId);
  const seasonIds = (seasons ?? []).map((s) => s.id);
  const { data: teams } = seasonIds.length > 0 ? await supabase.from("team").select("id").in("season_id", seasonIds) : { data: [] };
  const teamIds = (teams ?? []).map((t) => t.id);
  const { data: games } = seasonIds.length > 0 ? await supabase.from("game").select("id").in("season_id", seasonIds) : { data: [] };
  const gameIds = (games ?? []).map((g) => g.id);

  await deleteStorageLogo(supabase, "league-logos", leagueId);
  await Promise.all(teamIds.map((id) => deleteStorageLogo(supabase, "team-logos", id)));

  // Deleted children-first, in the exact order their foreign keys require.
  // `league`'s own cascade (0001_init.sql) handles season/team/player/roster_entry/
  // venue/device fine on its own, but game_event/game_lineup/game reference
  // player and team WITHOUT cascade, and since team and game both cascade
  // independently from the same league/season row, Postgres does not
  // guarantee it deletes game_event before player -- confirmed live: it
  // tried to delete a player while a game_event row still pointed at them
  // ("violates foreign key constraint game_event_player_id_fkey"). Deleting
  // every level explicitly removes that ordering ambiguity entirely.
  // .in(column, []) is skipped rather than sent -- an empty id list (a
  // league with no games/teams yet) means "delete nothing", but some
  // PostgREST versions treat an empty IN list as an error rather than a
  // no-op match.
  const steps: Array<[boolean, () => PromiseLike<{ error: { message: string } | null }>]> = [
    [gameIds.length > 0, () => supabase.from("game_event").delete().in("game_id", gameIds)],
    [gameIds.length > 0, () => supabase.from("game_lineup").delete().in("game_id", gameIds)],
    [gameIds.length > 0, () => supabase.from("game").delete().in("id", gameIds)],
    [seasonIds.length > 0, () => supabase.from("roster_entry").delete().in("season_id", seasonIds)],
    [teamIds.length > 0, () => supabase.from("team").delete().in("id", teamIds)],
    [true, () => supabase.from("player").delete().eq("league_id", leagueId)],
    [true, () => supabase.from("season").delete().eq("league_id", leagueId)],
    [true, () => supabase.from("league").delete().eq("id", leagueId)],
  ];
  for (const [shouldRun, step] of steps) {
    if (!shouldRun) continue;
    const { error: deleteError } = await step();
    if (deleteError) {
      console.error("[delete-league] delete failed", deleteError.message);
      return fail("db-error");
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/league");
  revalidatePath("/");
  revalidatePath("/standings");
  revalidatePath("/schedule");
  redirect(`/admin/league?deleted=${encodeURIComponent(league.name)}`);
}

export async function setLeagueLoginCodeAction(formData: FormData) {
  const leagueId = formData.get("leagueId");
  const code = formData.get("code");
  if (typeof leagueId !== "string" || typeof code !== "string" || code.trim().length < 4) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  await supabase.rpc("set_league_login_code", { p_league_id: leagueId, p_code: code.trim() });
  revalidatePath("/admin/league");
}
