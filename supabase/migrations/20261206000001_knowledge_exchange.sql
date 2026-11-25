-- ════════════════════════════════════════════════════════════════════
-- The Knowledge Exchange — Webinar & Learning Center (The Professional Society)
--
-- • Paid members host webinars; any number may run at the same time on
--   different topics. Every webinar is reviewed and approved before it is
--   published. Hosts use their own Zoom / Google Meet / Teams for now.
-- • Free business members may attend N complimentary eligible webinars
--   (owner-configurable, default 3). Only distinct webinars actually joined
--   count; browsing, registering, cancelled events and re-joining don't.
-- • Meeting links are private: released only to eligible registrants, close
--   to the start time, and joining is what records attendance.
-- • Every published webinar has a public page; visits are counted by source
--   for referral tracking. Hosts never see attendees' assessments or contacts.
-- ════════════════════════════════════════════════════════════════════

insert into public.platform_settings (key, value, description) values
  ('complimentary_webinars', '3', 'Complimentary eligible webinars a free business member may attend before membership is required')
on conflict (key) do nothing;

create table business.webinar_topics (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table business.webinars (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(title) between 5 and 140),
  description text not null check (length(description) between 20 and 5000),
  topic text references business.webinar_topics (slug),
  industry text references business.industries (slug),
  audience text check (length(audience) <= 400),
  learning_objectives text[] not null default '{}' check (cardinality(learning_objectives) <= 8),
  host_display_name text not null check (length(host_display_name) between 2 and 120),
  host_bio text check (length(host_bio) <= 1500),
  co_hosts text check (length(co_hosts) <= 600),
  starts_at timestamptz not null,
  time_zone text not null default 'America/Chicago' check (time_zone ~ '^[A-Za-z_]+(/[A-Za-z_+-]+)*$'),
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  capacity integer check (capacity between 1 and 10000),
  access text not null default 'standard' check (access in ('standard', 'members_only', 'special_event')),
  price_cents integer check (price_cents >= 0),          -- future separately priced special events (not sold yet)
  promo_image_path text check (promo_image_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  logo_path text check (logo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  headshot_path text check (headshot_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  use_template text not null default 'espresso' check (use_template in ('espresso', 'cream', 'burgundy', 'own_flyer')),
  media_rights_confirmed boolean not null default false,
  provider text not null default 'zoom' check (provider in ('zoom', 'google_meet', 'teams', 'other')),
  resources text check (length(resources) <= 3000),
  recording_planned boolean not null default false,
  recording_url text check (recording_url ~ '^https://'),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'changes_requested', 'approved', 'canceled', 'completed', 'rejected')),
  review_note text check (length(review_note) <= 2000),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('draft', 'canceled', 'rejected') or media_rights_confirmed)
);
create index webinars_upcoming_idx on business.webinars (status, starts_at);
create trigger touch_webinars before update on business.webinars for each row execute function public.touch_updated_at();

-- Private join details: never readable directly by members.
create table business.webinar_private (
  webinar_id uuid primary key references business.webinars (id) on delete cascade,
  join_url text not null check (join_url ~ '^https://' and length(join_url) <= 600),
  passcode text check (length(passcode) <= 60)
);

