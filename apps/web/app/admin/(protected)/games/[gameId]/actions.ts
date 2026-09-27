"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../../../../../lib/supabaseAdminClient";

async function loadGame(gameId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: game } = await supabase.from("game").select("*").eq("id", gameId).single();
  if (!game) return null;
  const { count } = await supabase.from("game_event").select("id", { count: "exact", head: true }).eq("game_id", gameId);
  return { supabase, game, hasEvents: (count ?? 0) > 0 };
}

/** Date and court can always be corrected. Teams can only change while the game is still scheduled with nothing recorded, since changing them later would detach recorded plays from their team. */
export async function updateGameAction(formData: FormData) {
  const gameId = formData.get("gameId");
  const scheduledAt = formData.get("scheduledAt");
  const courtLabel = formData.get("courtLabel");
  if (typeof gameId !== "string" || typeof scheduledAt !== "string" || Number.isNaN(Date.parse(scheduledAt))) return;

  const loaded = await loadGame(gameId);
  if (!loaded) return;
  const { supabase, game, hasEvents } = loaded;

  const update: Record<string, unknown> = {
    scheduled_at: new Date(scheduledAt).toISOString(),
    court_label: typeof courtLabel === "string" && courtLabel.trim().length > 0 ? courtLabel.trim() : null,
  };

  const homeTeamId = formData.get("homeTeamId");
  const awayTeamId = formData.get("awayTeamId");
  if (game.status === "scheduled" && !hasEvents && typeof homeTeamId === "string" && typeof awayTeamId === "string") {
    if (homeTeamId === awayTeamId) return;
    const { data: teams } = await supabase.from("team").select("id").eq("season_id", game.season_id).in("id", [homeTeamId, awayTeamId]);
    if ((teams ?? []).length !== 2) return;
    update.home_team_id = homeTeamId;
    update.away_team_id = awayTeamId;
  }

  await supabase.from("game").update(update).eq("id", gameId);
  revalidatePath("/admin/games");
  revalidatePath("/schedule");
  revalidatePath("/");
  redirect("/admin/games");
}

/** Only a game that has not started can be deleted -- anything with recorded plays is history. */
export async function deleteGameAction(formData: FormData) {
  const gameId = formData.get("gameId");
  if (typeof gameId !== "string") return;

  const loaded = await loadGame(gameId);
  if (!loaded || loaded.game.status !== "scheduled" || loaded.hasEvents) return;

  await loaded.supabase.from("game").delete().eq("id", gameId);
  revalidatePath("/admin/games");
  revalidatePath("/schedule");
  revalidatePath("/");
  redirect("/admin/games");
}
