-- Activation codes now belong to one app: 'hoops' (Pinoy Hoops Live, basketball) or 'pickle'
-- (Pinoy Pickle Live, pickleball). A code only unlocks the app it was made for, so the two can be
-- sold separately. Every existing code was made for the basketball app.

alter table stream_license
  add column product text not null default 'hoops' check (product in ('hoops', 'pickle'));

-- stream_activate gains p_product (default 'hoops', so the already-released basketball app, which
-- doesn't send it, keeps working). The old 3-argument version is dropped first: keeping both
-- overloads would make PostgREST's choice between them ambiguous.
drop function if exists stream_activate(text, text, text);

create function stream_activate(
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
  elsif v_lic.product <> coalesce(p_product, 'hoops') then
    return jsonb_build_object('status', 'wrong_app', 'product', v_lic.product);
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
    'expires_at', v_lic.expires_at,
    'product', v_lic.product
  );
end;
$$;

revoke execute on function stream_activate(text, text, text, text) from public;
grant execute on function stream_activate(text, text, text, text) to anon, authenticated;
