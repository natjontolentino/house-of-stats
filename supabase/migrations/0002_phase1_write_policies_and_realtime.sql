-- Phase 1 write policies. Phase 1 has one manually-seeded league and no
-- device-pairing auth flow yet (that lands in Phase 2, spec 11.3), so the
-- tracker device writes with the anon key using its hardcoded device id.
-- These policies are intentionally permissive for a single-league prototype;
-- tighten to per-device JWT claims when device pairing (11.3) and
-- multi-league RLS isolation (11.4) land in Phase 2.

create policy "device insert game_event" on game_event for insert
  with check (true);

-- Append-only (spec 7.4): no update/delete policy on game_event at all —
-- corrections happen exclusively via a new event_voided row.

create policy "device insert game_lineup" on game_lineup for insert
  with check (true);

create policy "device update game_lock" on game for update
  using (true)
  with check (true);

-- device.last_seen_at heartbeat (spec 5.1, feeds the organizer sync-health
-- dashboard in 8.2).
create policy "device update heartbeat" on device for update
  using (true)
  with check (true);

-- Realtime (spec 8.1 live scores, 7.5 freshness): the web app subscribes to
-- game and game_event changes.
alter publication supabase_realtime add table game;
alter publication supabase_realtime add table game_event;
