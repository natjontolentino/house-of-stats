-- Per-league mobile login (spec 11.3-adjacent): lets one physical device log
-- into different leagues instead of being permanently hardcoded to one, via
-- a shared per-league code rather than full per-tracker accounts (out of
-- scope for now — spec 11.2's user_account system is still unbuilt).

create table league_credential (
  league_id uuid primary key references league(id) on delete cascade,
  code_hash text not null,
  updated_at timestamptz not null default now()
);

alter table league_credential enable row level security;
-- Deliberately no policies: like `device` and `user_account`, this table is
-- reachable only through the service role (admin) or a security definer
-- function below -- never a direct anon select/insert/update.

-- A device row is scoped to one league (schema already enforces this via
-- device.league_id not null). client_installation_id is a UUID the mobile
-- app generates once per physical install and persists locally, so logging
-- into the same league twice from the same phone reuses its device row
-- instead of creating a new one every time.
alter table device add column client_installation_id text;
create unique index device_league_installation_uidx
  on device (league_id, client_installation_id)
  where client_installation_id is not null;

-- Called only from the web admin (service role), never from a mobile client.
create or replace function set_league_login_code(p_league_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_code is null or length(p_code) < 4 then
    raise exception 'login code must be at least 4 characters';
  end if;

  insert into league_credential (league_id, code_hash, updated_at)
  values (p_league_id, crypt(p_code, gen_salt('bf')), now())
  on conflict (league_id) do update set code_hash = excluded.code_hash, updated_at = now();
end;
$$;

revoke execute on function set_league_login_code(uuid, text) from public;
grant execute on function set_league_login_code(uuid, text) to service_role;

-- Called from the mobile app with the anon key. Verifies the code without
-- ever exposing league_credential to a direct select, and gets-or-creates
-- this install's device row for the matched league.
create or replace function login_with_league_code(
  p_code text,
  p_installation_id text,
  p_device_label text default 'Mobile device'
)
returns table(league_id uuid, league_name text, device_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_league_id uuid;
  v_league_name text;
  v_device_id uuid;
begin
  select l.id, l.name into v_league_id, v_league_name
  from league_credential lc
  join league l on l.id = lc.league_id
  where lc.code_hash = crypt(p_code, lc.code_hash)
    and l.status = 'active';

  if v_league_id is null then
    return;
  end if;

  select id into v_device_id
  from device
  where device.league_id = v_league_id and device.client_installation_id = p_installation_id;

  if v_device_id is null then
    insert into device (league_id, label, status, client_installation_id, paired_at, last_seen_at)
    values (v_league_id, coalesce(p_device_label, 'Mobile device'), 'active', p_installation_id, now(), now())
    returning id into v_device_id;
  else
    update device set last_seen_at = now() where id = v_device_id;
  end if;

  return query select v_league_id, v_league_name, v_device_id;
end;
$$;

revoke execute on function login_with_league_code(text, text, text) from public;
grant execute on function login_with_league_code(text, text, text) to anon, authenticated;
