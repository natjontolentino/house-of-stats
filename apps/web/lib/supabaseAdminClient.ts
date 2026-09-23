import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for the admin data-entry form (league/team/player/
 * game management). RLS blocks the public anon key from writing to league,
 * season, team, player, roster_entry, or game(insert) entirely (0001_init.sql
 * only grants public SELECT on those) -- by design, per spec principle
 * "League data is isolated at the database level, not merely hidden in the
 * interface." The service role key bypasses RLS, so this must only ever be
 * called from a Server Action or Route Handler gated by the admin session
 * check (middleware.ts), never from a Client Component or anything that
 * ships to the browser -- the `server-only` import makes that a build error
 * if it's ever imported from client code, rather than a silent key leak.
 */
export function createSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
