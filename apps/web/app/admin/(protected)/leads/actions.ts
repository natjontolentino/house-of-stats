"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";

const STATUSES = ["new", "contacted", "onboarded", "dismissed"] as const;

export async function setLeadStatusAction(formData: FormData) {
  const leadId = formData.get("leadId");
  const status = formData.get("status");
  if (typeof leadId !== "string" || typeof status !== "string") return;
  if (!(STATUSES as readonly string[]).includes(status)) return;

  const supabase = createSupabaseAdminClient();
  await supabase.from("league_lead").update({ status }).eq("id", leadId);
  revalidatePath("/admin/leads");
}
