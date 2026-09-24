-- Locks down mobile writes. Until now any holder of the public anon key could
-- insert game events / lineups and update any game or device row (0002's
-- permissive policies). Now every device write goes through a security-definer
-- function that requires the device's own secret token (issued at login) and
-- only touches games in that device's league. The open policies are dropped.

alter table device add column token_hash text;

-- Internal helper: returns the device's league_id, or raises if the
-- id/token pair is wrong or the device is unpaired. Not callable by clients.
create or replace function assert_device(p_device_id uuid, p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_league_id uuid;
begin
  select league_id into v_league_id
  from device
  where id = p_device_id
    and status = 'active'
    and token_hash is not null
    and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');

  if v_league_id is null then
    raise exception 'invalid device credentials' using errcode = '28000';
  end if;
  return v_league_id;
end;
$$;

revoke execute on function assert_device(uuid, text) from public;

-- Login now also issues a fresh device token (the return type changes, so the
-- old function has to be dropped first). The token is random and high-entropy,
-- so a plain sha256 is enough to store it; it is returned once, to the device.
drop function if exists login_with_league_code(text, text, text);

create function login_with_league_code(
  p_code text,
  p_installation_id text,
  p_device_label text default 'Mobile device'
)
returns table(league_id uuid, league_name text, device_id uuid, device_token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_league_id uuid;
  v_league_name text;
  v_device_id uuid;
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_hash text := encode(digest(v_token, 'sha256'), 'hex');
begin
  select l.id, l.name into v_league_id, v_league_name
  from league_credential lc
  join league l on l.id = lc.league_id
  where lc.code_hash = crypt(p_code, lc.code_hash)
    and l.status = 'active';

  if v_league_id is null then
    return;
  end if;

  select d.id into v_device_id
  from device d
  where d.league_id = v_league_id and d.client_installation_id = p_installation_id;

  if v_device_id is null then
    insert into device (league_id, label, status, client_installation_id, paired_at, last_seen_at, token_hash)
    values (v_league_id, coalesce(p_device_label, 'Mobile device'), 'active', p_installation_id, now(), now(), v_hash)
    returning id into v_device_id;
  else
    update device set last_seen_at = now(), token_hash = v_hash where id = v_device_id and status = 'active';
    if not found then
      return;
    end if;
  end if;

  return query select v_league_id, v_league_name, v_device_id, v_token;
end;
$$;

revoke execute on function login_with_league_code(text, text, text) from public;
grant execute on function login_with_league_code(text, text, text) to anon, authenticated;

-- Append-only event push (spec 7.4). Duplicate client_uuids are ignored, so a
-- retried batch is never double-applied. Every event is stamped with the
-- calling device (a client can't claim another device recorded it) and must
-- belong to a game in the device's own league.
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

-- Claims (or renews) the game lock for this device and starts a scheduled game.
create or replace function device_claim_game(p_device_id uuid, p_token text, p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_league_id uuid := assert_device(p_device_id, p_token);
begin
  update game g
  set locked_by_device_id = p_device_id,
      lock_expires_at = now() + interval '30 minutes',
      status = case when g.status = 'scheduled' then 'in_progress' else g.status end
  from season s
  where g.id = p_game_id and s.id = g.season_id and s.league_id = v_league_id;
end;
$$;

create or replace function device_finalize_game(p_device_id uuid, p_token text, p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_league_id uuid := assert_device(p_device_id, p_token);
begin
  update game g
  set status = 'finalized', finalized_at = now()
  from season s
  where g.id = p_game_id and s.id = g.season_id and s.league_id = v_league_id;
end;
$$;

create or replace function device_heartbeat(p_device_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_device(p_device_id, p_token);
  update device set last_seen_at = now() where id = p_device_id;
end;
$$;

revoke execute on function device_push_events(uuid, text, jsonb) from public;
revoke execute on function device_claim_game(uuid, text, uuid) from public;
revoke execute on function device_finalize_game(uuid, text, uuid) from public;
revoke execute on function device_heartbeat(uuid, text) from public;
grant execute on function device_push_events(uuid, text, jsonb) to anon, authenticated;
grant execute on function device_claim_game(uuid, text, uuid) to anon, authenticated;
grant execute on function device_finalize_game(uuid, text, uuid) to anon, authenticated;
grant execute on function device_heartbeat(uuid, text) to anon, authenticated;

-- The open Phase 1 policies are no longer needed: nothing writes with the
-- bare anon key any more (game_lineup is not written by any client at all).
drop policy "device insert game_event" on game_event;
drop policy "device insert game_lineup" on game_lineup;
drop policy "device update game_lock" on game;
drop policy "device update heartbeat" on device;
