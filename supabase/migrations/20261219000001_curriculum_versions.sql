-- Founder-editable curricula for The Art of Self (Identity & Self-Love first).
-- Every save is a new version; nothing is overwritten, so the curriculum can
-- keep evolving and any earlier version can be restored. Members only ever
-- see the single published version; drafts are visible to owner/executive only.
-- The founding version lives in the application code until a version is published.

create table public.curriculum_versions (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section ~ '^[a-z0-9-]{2,60}$'),
  version integer not null check (version > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object' and pg_column_size(content) < 400000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  note text check (char_length(note) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (section, version)
);
create unique index curriculum_one_published on public.curriculum_versions (section) where status = 'published';
alter table public.curriculum_versions enable row level security;

create policy "members read published" on public.curriculum_versions for select to authenticated using (status = 'published');
create policy "owner manages" on public.curriculum_versions for all
  using (public.has_staff_role(array['owner','executive']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));

-- Publishing is atomic: the previously published version is archived in the same step.
create or replace function public.publish_curriculum_version(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_section text;
begin
  if not public.has_staff_role(array['owner','executive']::public.staff_role[]) then
    raise exception 'Only the owner can publish a curriculum';
  end if;
  select section into v_section from public.curriculum_versions where id = p_id;
  if v_section is null then raise exception 'Unknown version'; end if;
  update public.curriculum_versions set status = 'archived' where section = v_section and status = 'published' and id <> p_id;
  update public.curriculum_versions set status = 'published', published_at = now() where id = p_id;
end $$;

revoke all on function public.publish_curriculum_version(uuid) from public, anon;
grant execute on function public.publish_curriculum_version(uuid) to authenticated;
revoke all on public.curriculum_versions from public, anon;
grant select, insert, update on public.curriculum_versions to authenticated;
grant all on public.curriculum_versions to service_role;
