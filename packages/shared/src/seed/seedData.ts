/**
 * Phase 1 hardcoded/manually-seeded league — spec section 3 ("Hardcode or
 * manually seed one league, two teams, and a schedule"). Fixed IDs so the
 * mobile app config and the seed script agree without any pairing flow
 * (device pairing is Phase 2, spec 11.3).
 */

export const SEED_LEAGUE_ID = "11111111-1111-4111-8111-111111111111";
export const SEED_SEASON_ID = "22222222-2222-4222-8222-222222222222";
export const SEED_VENUE_ID = "33333333-3333-4333-8333-333333333333";
export const SEED_DEVICE_ID = "44444444-4444-4444-8444-444444444444";

export const SEED_HOME_TEAM_ID = "55555555-5555-4555-8555-555555555555";
export const SEED_AWAY_TEAM_ID = "66666666-6666-4666-8666-666666666666";

export interface SeedPlayer {
  id: string;
  full_name: string;
  nickname: string;
  jersey_number: string;
}

function playerId(teamLetter: "h" | "a", n: number): string {
  return `7${teamLetter === "h" ? "7" : "8"}777777-7777-4777-8777-77777777${n
    .toString()
    .padStart(4, "0")}`;
}

export const SEED_HOME_TEAM = {
  id: SEED_HOME_TEAM_ID,
  name: "Ridgeline Hawks",
  short_name: "RDG",
  players: [
    { id: playerId("h", 1), full_name: "Marcus Ellery", nickname: "Ellery", jersey_number: "4" },
    { id: playerId("h", 2), full_name: "Devon Pruitt", nickname: "Pruitt", jersey_number: "7" },
    { id: playerId("h", 3), full_name: "Jalen Ocasio", nickname: "Ocasio", jersey_number: "10" },
    { id: playerId("h", 4), full_name: "Ryan Fetterman", nickname: "Fetterman", jersey_number: "11" },
    { id: playerId("h", 5), full_name: "Andre Boskovic", nickname: "Boskovic", jersey_number: "15" },
    { id: playerId("h", 6), full_name: "Kofi Adjei", nickname: "Adjei", jersey_number: "21" },
    { id: playerId("h", 7), full_name: "Trent Yarbrough", nickname: "Yarbrough", jersey_number: "23" },
    { id: playerId("h", 8), full_name: "Sam Delacroix", nickname: "Delacroix", jersey_number: "32" },
    { id: playerId("h", 9), full_name: "Nico Estevez", nickname: "Estevez", jersey_number: "34" },
    { id: playerId("h", 10), full_name: "Willie Nakashima", nickname: "Nakashima", jersey_number: "44" },
  ] satisfies SeedPlayer[],
};

export const SEED_AWAY_TEAM = {
  id: SEED_AWAY_TEAM_ID,
  name: "Harbor City Comets",
  short_name: "HBR",
  players: [
    { id: playerId("a", 1), full_name: "Isaiah Whitfield", nickname: "Whitfield", jersey_number: "2" },
    { id: playerId("a", 2), full_name: "Owen Mackleroy", nickname: "Mackleroy", jersey_number: "5" },
    { id: playerId("a", 3), full_name: "Deshawn Ilori", nickname: "Ilori", jersey_number: "8" },
    { id: playerId("a", 4), full_name: "Micah Vantongeren", nickname: "Vantong", jersey_number: "12" },
    { id: playerId("a", 5), full_name: "Cole Abernathy", nickname: "Abernathy", jersey_number: "14" },
    { id: playerId("a", 6), full_name: "Julian Okafor", nickname: "Okafor", jersey_number: "20" },
    { id: playerId("a", 7), full_name: "Bryce Talamantes", nickname: "Talaman", jersey_number: "24" },
    { id: playerId("a", 8), full_name: "Femi Adegoke", nickname: "Adegoke", jersey_number: "30" },
    { id: playerId("a", 9), full_name: "Gunnar Hollis", nickname: "Hollis", jersey_number: "33" },
    { id: playerId("a", 10), full_name: "Theo Marchetti", nickname: "Marchetti", jersey_number: "42" },
  ] satisfies SeedPlayer[],
};

export interface SeedGame {
  id: string;
  scheduled_at: string;
  court_label: string;
}

function gameId(n: number): string {
  return `99999999-9999-4999-8999-99999999999${n}`;
}

export const SEED_GAMES: SeedGame[] = [
  { id: gameId(1), scheduled_at: new Date().toISOString(), court_label: "Court 1" },
  {
    id: gameId(2),
    scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    court_label: "Court 1",
  },
  {
    id: gameId(3),
    scheduled_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    court_label: "Court 2",
  },
];
