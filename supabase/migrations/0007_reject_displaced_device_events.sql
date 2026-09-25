-- A device that lost a game to a takeover (spec 7.2/7.3) must stop writing to
-- it: its locally-assigned sequence numbers would collide with the new
-- owner's and the whole batch would fail forever. device_push_events now
-- refuses events for any game whose lock is held by a different device, with
-- a recognisable message so the app can tell the tracker and stop.
-- (A game with no lock at all is still accepted -- a device that tracked
-- fully offline pushes once it reconnects.)

create or replace function device_push_events(p_device_id uuid, p_token text, p_events jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_league_id uuid := assert_device(p_device_id, p_token);
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_events) as e(game_id uuid)
    where not exists (
      select 1 from game g join season s on s.id = g.season_id
      where g.id = e.game_id and s.league_id = v_league_id
    )
  ) then
    raise exception 'event for a game outside this device''s league' using errcode = '42501';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_events) as e(game_id uuid)
    join game g on g.id = e.game_id
    where g.locked_by_device_id is not null and g.locked_by_device_id <> p_device_id
  ) then
    raise exception 'game_lock_lost' using errcode = '55006';
  end if;

  insert into game_event (
    game_id, sequence, event_type, team_id, player_id, period, clock_ms,
    payload, recorded_by_device_id, recorded_by_user_id, client_uuid, created_at
  )
  select
    e.game_id, e.sequence, e.event_type, e.team_id, e.player_id, e.period, e.clock_ms,
    coalesce(e.payload, '{}'::jsonb), p_device_id, null, e.client_uuid, coalesce(e.created_at, now())
  from jsonb_to_recordset(p_events) as e(
    game_id uuid, sequence integer, event_type text, team_id uuid, player_id uuid,
    period integer, clock_ms integer, payload jsonb, client_uuid text, created_at timestamptz
  )
  on conflict (client_uuid) do nothing;
end;
$$;
