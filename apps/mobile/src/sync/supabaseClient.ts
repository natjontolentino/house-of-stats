import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Phase 1 has no sign-in flow — only the anon key is ever used — so there is
// no session to persist. Supabase-js's default auth config assumes browser
// `localStorage`, which doesn't exist in React Native; disabling session
// persistence/auto-refresh avoids relying on that assumption entirely.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
