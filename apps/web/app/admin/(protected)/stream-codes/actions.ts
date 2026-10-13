"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";

/** No 0/O, 1/I/L — codes get read out over the phone or typed from a chat message. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function newCode(): string {
  const part = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `PHL-${part()}-${part()}`;
}

/** "2026-12-31" → end of that day in Philippine time (UTC+8), or null when blank. */
function endOfDayPh(date: unknown): string | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return new Date(`${date}T23:59:59+08:00`).toISOString();
}

/** Creates one or more codes (one per phone) with the same label, league and end date. */
export async function createStreamCodesAction(formData: FormData) {
  const label = formData.get("label");
  const leagueId = formData.get("leagueId");
  const quantity = Math.round(Number(formData.get("quantity") ?? 1));
  if (typeof label !== "string" || label.trim().length === 0) return;
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20) return;

  const expiresAt = formData.get("noExpiry") === "on" ? null : endOfDayPh(formData.get("expiresOn"));
  const base = label.trim();
  const rows = Array.from({ length: quantity }, (_, i) => ({
    code: newCode(),
    label: quantity > 1 ? `${base} – phone ${i + 1}` : base,
    league_id: typeof leagueId === "string" && leagueId.length > 0 ? leagueId : null,
    expires_at: expiresAt,
  }));

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("stream_license").insert(rows);
  if (error) {
    // A duplicate code is astronomically unlikely (31^8 possibilities); retry once with fresh codes.
    await supabase.from("stream_license").insert(rows.map((r) => ({ ...r, code: newCode() })));
  }
  revalidatePath("/admin/stream-codes");
}

/** Switch a code (and the phone using it) off or back on. Takes effect on the phone at its next check. */
export async function setStreamCodeStatusAction(formData: FormData) {
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || (status !== "active" && status !== "revoked")) return;
  const supabase = createSupabaseAdminClient();
  await supabase.from("stream_license").update({ status }).eq("id", id);
  revalidatePath("/admin/stream-codes");
}

/** Unbinds the code from its phone (customer changed phones). The old phone loses access at its next check. */
export async function releaseStreamPhoneAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("stream_license")
    .update({ installation_id: null, device_label: null, token_hash: null, activated_at: null })
    .eq("id", id);
  revalidatePath("/admin/stream-codes");
}

/** Sets a new end date, or removes it ("never expires"). */
export async function setStreamExpiryAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const expiresAt = formData.get("clear") === "1" ? null : endOfDayPh(formData.get("expiresOn"));
  if (formData.get("clear") !== "1" && expiresAt === null) return;
  const supabase = createSupabaseAdminClient();
  await supabase.from("stream_license").update({ expires_at: expiresAt }).eq("id", id);
  revalidatePath("/admin/stream-codes");
}

export async function deleteStreamCodeAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = createSupabaseAdminClient();
  await supabase.from("stream_license").delete().eq("id", id);
  revalidatePath("/admin/stream-codes");
}