create table business.webinar_registrations (
  webinar_id uuid not null references business.webinars (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  registered_at timestamptz not null default now(),
  canceled_at timestamptz,
  attended_at timestamptz,
  referral_source text check (length(referral_source) <= 40),
  recording_consent boolean not null default false,
  feedback_rating integer check (feedback_rating between 1 and 5),
  feedback_text text check (length(feedback_text) <= 2000),
  primary key (webinar_id, user_id)
);

create table business.webinar_questions (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references business.webinars (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(btrim(body)) between 3 and 1000),
  answered boolean not null default false,
  created_at timestamptz not null default now()
);

-- Public page visits by source (no personal data).
create table business.webinar_visits (
  id bigint generated always as identity primary key,
  webinar_id uuid not null references business.webinars (id) on delete cascade,
  source text not null default 'direct' check (source ~ '^[a-z0-9_-]{1,40}$'),
  visited_at timestamptz not null default now()
);
create index webinar_visits_idx on business.webinar_visits (webinar_id, source);

create table business.webinar_host_interest (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  topics text check (length(topics) <= 600),
  note text check (length(note) <= 1500),
  created_at timestamptz not null default now()
);

-- ─── Rules ─────────────────────────────────────────────────────────
-- Hosts: Professional Society members with hosting enabled.
create or replace function business.can_host()
returns boolean language sql stable security definer set search_path = business, public as $$
  select business.can_use('webinar_hosting') and business.member_tier() = 'premium';
$$;

create or replace function business.complimentary_allowance()
returns integer language sql stable security definer set search_path = public as $$
  select public.setting_int('complimentary_webinars', 3);
$$;

-- Distinct eligible webinars the member actually joined.
create or replace function business.complimentary_used(uid uuid default auth.uid())
returns integer language sql stable security definer set search_path = business, public as $$
  select count(distinct r.webinar_id)::int from business.webinar_registrations r
  join business.webinars w on w.id = r.webinar_id
  where r.user_id = uid and r.attended_at is not null and w.access = 'standard' and w.status <> 'canceled';
$$;

-- Can this member attend this webinar?
create or replace function business.may_attend(webinar uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = business, public as $$
  select coalesce((
    select case
      when w.status not in ('approved', 'completed') then false
      when w.host_id = uid then true
      when business.member_tier(uid) = 'premium' then w.access <> 'special_event'
      when business.member_tier(uid) = 'free' then w.access = 'standard' and (
             exists (select 1 from business.webinar_registrations r where r.webinar_id = w.id and r.user_id = uid and r.attended_at is not null)
             or business.complimentary_used(uid) < business.complimentary_allowance())
      else false end
    from business.webinars w where w.id = webinar), false);
$$;
grant execute on function business.can_host(), business.complimentary_allowance(), business.complimentary_used(uuid), business.may_attend(uuid, uuid) to authenticated;

-- The join link: only for eligible registrants, from 15 minutes before start
-- until the end. Joining records attendance (which is what counts toward the allowance).
create or replace function business.join_webinar(webinar uuid)
returns jsonb language plpgsql security definer set search_path = business, public as $$
declare
  w business.webinars;
  p business.webinar_private;
begin
  select * into w from business.webinars where id = webinar;
  if w.id is null or w.status <> 'approved' then raise exception 'This webinar is not available'; end if;
  if now() < w.starts_at - interval '15 minutes' then raise exception 'The room opens 15 minutes before the start time'; end if;
  if now() > w.starts_at + make_interval(mins => w.duration_minutes) then raise exception 'This webinar has ended'; end if;
  if w.host_id <> auth.uid() then
    if not exists (select 1 from business.webinar_registrations where webinar_id = webinar and user_id = auth.uid() and canceled_at is null) then
      raise exception 'Please register first';
    end if;
    if not business.may_attend(webinar) then
      raise exception 'You have used your complimentary webinars. Professional Society membership includes unlimited eligible webinars.';
    end if;
    update business.webinar_registrations set attended_at = coalesce(attended_at, now()) where webinar_id = webinar and user_id = auth.uid();
  end if;
  select * into p from business.webinar_private where webinar_id = webinar;
  if p.webinar_id is null then raise exception 'The host has not added the meeting link yet'; end if;
  return jsonb_build_object('join_url', p.join_url, 'passcode', p.passcode, 'provider', w.provider);
end;
$$;
grant execute on function business.join_webinar(uuid) to authenticated;

-- Hosts submit; only the owner and moderators approve, reject or request changes.
create or replace function business.guard_webinar()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare reviewer boolean := public.has_staff_role(array['owner','moderator']::public.staff_role[]);
begin
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'submitted') then raise exception 'New webinars start as drafts'; end if;
    if not business.can_host() and not reviewer then raise exception 'Hosting is available to Professional Society members'; end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    if new.status in ('approved', 'rejected', 'changes_requested') and not reviewer then
      raise exception 'Only the review team can approve webinars';
    end if;
    if new.status = 'approved' then new.reviewed_by := auth.uid(); new.reviewed_at := now(); end if;
  end if;
  -- Edits by the host after approval send the webinar back for review.
  if not reviewer and old.status = 'approved' and new.status = 'approved'
     and (new.title, new.description, new.starts_at, new.promo_image_path, new.host_bio) is distinct from (old.title, old.description, old.starts_at, old.promo_image_path, old.host_bio) then
    new.status := 'submitted';
  end if;
  if not reviewer and (new.is_featured is distinct from old.is_featured or new.price_cents is distinct from old.price_cents) then
    raise exception 'Only the owner can feature or price webinars';
  end if;
  return new;
end;
$$;
create trigger guard_webinar before insert or update on business.webinars for each row execute function business.guard_webinar();

-- Capacity.
create or replace function business.guard_registration()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare cap integer;
begin
  select capacity into cap from business.webinars where id = new.webinar_id;
  if cap is not null and (select count(*) from business.webinar_registrations where webinar_id = new.webinar_id and canceled_at is null) >= cap then
    raise exception 'This webinar is full';
  end if;
  return new;
end;
$$;
create trigger guard_registration before insert on business.webinar_registrations for each row execute function business.guard_registration();

-- Public catalogue and public webinar pages (approved webinars only; no private links).
create or replace function business.public_webinars(one uuid default null)
returns jsonb language sql stable security definer set search_path = business, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', w.id, 'title', w.title, 'description', w.description, 'topic', w.topic, 'industry', w.industry, 'audience', w.audience,
    'learning_objectives', w.learning_objectives, 'host_display_name', w.host_display_name, 'host_bio', w.host_bio, 'co_hosts', w.co_hosts,
    'starts_at', w.starts_at, 'time_zone', w.time_zone, 'duration_minutes', w.duration_minutes, 'access', w.access,
    'promo_image_path', w.promo_image_path, 'logo_path', w.logo_path, 'headshot_path', w.headshot_path, 'use_template', w.use_template,
    'is_featured', w.is_featured, 'provider', w.provider, 'status', w.status,
    'spots_left', case when w.capacity is null then null else w.capacity - (select count(*) from business.webinar_registrations r where r.webinar_id = w.id and r.canceled_at is null) end)
    order by w.is_featured desc, w.starts_at), '[]'::jsonb)
  from business.webinars w
  where w.status in ('approved', 'completed') and (one is null or w.id = one)
    and (one is not null or w.starts_at + make_interval(mins => w.duration_minutes) > now() - interval '30 days');
