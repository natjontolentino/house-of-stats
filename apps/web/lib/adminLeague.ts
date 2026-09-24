import "server-only";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "./supabaseAdminClient";

export const ADMIN_LEAGUE_COOKIE = "admin_league";

export interface AdminLeagueOption {
  id: string;
  name: string;
}

export interface AdminLeagueContext {
  leagues: AdminLeagueOption[];
  league: { id: string; name: string; logo_url: string | null };
  /** The league's in-progress season, else its most recent one. */
  season: { id: string; name: string };
}

/** Resolves which league the admin is currently managing (cookie, falling back to the oldest league) and that league's current season. Every admin page scopes to this instead of a hardcoded league. */
export async function getAdminLeagueContext(): Promise<AdminLeagueContext> {
  const supabase = createSupabaseAdminClient();
  const { data: leagueRows } = await supabase
    .from("league")
    .select("id, name, logo_url")
    .neq("status", "archived")
    .order("created_at");
  const leagues = leagueRows ?? [];
  if (leagues.length === 0) throw new Error("No leagues exist yet");

  const selectedId = cookies().get(ADMIN_LEAGUE_COOKIE)?.value;
  const league = leagues.find((l) => l.id === selectedId) ?? leagues[0];

  const { data: seasons } = await supabase
    .from("season")
    .select("id, name, status")
    .eq("league_id", league.id)
    .order("starts_on", { ascending: false });
  const season = (seasons ?? []).find((s) => s.status === "active") ?? (seasons ?? [])[0];
  if (!season) throw new Error(`League ${league.name} has no season`);

  return {
    leagues: leagues.map((l) => ({ id: l.id, name: l.name })),
    league,
    season: { id: season.id, name: season.name },
  };
}
