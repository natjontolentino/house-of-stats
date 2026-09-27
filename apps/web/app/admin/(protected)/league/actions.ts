"use server";

import { revalidatePath } from "next/cache";
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
