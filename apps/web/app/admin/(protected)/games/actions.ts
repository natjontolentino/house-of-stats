"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";
import { SEED_SEASON_ID } from "@courtstats/shared";

export async function createGameAction(formData: FormData) {
  const homeTeamId = formData.get("homeTeamId");
  const awayTeamId = formData.get("awayTeamId");
  const scheduledAt = formData.get("scheduledAt");
  const courtLabel = formData.get("courtLabel");
  if (typeof homeTeamId !== "string" || typeof awayTeamId !== "string" || typeof scheduledAt !== "string") return;
  if (homeTeamId === awayTeamId) return;

  const supabase = createSupabaseAdminClient();
  await supabase.from("game").insert({
    season_id: SEED_SEASON_ID,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    scheduled_at: new Date(scheduledAt).toISOString(),
    court_label: typeof courtLabel === "string" && courtLabel.trim().length > 0 ? courtLabel.trim() : null,
    status: "scheduled",
  });

  revalidatePath("/admin/games");
  revalidatePath("/");
  // Redirecting back to the same page forces a real navigation, which
  // remounts the form and clears it -- a plain return here left the
  // just-submitted values sitting in the fields (confirmed with the
  // identical bug on the "Add a player" form: nothing stops a second click
  // from silently scheduling a duplicate game).
  redirect("/admin/games");
}
