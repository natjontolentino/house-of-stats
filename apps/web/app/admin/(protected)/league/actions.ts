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