$$;
grant execute on function business.public_webinars(uuid) to anon, authenticated;

create or replace function business.record_webinar_visit(webinar uuid, src text default 'direct')
returns void language sql security definer set search_path = business, public as $$
  insert into business.webinar_visits (webinar_id, source)
  select webinar, coalesce(nullif(lower(regexp_replace(coalesce(src, ''), '[^a-zA-Z0-9_-]', '', 'g')), ''), 'direct')
  where exists (select 1 from business.webinars where id = webinar and status = 'approved');
$$;
grant execute on function business.record_webinar_visit(uuid, text) to anon, authenticated;

-- Host analytics: counts only, never attendee identities or contacts.
create or replace function business.webinar_analytics(webinar uuid)
returns jsonb language plpgsql stable security definer set search_path = business, public as $$
begin
  if not exists (select 1 from business.webinars where id = webinar and (host_id = auth.uid() or public.has_staff_role(array['owner','executive','moderator']::public.staff_role[]))) then
    raise exception 'Not permitted';
  end if;
  return jsonb_build_object(
    'registered', (select count(*) from business.webinar_registrations where webinar_id = webinar and canceled_at is null),
    'attended', (select count(*) from business.webinar_registrations where webinar_id = webinar and attended_at is not null),
    'rating', (select round(avg(feedback_rating)::numeric, 1) from business.webinar_registrations where webinar_id = webinar),
    'feedback', coalesce((select jsonb_agg(feedback_text) from business.webinar_registrations where webinar_id = webinar and feedback_text is not null), '[]'),
    'visits_by_source', coalesce((select jsonb_object_agg(source, n) from (select source, count(*) n from business.webinar_visits where webinar_id = webinar group by 1) s), '{}'),
    'registrations_by_source', coalesce((select jsonb_object_agg(coalesce(referral_source, 'direct'), n) from (select referral_source, count(*) n from business.webinar_registrations where webinar_id = webinar group by 1) s), '{}'));
