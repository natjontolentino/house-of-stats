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

/**
 * Leagues ordered for the home page's leaders: those with at least one
 * finished game come first, newest play (live or finished) first. Leagues with
 * no finished game yet -- nothing to show leaders for -- go to the bottom, in
 * their original order.
 */
export async function rankLeaguesByRecentPlay(summaries: LeagueSummary[]): Promise<LeagueSummary[]> {
  const seasonIds = summaries.map((s) => s.seasonId).filter((id): id is string => !!id);
  if (seasonIds.length === 0) return summaries;

  const supabase = createSupabaseClient();
  const { data } = await supabase
    .from("game")
    .select("season_id, scheduled_at, status")
    .in("season_id", seasonIds)
    .in("status", ["in_progress", "finalized"])
    .order("scheduled_at", { ascending: false })
    .limit(500);

  // Newest first, so the first row seen for a season is its most recent game.
  const lastPlayed = new Map<string, string>();
  const hasFinished = new Set<string>();
  for (const row of data ?? []) {
    if (!lastPlayed.has(row.season_id)) lastPlayed.set(row.season_id, row.scheduled_at);
    if (row.status === "finalized") hasFinished.add(row.season_id);
  }

  return summaries
    .map((league, index) => ({
      league,
      index,
      finished: league.seasonId ? hasFinished.has(league.seasonId) : false,
      playedAt: league.seasonId ? lastPlayed.get(league.seasonId) : undefined,
    }))
    .sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.playedAt && b.playedAt) return a.playedAt < b.playedAt ? 1 : a.playedAt > b.playedAt ? -1 : a.index - b.index;
      if (a.playedAt) return -1;
      if (b.playedAt) return 1;
      return a.index - b.index;
    })
    .map((x) => x.league);
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
