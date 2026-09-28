"use server";

import { createSupabaseAdminClient } from "../../lib/supabaseAdminClient";
import { sendAdminNotificationEmail } from "../../lib/resend";

export interface LeagueLeadInput {
  leagueName: string;
  contactName: string;
  contactNumber: string;
}

/** Called directly from the "Add your league" popup (a plain function call, not a form post) so the popup can show inline success/error without navigating away. */
export async function submitLeagueLeadAction(input: LeagueLeadInput): Promise<{ ok: boolean }> {
  const leagueName = input.leagueName.trim().slice(0, 200);
  const contactName = input.contactName.trim().slice(0, 200);
  const contactNumber = input.contactNumber.trim().slice(0, 50);
  if (!leagueName || !contactName) return { ok: false };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("league_lead").insert({
    league_name: leagueName,
    contact_name: contactName,
    contact_number: contactNumber || null,
  });
  if (error) {
    console.error("[league-lead] insert failed", error.message);
    return { ok: false };
  }

  // Best-effort -- the lead is already safely recorded above regardless of whether this succeeds.
  await sendAdminNotificationEmail(
    `New league inquiry: ${leagueName}`,
    `League name: ${leagueName}\nContact person: ${contactName}\nContact number: ${contactNumber || "-"}\n\nView all inquiries in the admin under Leads.`,
  );

  return { ok: true };
}