end;
$$;
grant execute on function business.webinar_analytics(uuid) to authenticated;

-- Program-wide metrics for the Owner Portal (aggregates).
create or replace function business.knowledge_exchange_metrics()
returns jsonb language plpgsql stable security definer set search_path = business, public as $$
begin
  if not public.has_staff_role(array['owner','executive']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  return jsonb_build_object(
    'upcoming', (select count(*) from business.webinars where status = 'approved' and starts_at > now()),
    'completed', (select count(*) from business.webinars where status = 'completed' or (status = 'approved' and starts_at < now())),
    'pending_review', (select count(*) from business.webinars where status = 'submitted'),
    'registrations', (select count(*) from business.webinar_registrations where canceled_at is null),
    'attendance', (select count(*) from business.webinar_registrations where attended_at is not null),
    'free_members_at_allowance', (select count(*) from (select r.user_id from business.webinar_registrations r join business.webinars w on w.id = r.webinar_id
        where r.attended_at is not null and w.access = 'standard' group by r.user_id having count(distinct r.webinar_id) >= business.complimentary_allowance()) s),
    'host_interest', (select count(*) from business.webinar_host_interest),
    'visits_by_source', coalesce((select jsonb_object_agg(source, n) from (select source, count(*) n from business.webinar_visits group by 1) s), '{}'),
    'average_rating', (select round(avg(feedback_rating)::numeric, 1) from business.webinar_registrations));
end;
$$;
grant execute on function business.knowledge_exchange_metrics() to authenticated;

-- ─── Row-level security ────────────────────────────────────────────
alter table business.webinar_topics enable row level security;
alter table business.webinars enable row level security;
alter table business.webinar_private enable row level security;
alter table business.webinar_registrations enable row level security;
alter table business.webinar_questions enable row level security;
alter table business.webinar_visits enable row level security;
alter table business.webinar_host_interest enable row level security;

create policy "read" on business.webinar_topics for select using (true);
create policy "manage" on business.webinar_topics for all using (public.has_staff_role(array['owner','executive']::public.staff_role[])) with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));

create policy "members browse approved; hosts see their own; reviewers see all" on business.webinars for select
  using (host_id = auth.uid()
         or (status in ('approved', 'completed') and public.has_experience('business'))
         or public.has_staff_role(array['owner','executive','moderator']::public.staff_role[]));
create policy "hosts create" on business.webinars for insert with check (host_id = auth.uid());
create policy "hosts edit own" on business.webinars for update using (host_id = auth.uid() and status not in ('rejected')) with check (host_id = auth.uid());
create policy "reviewers manage" on business.webinars for update
  using (public.has_staff_role(array['owner','moderator']::public.staff_role[])) with check (public.has_staff_role(array['owner','moderator']::public.staff_role[]));

-- Only the host manages the join link; attendees receive it through join_webinar().
create policy "host only" on business.webinar_private for all
  using (exists (select 1 from business.webinars w where w.id = webinar_id and w.host_id = auth.uid()))
  with check (exists (select 1 from business.webinars w where w.id = webinar_id and w.host_id = auth.uid()));

create policy "own registrations" on business.webinar_registrations for select using (user_id = auth.uid());
create policy "register" on business.webinar_registrations for insert
  with check (user_id = auth.uid() and public.has_experience('business')
              and exists (select 1 from business.webinars w where w.id = webinar_id and w.status = 'approved' and w.starts_at > now() - interval '1 hour'));
