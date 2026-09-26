import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Single client, safe on both server (RSC) and browser — anon key only, public read policies. */
export function createSupabaseClient() {
  return createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
    // Next.js caches server-side fetches; without this the live site kept showing
    // scores and games from before the last change.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
