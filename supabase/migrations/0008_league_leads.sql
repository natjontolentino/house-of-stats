-- Inquiries submitted through the public "Add your league" popup. There is
-- no self-serve league signup yet (spec: the operator creates each league
-- account manually) -- this is the record of who has asked.
create table league_lead (
  id uuid primary key default gen_random_uuid(),
  league_name text not null,
  contact_name text not null,
  contact_number text,
  status text not null default 'new' check (status in ('new', 'contacted', 'onboarded', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table league_lead enable row level security;
-- Deliberately no policies: like device/user_account/league_credential, this
-- table is reachable only through the service role -- the public popup's
-- server action inserts with the service role directly, and the admin leads
-- page reads the same way. The anon key is never granted access.
