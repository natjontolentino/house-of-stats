"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../../../lib/supabaseAdminClient";
import { ADMIN_LEAGUE_COOKIE } from "../../../lib/adminLeague";

function selectLeague(leagueId: string) {
  cookies().set(ADMIN_LEAGUE_COOKIE, leagueId, { path: "/admin", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
}

export async function selectLeagueAction(formData: FormData) {
  const leagueId = formData.get("leagueId");
  if (typeof leagueId !== "string") return;
  selectLeague(leagueId);
  const next = formData.get("next");
  redirect(typeof next === "string" && /^\/admin(\/[a-z]+)?$/.test(next) ? next : "/admin");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createLeagueAction(formData: FormData) {
  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length === 0) return;

  const supabase = createSupabaseAdminClient();
  const baseSlug = slugify(name) || "league";

  let league: { id: string } | null = null;
  for (let attempt = 0; attempt < 5 && !league; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await supabase.from("league").insert({ name: name.trim(), slug }).select("id").single();
    league = data;
  }
  if (!league) return;

  const today = new Date();
  const end = new Date(today);
  end.setMonth(end.getMonth() + 6);
  await supabase.from("season").insert({
    league_id: league.id,
    name: `${today.getFullYear()} Season`,
    starts_on: today.toISOString().slice(0, 10),
    ends_on: end.toISOString().slice(0, 10),
    status: "active",
  });

  selectLeague(league.id);
  redirect("/admin/league");
}