create policy "update own" on business.webinar_registrations for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "ask" on business.webinar_questions for insert
  with check (user_id = auth.uid() and exists (select 1 from business.webinar_registrations r where r.webinar_id = webinar_questions.webinar_id and r.user_id = auth.uid() and r.canceled_at is null));
create policy "asker and host read" on business.webinar_questions for select
  using (user_id = auth.uid() or exists (select 1 from business.webinars w where w.id = webinar_id and w.host_id = auth.uid()));
create policy "host answers" on business.webinar_questions for update
  using (exists (select 1 from business.webinars w where w.id = webinar_id and w.host_id = auth.uid()));

create policy "own interest" on business.webinar_host_interest for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.has_experience('business'));
create policy "staff read interest" on business.webinar_host_interest for select using (public.has_staff_role(array['owner','executive']::public.staff_role[]));

-- Members can only record attendance through join_webinar(); they may change consent and feedback.
revoke all on business.webinar_registrations from authenticated;
grant select, insert on business.webinar_registrations to authenticated;
grant update (canceled_at, recording_consent, feedback_rating, feedback_text) on business.webinar_registrations to authenticated;
grant select on business.webinar_topics to anon;
grant select, insert, update, delete on business.webinar_topics, business.webinar_host_interest, business.webinar_private to authenticated;
grant select, insert, update on business.webinars, business.webinar_questions to authenticated;
revoke all on business.webinar_visits from anon, authenticated;
grant all on all tables in schema business to service_role;
grant usage, select on all sequences in schema business to service_role;
revoke truncate, references, trigger on all tables in schema business from anon, authenticated;

-- ─── Webinar media: images only, 5 MB, uploaded into the member's own folder ──
insert into storage.buckets (id, name, public) values ('webinar-media', 'webinar-media', true) on conflict (id) do nothing;
create policy "members upload own webinar media" on storage.objects for insert to authenticated
  with check (bucket_id = 'webinar-media' and (storage.foldername(name))[1] = auth.uid()::text and public.has_experience('business'));
create policy "members replace own webinar media" on storage.objects for update to authenticated
  using (bucket_id = 'webinar-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "members delete own webinar media" on storage.objects for delete to authenticated
  using (bucket_id = 'webinar-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─── Seed: topics and features (no webinars are created) ──────────
insert into business.webinar_topics (slug, name, sort_order) values
  ('business-growth', 'Business Growth', 10), ('finance', 'Finance & Business Development', 20), ('leadership', 'Leadership', 30),
  ('operations', 'Operations & Systems', 40), ('technology', 'Technology & Automation', 50), ('marketing', 'Marketing & Brand', 60),
  ('partnerships', 'Partnerships & Collaboration', 70), ('expansion', 'Expansion & Multi-State Growth', 80),
  ('succession', 'Succession & Exit Planning', 90), ('funding-readiness', 'Funding Readiness', 100), ('industry', 'Industry Insights', 110);

insert into business.features (key, name, description, guest, free, premium, status, sort_order) values
  ('knowledge_exchange', 'The Knowledge Exchange', 'Browse the webinar catalogue and attend live business webinars.', true, true, true, 'growing_community', 200),
  ('complimentary_webinars', 'Complimentary webinars', 'Free business members attend a set number of eligible webinars at no cost.', false, true, false, 'growing_community', 210),
  ('webinar_hosting', 'Host your own webinar', 'Professional Society members host webinars and share their expertise nationwide.', false, false, true, 'coming_soon', 220),
  ('webinar_recordings', 'Webinar recordings & resources', 'Replays (with consent) and downloadable resources.', false, false, true, 'future_development', 230),
  ('host_interest', 'Register your interest in hosting', 'Tell us what you would like to teach before hosting opens.', false, true, true, 'available_now', 240)
on conflict (key) do nothing;
