/**
 * Phase 1 seed script — spec section 3: hardcode/seed one league, two teams,
 * and a schedule. Run with `npm run seed` from packages/shared after setting
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_LEAGUE_SETTINGS,
  SEED_LEAGUE_ID,
  SEED_SEASON_ID,
  SEED_VENUE_ID,
  SEED_DEVICE_ID,
  SEED_HOME_TEAM,
  SEED_AWAY_TEAM,
  SEED_GAMES,
} from "../src";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  console.log("Seeding league...");
  await upsert("league", {
    id: SEED_LEAGUE_ID,
    name: "Sunset Rec League",
    slug: "sunset-rec",
    logo_url: null,
    settings: DEFAULT_LEAGUE_SETTINGS,
    status: "active",
  });

  await upsert("venue", {
    id: SEED_VENUE_ID,
    league_id: SEED_LEAGUE_ID,
    name: "Sunset Community Gym",
    address: "100 Sunset Ave",
  });

  await upsert("device", {
    id: SEED_DEVICE_ID,
    league_id: SEED_LEAGUE_ID,
    label: "Scorer's Table Tablet",
    assigned_to_name: "Phase 1 Tracker",
    paired_at: new Date().toISOString(),
    last_seen_at: null,
    status: "active",
  });

  await upsert("season", {
    id: SEED_SEASON_ID,
    league_id: SEED_LEAGUE_ID,
    name: "2026 Winter Season",
    starts_on: "2026-01-05",
    ends_on: "2026-03-15",
    status: "active",
  });

  for (const team of [SEED_HOME_TEAM, SEED_AWAY_TEAM]) {
    console.log(`Seeding team ${team.name}...`);
    await upsert("team", {
      id: team.id,
      season_id: SEED_SEASON_ID,
      name: team.name,
      short_name: team.short_name,
      logo_url: null,
    });

    for (const player of team.players) {
      await upsert("player", {
        id: player.id,
        league_id: SEED_LEAGUE_ID,
        full_name: player.full_name,
        nickname: player.nickname,
        photo_url: null,
        is_minor: false,
        consent_flags: {},
      });
      await upsert(
        "roster_entry",
        {
          season_id: SEED_SEASON_ID,
          team_id: team.id,
          player_id: player.id,
          jersey_number: player.jersey_number,
          is_active: true,
        },
        "team_id,player_id",
      );
    }
  }

  for (const game of SEED_GAMES) {
    console.log(`Seeding game ${game.id}...`);
    await upsert("game", {
      id: game.id,
      season_id: SEED_SEASON_ID,
      home_team_id: SEED_HOME_TEAM.id,
      away_team_id: SEED_AWAY_TEAM.id,
      venue_id: SEED_VENUE_ID,
      court_label: game.court_label,
      scheduled_at: game.scheduled_at,
      status: "scheduled",
      locked_by_device_id: null,
      lock_expires_at: null,
      finalized_at: null,
      finalized_by: null,
    });
  }

  console.log("Seed complete.");
}

async function upsert(table: string, row: Record<string, unknown>, onConflict?: string) {
  // Every other seeded table gets an explicit fixed id (SEED_* constants),
  // so the default primary-key conflict target makes upsert idempotent.
  // roster_entry has no natural fixed id, so it needs an explicit conflict
  // target (its actual unique constraint) — otherwise a re-run would try to
  // insert a fresh row and collide with unique(team_id, player_id) instead.
  const { error } = await supabase.from(table).upsert(row, onConflict ? { onConflict } : undefined);
  if (error) {
    console.error(`Failed to upsert into ${table}:`, error.message);
    throw error;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
