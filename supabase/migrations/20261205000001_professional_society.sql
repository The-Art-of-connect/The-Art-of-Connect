-- ════════════════════════════════════════════════════════════════════
-- The Professional Society — In Business
-- Founding Member Community, free business accounts, the Business
-- Connection Board and the private business inbox.
--
-- A business-to-business community where owners help owners. Not a
-- lead-generation service, advertising marketplace or directory.
--
-- Access levels (configurable per feature by the owner):
--   guest    public visitors, no account
--   free     registered business owner (40+), no payment
--   premium  Professional Society membership ($29.99, enabled at launch)
-- Feature status: available_now · growing_community · coming_soon ·
--   future_development · temporarily_unavailable
--
-- Privacy: financial details are private to the member. Conversations are
-- visible only to the two participants; exceptional safety access is
-- owner-only, tied to a report, and recorded.
-- ════════════════════════════════════════════════════════════════════

-- Free business accounts get In Business access without a subscription.
alter table public.experience_access drop constraint if exists experience_access_source_check;
alter table public.experience_access add constraint experience_access_source_check
  check (source in ('subscription', 'owner_grant', 'referral', 'comp', 'couples_upgrade', 'free_tier'));

-- ─── Reference data (owner-managed) ────────────────────────────────
create table business.industries (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (length(name) between 1 and 80),
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table business.categories (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (length(name) between 1 and 80),
  description text not null default '' check (length(description) <= 300),
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table business.features (
  key text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  name text not null,
  description text not null default '',
  guest boolean not null default false,
  free boolean not null default false,
  premium boolean not null default true,
  status text not null default 'coming_soon' check (status in ('available_now', 'growing_community', 'coming_soon', 'future_development', 'temporarily_unavailable')),
  scheduled_status text check (scheduled_status in ('available_now', 'growing_community', 'coming_soon', 'future_development', 'temporarily_unavailable')),
  scheduled_at timestamptz,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create trigger touch_business_features before update on business.features for each row execute function public.touch_updated_at();

create table business.readiness_items (
  key text primary key check (key ~ '^[a-z0-9_-]{2,60}$'),
  title text not null,
  description text not null default '',
  area text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table business.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 160),
  summary text not null default '' check (length(summary) <= 600),
  url text check (url ~ '^https://'),
  body text check (length(body) <= 20000),
  topics text[] not null default '{}',
  tier text not null default 'free' check (tier in ('guest', 'free', 'premium')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_business_resources before update on business.resources for each row execute function public.touch_updated_at();

-- ─── Member business profile ("Let's Talk About Your Business") ────
alter table business.profiles
  add column display_name text check (length(display_name) <= 120),
  add column business_structure text check (business_structure in ('sole_proprietorship', 'llc', 'partnership', 's_corp', 'c_corp', 'nonprofit', 'other', 'not_yet_formed')),
  add column years_in_business text check (years_in_business in ('preparing', 'under_3', '3_to_10', 'over_10')),
  add column offerings text check (length(offerings) <= 2000),
  add column leadership_role text check (length(leadership_role) <= 160),
  add column challenges text check (length(challenges) <= 2000),
  add column goals_short text check (length(goals_short) <= 2000),
  add column goals_long text check (length(goals_long) <= 2000),
  add column expertise text[] not null default '{}',
  add column relationships_desired text[] not null default '{}',
  add column mentorship text not null default 'none' check (mentorship in ('none', 'seeking', 'offering', 'both')),
  add column future_interests text[] not null default '{}',
  add column help_needed text[] not null default '{}',
  add column help_offered text[] not null default '{}',
  add column city text check (length(city) <= 80),
  add column state text check (state ~ '^[A-Z]{2}$'),
  add column connection_scope text not null default 'national' check (connection_scope in ('local', 'state', 'national')),
  add column accept_requests_from text not null default 'members' check (accept_requests_from in ('members', 'same_state', 'nobody')),
  add column public_profile_consent boolean not null default false,
  add column public_profile_consented_at timestamptz,
  add column onboarding_completed_at timestamptz;

-- Optional financial details: private to the member unless they choose to share.
create table business.private_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  annual_revenue_range text check (annual_revenue_range in ('pre_revenue', 'under_250k', '250k_1m', '1m_5m', '5m_25m', 'over_25m', 'prefer_not')),
  employee_range text check (employee_range in ('solo', '2_10', '11_50', '51_200', 'over_200', 'prefer_not')),
  funding_status text check (length(funding_status) <= 300),
  share_with_connections boolean not null default false,
  updated_at timestamptz not null default now()
);

create table business.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  horizon text not null default 'short' check (horizon in ('short', 'long')),
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  status text not null default 'active' check (status in ('active', 'achieved', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_business_goals before update on business.goals for each row execute function public.touch_updated_at();

create table business.readiness_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_key text not null references business.readiness_items (key) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

create table business.feature_interest (
  user_id uuid not null references public.profiles (id) on delete cascade,
  feature_key text not null references business.features (key) on delete cascade,
  notify boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, feature_key)
);

-- ─── Business Connection Board ─────────────────────────────────────
create table business.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  intent text not null check (intent in ('seeking_assistance', 'offering_assistance', 'open_to_collaboration')),
  category text not null references business.categories (slug),
  title text not null check (length(title) between 3 and 120),
  description text not null check (length(description) between 10 and 3000),
  industry text references business.industries (slug),
  city text check (length(city) <= 80),
  state text check (state ~ '^[A-Z]{2}$'),
  scope text not null default 'national' check (scope in ('local', 'state', 'national')),
  stage text check (stage in ('idea', 'early', 'growth', 'established', 'enterprise')),
  expertise text[] not null default '{}' check (cardinality(expertise) <= 12),
  status text not null default 'open' check (status in ('open', 'connection_established', 'assistance_received', 'completed', 'closed', 'archived', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index business_posts_board_idx on business.posts (status, created_at desc);
create index business_posts_geo_idx on business.posts (state, city);
create trigger touch_business_posts before update on business.posts for each row execute function public.touch_updated_at();

create table business.saved_posts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references business.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ─── Private business inbox ────────────────────────────────────────
create table business.conversations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references business.posts (id) on delete set null,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'closed', 'blocked')),
  outcome text check (outcome in ('connection_established', 'assistance_received', 'completed')),
  requester_saved boolean not null default false,
  recipient_saved boolean not null default false,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  last_message_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create index business_conversations_party_idx on business.conversations (requester_id, recipient_id, last_message_at desc);
create unique index business_one_open_request on business.conversations (requester_id, recipient_id, coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status in ('requested', 'accepted');

create table business.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references business.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index business_messages_conv_idx on business.messages (conversation_id, created_at);

create table business.acknowledgements (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references business.conversations (id) on delete set null,
  note text check (length(note) <= 600),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  check (from_user <> to_user),
  unique (from_user, conversation_id)
);

create table business.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  post_id uuid references business.posts (id) on delete set null,
  conversation_id uuid references business.conversations (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('spam', 'solicitation', 'fraud', 'harassment', 'impersonation', 'inappropriate', 'other')),
  details text check (length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Exceptional, owner-only access to a reported conversation (recorded).
create table business.safety_access_log (
  id bigint generated always as identity primary key,
  conversation_id uuid not null,
  report_id uuid not null,
  accessed_by uuid not null,
  reason text not null,
  accessed_at timestamptz not null default now()
);

-- ─── Helpers ───────────────────────────────────────────────────────
create or replace function business.feature_status(feature text)
returns text language sql stable security definer set search_path = business, public as $$
  select case when f.scheduled_at is not null and f.scheduled_at <= now() and f.scheduled_status is not null then f.scheduled_status else f.status end
  from business.features f where f.key = feature;
$$;

-- 'premium' with a paid/comp membership, 'free' with a free business account, else 'guest'.
create or replace function business.member_tier(uid uuid default auth.uid())
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.experience_access a where a.user_id = uid and a.experience = 'business' and a.status = 'active'
                   and a.source <> 'free_tier' and (a.expires_at is null or a.expires_at > now())) then 'premium'
    when exists (select 1 from public.experience_access a where a.user_id = uid and a.experience = 'business' and a.status = 'active'
                   and a.source = 'free_tier') then 'free'
    else 'guest' end;
$$;

-- A feature is usable when it is operational and included at the member's level.
create or replace function business.can_use(feature text)
returns boolean language sql stable security definer set search_path = business, public as $$
  select coalesce((
    select business.feature_status(f.key) in ('available_now', 'growing_community')
       and public.has_experience('business')
       and case business.member_tier() when 'premium' then f.premium when 'free' then f.free else false end
    from business.features f where f.key = feature), false);
$$;
grant execute on function business.feature_status(text), business.member_tier(uuid), business.can_use(text) to authenticated;

-- Who may contact whom.
create or replace function business.accepts_requests(recipient uuid, sender uuid)
returns boolean language sql stable security definer set search_path = business, public as $$
  select coalesce((
    select case p.accept_requests_from
             when 'nobody' then false
             when 'same_state' then p.state is not null and p.state = (select state from business.profiles where user_id = sender)
             else true end
    from business.profiles p where p.user_id = recipient), false)
    and not public.is_blocked_between(recipient, sender)
    and exists (select 1 from public.profiles where id = recipient and status = 'active');
$$;

-- Anti-spam: daily caps on posts and new message requests.
create or replace function business.cap_activity()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare n integer;
begin
  if tg_table_name = 'posts' then
    select count(*) into n from business.posts where author_id = new.author_id and created_at > now() - interval '1 day';
    if n >= public.setting_int('max_daily_business_posts', 5) then raise exception 'Daily post limit reached. Please try again tomorrow.'; end if;
  else
    select count(*) into n from business.conversations where requester_id = new.requester_id and created_at > now() - interval '1 day';
    if n >= public.setting_int('max_daily_connection_requests', 20) then raise exception 'Daily connection request limit reached'; end if;
  end if;
  return new;
end;
$$;
grant execute on function business.accepts_requests(uuid, uuid) to authenticated;

create trigger cap_business_posts before insert on business.posts for each row execute function business.cap_activity();
create trigger cap_business_requests before insert on business.conversations for each row execute function business.cap_activity();

-- Messages: the requester may send one introduction while a request is pending;
-- after acceptance both may write. Nobody can write to a declined, closed or blocked conversation.
create or replace function business.guard_message()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare c business.conversations;
begin
  select * into c from business.conversations where id = new.conversation_id;
  if c.id is null or new.sender_id not in (c.requester_id, c.recipient_id) then raise exception 'Not part of this conversation'; end if;
  if c.status = 'requested' then
    if new.sender_id <> c.requester_id or exists (select 1 from business.messages where conversation_id = c.id) then
      raise exception 'Waiting for the other member to accept your request';
    end if;
  elsif c.status <> 'accepted' then
    raise exception 'This conversation is closed';
  end if;
  if public.is_blocked_between(c.requester_id, c.recipient_id) then raise exception 'This conversation is closed'; end if;
  -- Light spam guard: no more than three links per message.
  if (select count(*) from regexp_matches(new.body, 'https?://', 'g')) > 3 then raise exception 'Too many links in one message'; end if;
  new.read_at := null;
  update business.conversations set last_message_at = now() where id = c.id;
  return new;
end;
$$;
create trigger guard_business_message before insert on business.messages for each row execute function business.guard_message();

-- Conversation updates: only the recipient accepts or declines; either party may close, save or record an outcome.
create or replace function business.guard_conversation()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if new.requester_id <> old.requester_id or new.recipient_id <> old.recipient_id or new.post_id is distinct from old.post_id then
    raise exception 'Conversation participants cannot change';
  end if;
  if new.status is distinct from old.status then
    if new.status in ('accepted', 'declined') and (old.status <> 'requested' or auth.uid() <> old.recipient_id) then
      raise exception 'Only the recipient can accept or decline a request';
    end if;
    if old.status in ('declined', 'blocked') then raise exception 'This conversation is closed'; end if;
    new.responded_at := coalesce(new.responded_at, now());
  end if;
  -- Each participant controls only their own "saved" flag.
  if auth.uid() = old.requester_id and new.recipient_saved is distinct from old.recipient_saved then raise exception 'Not permitted'; end if;
  if auth.uid() = old.recipient_id and new.requester_saved is distinct from old.requester_saved then raise exception 'Not permitted'; end if;
  return new;
end;
$$;
create trigger guard_business_conversation before update on business.conversations for each row execute function business.guard_conversation();

-- Blocking someone closes business conversations with them.
create or replace function business.close_on_block()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  update business.conversations set status = 'blocked'
   where (requester_id = new.blocker_id and recipient_id = new.blocked_id) or (requester_id = new.blocked_id and recipient_id = new.blocker_id);
  return new;
end;
$$;
create trigger close_business_on_block after insert on public.blocks for each row execute function business.close_on_block();

-- Marks messages the member received in a conversation as read.
create or replace function business.mark_read(conversation uuid)
returns integer language plpgsql security definer set search_path = business, public as $$
declare n integer;
begin
  update business.messages m set read_at = now()
   from business.conversations c
   where m.conversation_id = conversation and c.id = m.conversation_id and m.read_at is null
     and m.sender_id <> auth.uid() and auth.uid() in (c.requester_id, c.recipient_id);
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function business.mark_read(uuid) to authenticated;

-- Owner-only, report-linked, recorded access to a conversation for a safety investigation.
create or replace function business.investigate_conversation(conversation uuid, report uuid, reason text)
returns table (sender text, body text, sent_at timestamptz) language plpgsql security definer set search_path = business, public as $$
begin
  if not public.is_owner() then raise exception 'Only the owner can open a reported conversation'; end if;
  if coalesce(length(btrim(reason)), 0) < 10 then raise exception 'Record the reason for this access'; end if;
  if not exists (select 1 from business.reports r where r.id = report and r.conversation_id = conversation and r.status in ('open', 'reviewing')) then
    raise exception 'Access requires an open report about this conversation';
  end if;
  insert into business.safety_access_log (conversation_id, report_id, accessed_by, reason) values (conversation, report, auth.uid(), reason);
  insert into public.audit_log (actor_id, action, target_table, target_id, details)
    values (auth.uid(), 'business.safety_access', 'business.conversations', conversation::text, jsonb_build_object('report', report));
  return query
    select case when m.sender_id = c.requester_id then 'Requester' else 'Recipient' end, m.body, m.created_at
    from business.messages m join business.conversations c on c.id = m.conversation_id
    where m.conversation_id = conversation order by m.created_at;
end;
$$;
grant execute on function business.investigate_conversation(uuid, uuid, text) to authenticated;

-- Community metrics for the Owner Portal: aggregates only — no names, messages or financial details.
create or replace function business.community_metrics()
returns jsonb language plpgsql stable security definer set search_path = business, public as $$
begin
  if not public.has_staff_role(array['owner','executive']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  return jsonb_build_object(
    'business_owners', (select count(*) from business.profiles where onboarding_completed_at is not null),
    'free_accounts', (select count(*) from public.experience_access where experience = 'business' and source = 'free_tier' and status = 'active'),
    'premium_members', (select count(*) from public.experience_access where experience = 'business' and source <> 'free_tier' and status = 'active'),
    'public_profiles', (select count(*) from business.profiles where public_profile_consent),
    'industries', coalesce((select jsonb_object_agg(industry, n) from (select coalesce(industry, 'unspecified') industry, count(*) n from business.profiles group by 1) s), '{}'),
    'states', coalesce((select jsonb_object_agg(state, n) from (select coalesce(state, '—') state, count(*) n from business.profiles group by 1) s), '{}'),
    'help_needed', coalesce((select jsonb_object_agg(x, n) from (select unnest(help_needed) x, count(*) n from business.profiles group by 1) s), '{}'),
    'help_offered', coalesce((select jsonb_object_agg(x, n) from (select unnest(help_offered) x, count(*) n from business.profiles group by 1) s), '{}'),
    'mentors_available', (select count(*) from business.profiles where mentorship in ('offering', 'both')),
    'mentorship_seekers', (select count(*) from business.profiles where mentorship in ('seeking', 'both')),
    'complementary_pairs', (select count(*) from business.profiles a join business.profiles b on a.user_id <> b.user_id and a.help_needed && b.help_offered),
    'posts_by_category', coalesce((select jsonb_object_agg(category, n) from (select category, count(*) n from business.posts where status <> 'removed' group by 1) s), '{}'),
    'open_posts', (select count(*) from business.posts where status = 'open'),
    'requests', (select count(*) from business.conversations),
    'accepted', (select count(*) from business.conversations where status = 'accepted'),
    'successful_connections', (select count(*) from business.conversations where outcome is not null),
    'acknowledgements', (select count(*) from business.acknowledgements),
    'feature_interest', coalesce((select jsonb_object_agg(feature_key, n) from (select feature_key, count(*) n from business.feature_interest group by 1) s), '{}'),
    'open_reports', (select count(*) from business.reports where status in ('open', 'reviewing'))
  );
end;
$$;
grant execute on function business.community_metrics() to authenticated;

-- Public explore data: reference lists, feature statuses and only consented profiles.
create or replace function business.public_explore()
returns jsonb language sql stable security definer set search_path = business, public as $$
  select jsonb_build_object(
    'industries', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name) order by sort_order) from business.industries where is_active), '[]'),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'description', description) order by sort_order) from business.categories where is_active), '[]'),
    'features', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'name', name, 'description', description, 'guest', guest, 'free', free, 'premium', premium, 'status', business.feature_status(key)) order by sort_order) from business.features), '[]'),
    'profiles', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(p.display_name, p.company), 'industry', p.industry, 'city', p.city, 'state', p.state,
                                  'headline', p.headline, 'help_offered', p.help_offered, 'mentorship', p.mentorship in ('offering','both')) order by p.updated_at desc)
                        from business.profiles p join public.profiles u on u.id = p.user_id
                        where p.public_profile_consent and u.status = 'active'), '[]'),
    'resources', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'summary', summary, 'url', url) order by created_at desc) from business.resources where status = 'published' and tier = 'guest'), '[]')
  );
