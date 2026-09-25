import { createSupabaseClient } from "./supabaseClient";
import { fetchSeasonStats } from "./seasonData";
import type { Game, Team } from "@courtstats/shared";

export async function fetchLeagueBySlug(slug: string) {
  const supabase = createSupabaseClient();

  const { data: league } = await supabase
    .from("league")
    .select("id, name, slug, logo_url, status")
    .eq("slug", slug)
    .neq("status", "archived")
    .maybeSingle();
  if (!league) return null;

  const { data: seasons } = await supabase
    .from("season")
    .select("id, name, status")
    .eq("league_id", league.id)
    .order("starts_on", { ascending: false });
  const season = (seasons ?? []).find((s) => s.status === "active") ?? (seasons ?? [])[0] ?? null;

  if (!season) return { league, season: null, teams: [] as Team[], games: [] as Game[], stats: null };

  const [{ data: teams }, { data: games }, stats] = await Promise.all([
    supabase.from("team").select("*").eq("season_id", season.id).order("name"),
    supabase.from("game").select("*").eq("season_id", season.id).order("scheduled_at", { ascending: false }).limit(30),
    fetchSeasonStats(season.id),
  ]);

  return { league, season, teams: (teams ?? []) as Team[], games: (games ?? []) as Game[], stats };
}
