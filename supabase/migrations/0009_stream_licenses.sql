-- Activation codes for the Pinoy Hoops Live streaming app (a separate Android
-- app that shares this backend). One code unlocks exactly one phone; a code can
-- optionally expire and optionally belong to a league. Customers who only buy the
-- streaming app never touch the stats platform: league_id is simply left empty.
--
-- Kept self-contained (stream_ prefix, no foreign keys other than the optional
-- league link) so the streaming side can be moved to its own backend later by
-- copying this one table and two functions.

create table stream_license (
  id uuid primary key default gen_random_uuid(),
  -- The code the customer types, e.g. "PHL-7K3M-Q9TX". Stored readable (not hashed)
  -- so the operator can look it up and resend it; once activated it is bound to
  -- one phone, so a leaked used code is worthless.
  code text not null unique,
  label text not null,
  league_id uuid references league(id) on delete set null,
  expires_at timestamptz,                -- null = never expires
  status text not null default 'active' check (status in ('active', 'revoked')),
  -- The phone the code is bound to: a random id the app generates once per install.
  installation_id text,
  device_label text,
  token_hash text,                       -- sha256 of the secret the app got at activation
  activated_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

alter table stream_license enable row level security;
-- Deliberately no policies: like league_credential and device, this table is
-- reachable only through the service role (web admin) or the security definer
-- functions below -- never a direct anon select/insert/update.

-- Called by the app with the anon key when a code is entered. Binds the code to
-- this phone and returns a fresh secret token, or a status explaining why not.
create or replace function stream_activate(
  p_code text,
  p_installation_id text,
  p_device_label text default 'Android phone'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_lic stream_license%rowtype;
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_league_name text;
begin
  if p_installation_id is null or length(p_installation_id) < 8 then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- Codes are compared without dashes/spaces and case-insensitively.
  select * into v_lic
  from stream_license
  where upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')) = v_code
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  elsif v_lic.status <> 'active' then
    return jsonb_build_object('status', 'revoked');
  elsif v_lic.expires_at is not null and v_lic.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  elsif v_lic.installation_id is not null and v_lic.installation_id <> p_installation_id then
    return jsonb_build_object('status', 'in_use');
  end if;

  update stream_license
  set installation_id = p_installation_id,
      device_label = left(coalesce(p_device_label, 'Android phone'), 80),
      token_hash = encode(digest(v_token, 'sha256'), 'hex'),
      activated_at = coalesce(activated_at, now()),
      last_seen_at = now()
  where id = v_lic.id;

  select name into v_league_name from league where id = v_lic.league_id;

  return jsonb_build_object(
    'status', 'ok',
    'license_id', v_lic.id,
    'token', v_token,
    'label', v_lic.label,
    'league_name', v_league_name,
    'expires_at', v_lic.expires_at
  );
end;
$$;

revoke execute on function stream_activate(text, text, text) from public;
grant execute on function stream_activate(text, text, text) to anon, authenticated;

-- Called by the app now and then (whenever it has internet) to confirm the phone
-- is still allowed. Also picks up a changed expiry date.
create or replace function stream_check(p_license_id uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_lic stream_license%rowtype;
begin
  select * into v_lic
  from stream_license
  where id = p_license_id
    and token_hash is not null
    and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');

  if not found then
    -- Wrong token, deleted code, or the code was released to another phone.
    return jsonb_build_object('status', 'invalid');
  end if;

  update stream_license set last_seen_at = now() where id = v_lic.id;

  if v_lic.status <> 'active' then
    return jsonb_build_object('status', 'revoked');
  elsif v_lic.expires_at is not null and v_lic.expires_at <= now() then
    return jsonb_build_object('status', 'expired', 'expires_at', v_lic.expires_at);
  end if;

  return jsonb_build_object('status', 'ok', 'label', v_lic.label, 'expires_at', v_lic.expires_at);
end;
$$;

revoke execute on function stream_check(uuid, text) from public;
grant execute on function stream_check(uuid, text) to anon, authenticated;