$$;
grant execute on function business.public_explore() to anon, authenticated;

-- Record when a business owner gives (or withdraws) consent for a public profile.
create or replace function business.stamp_consent()
returns trigger language plpgsql as $$
begin
  if new.public_profile_consent and (tg_op = 'INSERT' or not old.public_profile_consent) then new.public_profile_consented_at := now(); end if;
  if not new.public_profile_consent then new.public_profile_consented_at := null; end if;
  return new;
end;
$$;
create trigger stamp_business_consent before insert or update on business.profiles for each row execute function business.stamp_consent();

-- ─── Row-level security ────────────────────────────────────────────
alter table business.industries enable row level security;
alter table business.categories enable row level security;
alter table business.features enable row level security;
alter table business.readiness_items enable row level security;
alter table business.resources enable row level security;
alter table business.private_details enable row level security;
alter table business.goals enable row level security;
alter table business.readiness_progress enable row level security;
alter table business.feature_interest enable row level security;
alter table business.posts enable row level security;
alter table business.saved_posts enable row level security;
alter table business.conversations enable row level security;
alter table business.messages enable row level security;
alter table business.acknowledgements enable row level security;
alter table business.reports enable row level security;
alter table business.safety_access_log enable row level security;

-- Reference data: readable by signed-in users; managed by owner & executives.
create policy "read" on business.industries for select using (true);
create policy "manage" on business.industries for all using (public.has_staff_role(array['owner','executive']::public.staff_role[])) with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));
create policy "read" on business.categories for select using (true);
create policy "manage" on business.categories for all using (public.has_staff_role(array['owner','executive']::public.staff_role[])) with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));
create policy "read" on business.features for select using (true);
create policy "owner manages" on business.features for all using (public.is_owner()) with check (public.is_owner());
create policy "read" on business.readiness_items for select using (true);
create policy "manage" on business.readiness_items for all using (public.has_staff_role(array['owner','executive']::public.staff_role[])) with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));
create policy "members read published" on business.resources for select
  using ((status = 'published' and (tier in ('guest','free') and public.has_experience('business') or (tier = 'premium' and business.member_tier() = 'premium')))
         or public.has_staff_role(array['owner','executive']::public.staff_role[]));
