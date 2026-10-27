"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";

/** No 0/O, 1/I/L — codes get read out over the phone or typed from a chat message. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const PRODUCTS = { hoops: "PHL", pickle: "PPL", hoops_adv: "PHA" } as const;
type Product = keyof typeof PRODUCTS;

/**
 * "PHL-…" for Pinoy Hoops Live, "PPL-…" for Pinoy Pickle Live, "PHA-…" for Pinoy Hoops Live Stream Advanced
 * (multi-camera), so the app is clear from the code itself.
 */
function newCode(product: Product): string {
  const part = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `${PRODUCTS[product]}-${part()}-${part()}`;
}

/** "2026-12-31" → end of that day in Philippine time (UTC+8), or null when blank. */
function endOfDayPh(date: unknown): string | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return new Date(`${date}T23:59:59+08:00`).toISOString();
}

/** Phones one code may activate (1–20). */
function maxDevices(value: unknown): number | null {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 && n <= 20 ? n : null;
}

/** Creates one or more codes for one app, with the same label, league, end date and phone limit. */
export async function createStreamCodesAction(formData: FormData) {
  const label = formData.get("label");
  const leagueId = formData.get("leagueId");
  const quantity = Math.round(Number(formData.get("quantity") ?? 1));
  const chosen = formData.get("product");
  const product: Product = chosen === "pickle" || chosen === "hoops_adv" ? chosen : "hoops";
  // Blank = the app's usual: 3 for Advanced (1 main + 2 camera phones), 1 for the single-camera apps.
  const devices = maxDevices(formData.get("maxDevices") || null) ?? (product === "hoops_adv" ? 3 : 1);
  if (typeof label !== "string" || label.trim().length === 0) return;
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20) return;

  const expiresAt = formData.get("noExpiry") === "on" ? null : endOfDayPh(formData.get("expiresOn"));
  const base = label.trim();
  const rows = Array.from({ length: quantity }, (_, i) => ({
    code: newCode(product),
    product,
    label: quantity > 1 ? `${base} – ${i + 1}` : base,
    league_id: typeof leagueId === "string" && leagueId.length > 0 ? leagueId : null,
    expires_at: expiresAt,
    max_devices: devices,
  }));

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("stream_license").insert(rows);
  if (error) {
    // A duplicate code is astronomically unlikely (31^8 possibilities); retry once with fresh codes.
    await supabase.from("stream_license").insert(rows.map((r) => ({ ...r, code: newCode(product) })));
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

/**
 * Removes one phone from its code (lost, replaced, or swapped for a charged spare). That phone loses access at
 * its next check, and the freed place can be used by another phone.
 */
export async function removeStreamDeviceAction(formData: FormData) {
  const deviceId = formData.get("deviceId");
  if (typeof deviceId !== "string") return;
  const supabase = createSupabaseAdminClient();
  await supabase.from("stream_device").delete().eq("id", deviceId);
  revalidatePath("/admin/stream-codes");
}

/** How many phones the code may activate (e.g. raise from 3 to 4 for a spare phone). */
export async function setMaxDevicesAction(formData: FormData) {
  const id = formData.get("id");
  const devices = maxDevices(formData.get("maxDevices"));
  if (typeof id !== "string" || devices === null) return;
  const supabase = createSupabaseAdminClient();
  await supabase.from("stream_license").update({ max_devices: devices }).eq("id", id);
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
