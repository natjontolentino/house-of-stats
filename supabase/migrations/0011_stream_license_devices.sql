-- Several phones per activation code, for the new multi-camera app "Pinoy Hoops Live Stream Advanced"
-- (product 'hoops_adv', codes PHA-...): one code covers a main phone plus camera-only phones, by default 3
-- (1 main + 2 cameras). The single-camera apps (hoops, pickle) stay at 1 phone per code. The operator can raise
-- the limit per code for spare phones (e.g. when one runs low on battery) and remove a phone that's no longer used.
--
-- Until now a code was bound to one phone through columns on stream_license itself. Phones move to their own
-- table; existing activations are copied over, so nobody has to activate again. The old columns stay (unused)
-- so this can't lose data.

alter table stream_license drop constraint if exists stream_license_product_check;
alter table stream_license
  add constraint stream_license_product_check check (product in ('hoops', 'pickle', 'hoops_adv'));

-- Existing codes keep 1 phone; the admin page sets 3 for new Advanced codes.
alter table stream_license
  add column max_devices int not null default 1 check (max_devices between 1 and 20);

create table stream_device (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references stream_license(id) on delete cascade,
  -- The random id the app generates once per install.
  installation_id text not null,
  device_label text,
  token_hash text,                       -- sha256 of the secret the app got at activation
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  unique (license_id, installation_id)
);

alter table stream_device enable row level security;
-- Deliberately no policies, like stream_license: only the service role (web admin) and the security definer
-- functions below can read or write it.

insert into stream_device (license_id, installation_id, device_label, token_hash, activated_at, last_seen_at)
select id, installation_id, device_label, token_hash, coalesce(activated_at, now()), last_seen_at
from stream_license
where installation_id is not null;

-- Same signature as in 0010, so released apps keep working. A phone already on the code just gets a fresh
-- token; a new phone is added while the code has room (max_devices), otherwise 'in_use'.
create or replace function stream_activate(
  p_code text,
  p_installation_id text,
  p_device_label text default 'Android phone',
  p_product text default 'hoops'
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
  v_hash text := encode(digest(v_token, 'sha256'), 'hex');
  v_used int;
  v_league_name text;
begin
  if p_installation_id is null or length(p_installation_id) < 8 then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- Codes are compared without dashes/spaces and case-insensitively. Locked so two phones activating at the
  -- same moment can't both take the last free place.
  select * into v_lic
  from stream_license
  where upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')) = v_code
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  elsif v_lic.product <> coalesce(p_product, 'hoops') then
    return jsonb_build_object('status', 'wrong_app', 'product', v_lic.product);
  elsif v_lic.status <> 'active' then
    return jsonb_build_object('status', 'revoked');
  elsif v_lic.expires_at is not null and v_lic.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  update stream_device
  set token_hash = v_hash,
      device_label = left(coalesce(p_device_label, 'Android phone'), 80),
      last_seen_at = now()
  where license_id = v_lic.id and installation_id = p_installation_id;

  if not found then
    select count(*) into v_used from stream_device where license_id = v_lic.id;
    if v_used >= v_lic.max_devices then
      return jsonb_build_object('status', 'in_use', 'max_devices', v_lic.max_devices);
    end if;
    insert into stream_device (license_id, installation_id, device_label, token_hash, last_seen_at)
    values (v_lic.id, p_installation_id, left(coalesce(p_device_label, 'Android phone'), 80), v_hash, now());
  end if;

  select count(*) into v_used from stream_device where license_id = v_lic.id;
  select name into v_league_name from league where id = v_lic.league_id;

  return jsonb_build_object(
    'status', 'ok',
    'license_id', v_lic.id,
    'token', v_token,
    'label', v_lic.label,
    'league_name', v_league_name,
    'expires_at', v_lic.expires_at,
    'product', v_lic.product,
    'devices_used', v_used,
    'max_devices', v_lic.max_devices
  );
end;
$$;

revoke execute on function stream_activate(text, text, text, text) from public;
grant execute on function stream_activate(text, text, text, text) to anon, authenticated;

-- Same signature as before. The token now belongs to one phone of the code; a removed phone gets 'invalid'.
create or replace function stream_check(p_license_id uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_lic stream_license%rowtype;
  v_device_id uuid;
begin
  select d.id into v_device_id
  from stream_device d
  where d.license_id = p_license_id
    and d.token_hash is not null
    and d.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');

  if v_device_id is null then
    -- Wrong token, deleted code, or this phone was removed from the code.
    return jsonb_build_object('status', 'invalid');
  end if;

  update stream_device set last_seen_at = now() where id = v_device_id;
  select * into v_lic from stream_license where id = p_license_id;

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