create policy "manage" on business.resources for all using (public.has_staff_role(array['owner','executive']::public.staff_role[])) with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));

-- Private to the member (not staff, not the owner).
create policy "own only" on business.private_details for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.has_experience('business'));
create policy "own only" on business.goals for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.has_experience('business'));
create policy "own only" on business.readiness_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.has_experience('business'));
create policy "own only" on business.feature_interest for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own only" on business.saved_posts for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.has_experience('business'));

-- Board: members read open posts (not from people they've blocked); authors manage their own.
create policy "members read board" on business.posts for select
  using (author_id = auth.uid()
         or (status in ('open', 'connection_established', 'assistance_received', 'completed') and business.can_use('connection_board')
             and not public.is_blocked_between(auth.uid(), author_id))
         or public.has_staff_role(array['owner','executive','moderator']::public.staff_role[]));
create policy "author posts" on business.posts for insert with check (author_id = auth.uid() and business.can_use('connection_board') and status = 'open');
create policy "author edits" on business.posts for update using (author_id = auth.uid() and status <> 'removed') with check (author_id = auth.uid() and status <> 'removed');
create policy "moderators remove" on business.posts for update
  using (public.has_staff_role(array['owner','moderator']::public.staff_role[])) with check (public.has_staff_role(array['owner','moderator']::public.staff_role[]));

-- Inbox: participants only. Staff have no general access to conversations or messages.
create policy "participants" on business.conversations for select using (auth.uid() in (requester_id, recipient_id));
create policy "request" on business.conversations for insert
  with check (requester_id = auth.uid() and status = 'requested' and business.can_use('private_inbox')
              and business.accepts_requests(recipient_id, requester_id));
create policy "participants update" on business.conversations for update using (auth.uid() in (requester_id, recipient_id)) with check (auth.uid() in (requester_id, recipient_id));
create policy "participants read" on business.messages for select
  using (exists (select 1 from business.conversations c where c.id = conversation_id and auth.uid() in (c.requester_id, c.recipient_id)));
create policy "participants write" on business.messages for insert
  with check (sender_id = auth.uid() and exists (select 1 from business.conversations c where c.id = conversation_id and auth.uid() in (c.requester_id, c.recipient_id)));

create policy "read" on business.acknowledgements for select using (auth.uid() in (from_user, to_user) or is_public);
create policy "give" on business.acknowledgements for insert
  with check (from_user = auth.uid() and (conversation_id is null or exists (select 1 from business.conversations c where c.id = conversation_id and auth.uid() in (c.requester_id, c.recipient_id) and to_user in (c.requester_id, c.recipient_id))));

create policy "file" on business.reports for insert with check (reporter_id = auth.uid());
create policy "read" on business.reports for select using (reporter_id = auth.uid() or public.has_staff_role(array['owner','moderator']::public.staff_role[]));
create policy "resolve" on business.reports for update using (public.has_staff_role(array['owner','moderator']::public.staff_role[])) with check (public.has_staff_role(array['owner','moderator']::public.staff_role[]));
create policy "owner reads" on business.safety_access_log for select using (public.is_owner());

-- Business profiles: staff no longer see every profile; owner & moderators for safety only.
drop policy if exists "members see visible profiles" on business.profiles;
create policy "members see visible profiles" on business.profiles for select
  using (user_id = auth.uid()
         or (is_visible and public.has_experience('business') and not public.is_blocked_between(auth.uid(), user_id))
         or public.has_staff_role(array['owner','moderator']::public.staff_role[]));

-- Explicit grants (automatic API access is disabled).
revoke all on business.private_details, business.safety_access_log from anon;
grant select on business.industries, business.categories, business.features, business.readiness_items to anon;
grant select, insert, update, delete on business.industries, business.categories, business.features, business.readiness_items, business.resources,
  business.private_details, business.goals, business.readiness_progress, business.feature_interest, business.saved_posts, business.posts to authenticated;
grant select, insert, update on business.conversations to authenticated;
grant select, insert on business.messages, business.acknowledgements, business.reports to authenticated;
grant update (status, resolved_by, resolved_at) on business.reports to authenticated;
grant select on business.safety_access_log to authenticated;
grant all on all tables in schema business to service_role;
grant usage, select on all sequences in schema business to service_role;
revoke truncate, references, trigger on all tables in schema business from anon, authenticated;
