"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";

export async function createTeamAction(formData: FormData) {
  const seasonId = formData.get("seasonId");
  const name = formData.get("name");
  const shortName = formData.get("shortName");
  if (typeof seasonId !== "string" || typeof name !== "string" || typeof shortName !== "string") return;
  if (name.trim().length === 0 || shortName.trim().length === 0) return;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("team")
    .insert({ season_id: seasonId, name: name.trim(), short_name: shortName.trim().toUpperCase() })
    .select()
    .single();

  revalidatePath("/admin/teams");
  revalidatePath("/");
  if (!error && data) redirect(`/admin/teams/${data.id}`);
}
