import { createSupabaseClient } from "./supabaseClient";

export interface LeagueSummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  seasonId: string | null;
  seasonName: string;
  seasonStatus: string;
  teamCount: number;
}

/** The season whose games most recently started or finished across the given leagues -- what the home page's leaders should reflect. */
export async function fetchFeaturedSeasonId(summaries: LeagueSummary[]): Promise<string | null> {
  const seasonIds = summaries.map((s) => s.seasonId).filter((id): id is string => !!id);
  if (seasonIds.length === 0) return null;
  const supabase = createSupabaseClient();
  const { data } = await supabase
    .from("game")
    .select("season_id")
    .in("season_id", seasonIds)
    .in("status", ["in_progress", "finalized"])
    .order("scheduled_at", { ascending: false })
    .limit(1);
  return data?.[0]?.season_id ?? seasonIds[0];
}

/**
 * All active leagues for the home page's "Leagues" section -- one card per
 * league, each with its own logo. Only one league exists today, but the
 * section is built to show N as more get added via the admin.
 */
export async function fetchLeagueSummaries(): Promise<LeagueSummary[]> {
  const supabase = createSupabaseClient();

  const { data: leagues } = await supabase
    .from("league")
    .select("id, slug, name, logo_url")
    .eq("status", "active")
    .order("created_at");
  if (!leagues || leagues.length === 0) return [];

  const leagueIds = leagues.map((l) => l.id);
  const { data: seasons } = await supabase
    .from("season")
    .select("id, league_id, name, status, starts_on")
    .in("league_id", leagueIds)
    .order("starts_on", { ascending: false });

  // Prefer each league's in-progress season, falling back to its most recent one.
  const seasonByLeague = new Map<string, { id: string; name: string; status: string }>();
  for (const s of seasons ?? []) {
    const current = seasonByLeague.get(s.league_id);
    if (!current || (s.status === "active" && current.status !== "active")) {
      seasonByLeague.set(s.league_id, s);
    }
  }

  const seasonIds = [...seasonByLeague.values()].map((s) => s.id);
  const teamCounts = new Map<string, number>();
  if (seasonIds.length > 0) {
    const { data: teams } = await supabase.from("team").select("id, season_id").in("season_id", seasonIds);
    for (const t of teams ?? []) {
      teamCounts.set(t.season_id, (teamCounts.get(t.season_id) ?? 0) + 1);
    }
  }

  return leagues.map((l) => {
    const season = seasonByLeague.get(l.id);
    return {
      id: l.id,
      slug: l.slug,
      name: l.name,
      logoUrl: l.logo_url,
      seasonId: season?.id ?? null,
      seasonName: season?.name ?? "",
      seasonStatus: season?.status ?? "",
      teamCount: season ? teamCounts.get(season.id) ?? 0 : 0,
    };
  });
}
