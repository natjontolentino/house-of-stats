import { createSupabaseClient } from "./supabaseClient";
import type { Game, Team } from "@courtstats/shared";

export interface ScheduleGame {
  id: string;
  scheduledAt: string;
  status: Game["status"];
  courtLabel: string | null;
  awayTeam: string;
  homeTeam: string;
  leagueName: string;
  leagueSlug: string;
}

/** Every game across all active leagues, soonest first. */
export async function fetchSchedule(): Promise<ScheduleGame[]> {
  const supabase = createSupabaseClient();

  const { data: leagues } = await supabase.from("league").select("id, name, slug").eq("status", "active");
  if (!leagues || leagues.length === 0) return [];

  const { data: seasons } = await supabase
    .from("season")
    .select("id, league_id")
    .in("league_id", leagues.map((l) => l.id));
  const seasonIds = (seasons ?? []).map((s) => s.id);
  if (seasonIds.length === 0) return [];

  const { data: gameRows } = await supabase
    .from("game")
    .select("*")
    .in("season_id", seasonIds)
    .order("scheduled_at", { ascending: true })
    .limit(200);
  const games = (gameRows ?? []) as Game[];
  if (games.length === 0) return [];

  const teamIds = Array.from(new Set(games.flatMap((g) => [g.home_team_id, g.away_team_id])));
  const { data: teamRows } = await supabase.from("team").select("id, name").in("id", teamIds);
  const teamName = new Map(((teamRows ?? []) as Pick<Team, "id" | "name">[]).map((t) => [t.id, t.name]));

  const leagueBySeason = new Map((seasons ?? []).map((s) => [s.id, leagues.find((l) => l.id === s.league_id)!]));

  return games.map((g) => {
    const league = leagueBySeason.get(g.season_id);
    return {
      id: g.id,
      scheduledAt: g.scheduled_at,
      status: g.status,
      courtLabel: g.court_label,
      awayTeam: teamName.get(g.away_team_id) ?? "?",
      homeTeam: teamName.get(g.home_team_id) ?? "?",
      leagueName: league?.name ?? "",
      leagueSlug: league?.slug ?? "",
    };
  });
}
