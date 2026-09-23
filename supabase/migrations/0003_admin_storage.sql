-- Admin data-entry form (league/team/player/game management) needs
-- somewhere to store uploaded league and team logo images. Public bucket:
-- logos are shown on the public website, same as everything else in
-- Phase 1's "public read of everything" policy set (0001_init.sql).
-- Writes go through the server-only service-role client (bypasses storage
-- RLS entirely), so no insert/update/delete policy is needed here --
-- only a public read policy so the uploaded images actually display.

insert into storage.buckets (id, name, public)
values ('league-assets', 'league-assets', true)
on conflict (id) do nothing;

create policy "public read league-assets"
on storage.objects for select
using (bucket_id = 'league-assets');
