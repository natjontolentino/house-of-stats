-- Enforces spec 7.2: one device owns a game. A second device opening a game
-- that another device holds a live lock on is refused unless it explicitly
-- takes over (for a dead tablet). Locks are renewed by the device's
-- heartbeat while it is tracking, and released when the game is finalized.

drop function if exists device_claim_game(uuid, text, uuid);

create or replace function device_claim_game(
  p_device_id uuid,
  p_token text,
  p_game_id uuid,
  p_takeover boolean default false
)
returns table(result text, holder_label text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_league_id uuid := assert_device(p_device_id, p_token);
  v_locked_by uuid;
  v_expires timestamptz;
  v_label text;
begin
  select g.locked_by_device_id, g.lock_expires_at into v_locked_by, v_expires
  from game g
  join season s on s.id = g.season_id
  where g.id = p_game_id and s.league_id = v_league_id
  for update of g;

  if not found then
    raise exception 'game not in this device''s league' using errcode = '42501';
  end if;

  if v_locked_by is not null
     and v_locked_by <> p_device_id
     and v_expires is not null
     and v_expires > now()
     and not p_takeover then
    select coalesce(d.assigned_to_name, d.label) into v_label from device d where d.id = v_locked_by;
    return query select 'locked'::text, v_label;
    return;
  end if;

  update game g
  set locked_by_device_id = p_device_id,
      lock_expires_at = now() + interval '30 minutes',
      status = case when g.status = 'scheduled' then 'in_progress' else g.status end
  where g.id = p_game_id;

  return query select 'claimed'::text, null::text;
end;
$$;

-- Heartbeat also renews the lock on the game being tracked, and picks up a
-- lock for a game that was opened offline -- but never steals a live lock
-- held by another device.
drop function if exists device_heartbeat(uuid, text);

create or replace function device_heartbeat(p_device_id uuid, p_token text, p_game_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_league_id uuid := assert_device(p_device_id, p_token);
begin
  update device set last_seen_at = now() where id = p_device_id;

  if p_game_id is not null then
    update game g
    set locked_by_device_id = p_device_id,
        lock_expires_at = now() + interval '30 minutes'
    from season s
    where g.id = p_game_id
      and s.id = g.season_id
      and s.league_id = v_league_id
      and g.status <> 'finalized'
      and (
        g.locked_by_device_id is null
        or g.locked_by_device_id = p_device_id
        or g.lock_expires_at is null
        or g.lock_expires_at <= now()
      );
  end if;
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
  set status = 'finalized', finalized_at = now(), locked_by_device_id = null, lock_expires_at = null
  from season s
  where g.id = p_game_id and s.id = g.season_id and s.league_id = v_league_id;
end;
$$;

revoke execute on function device_claim_game(uuid, text, uuid, boolean) from public;
revoke execute on function device_heartbeat(uuid, text, uuid) from public;
grant execute on function device_claim_game(uuid, text, uuid, boolean) to anon, authenticated;
grant execute on function device_heartbeat(uuid, text, uuid) to anon, authenticated;
