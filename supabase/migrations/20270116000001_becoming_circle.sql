-- The Becoming Circle, phase one (founder directive 19, November 26, 2026): complimentary open discussions with a new
-- featured topic every four hours, written participation, polls, topic suggestions, human moderation with an audit
-- history, reports, and The Art of Connect Safety Shield. Live audio, speaking turns and purchases are phase two.
-- An intentional exception to the paid-only social rule (directive 14): every active account may take part here.

-- ─── Safety Shield: personal-information detection (defence in depth; the server also screens first) ─────────
create or replace function public.shield_findings(t text)
returns text[] language sql immutable set search_path = public as $$
  select array_remove(array[
    case when t ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then 'email' end,
    case when t ~ '(\+?1[\s.-]?)?\(?\y\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\y' then 'phone' end,
    case when t ~ '\y\d{3}-\d{2}-\d{4}\y' then 'ssn' end,
    case when t ~ '\y(?:\d[ -]?){13,19}\y' then 'card' end,
    case when t ~* '(routing|account|acct)\s*(number|no\.?|#)?\s*[:#]?\s*\d{6,}' then 'bank' end,
    case when t ~* '\y(password|passcode|pin|login)\s*(is|:|=)\s*\S+' then 'credentials' end
  ], null);
$$;
grant execute on function public.shield_findings(text) to authenticated, service_role;

create or replace function public.shield_guard()
returns trigger language plpgsql set search_path = public as $$
declare f text[]; txt text;
begin
  txt := coalesce(to_jsonb(new) ->> 'body', '') || ' ' || coalesce(to_jsonb(new) ->> 'title', '') || ' ' || coalesce(to_jsonb(new) ->> 'note', '')
      || ' ' || coalesce(to_jsonb(new) ->> 'headline', '') || ' ' || coalesce(to_jsonb(new) ->> 'bio', '');
  f := public.shield_findings(txt);
  if cardinality(f) > 0 then
    raise exception 'SAFETY_SHIELD:%', array_to_string(f, ',') using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Apply the Shield to member-written content across the social ecosystem as well.
create trigger shield_social_posts before insert or update of body on public.social_posts for each row execute function public.shield_guard();
create trigger shield_social_comments before insert or update of body on public.social_comments for each row execute function public.shield_guard();
create trigger shield_social_messages before insert or update of body on public.social_messages for each row execute function public.shield_guard();
create trigger shield_social_profiles before insert or update of headline, bio on public.social_profiles for each row execute function public.shield_guard();

-- ─── Moderators: staff moderators plus trained, owner-authorized members ─────────────────────────
create table public.circle_moderators (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'authorized' check (status in ('authorized', 'suspended', 'revoked')),
  training_completed_at timestamptz,
  authorized_by uuid references public.profiles (id),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace function public.circle_is_moderator(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_roles s where s.user_id = p and s.role in ('owner', 'admin', 'moderator'))
      or exists (select 1 from public.circle_moderators m where m.user_id = p and m.status = 'authorized' and m.training_completed_at is not null);
$$;
grant execute on function public.circle_is_moderator(uuid) to authenticated, service_role;

-- ─── Topics: one featured complimentary topic per four-hour slot ───────────────────────────────
create table public.circle_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 160),
  prompt text not null check (char_length(prompt) between 10 and 1500),
  category text not null check (category in ('everyday-life', 'relationships-marriage', 'friendships', 'parenting', 'family', 'personal-development',
    'business', 'career', 'financial-mindset', 'retirement', 'travel-lifestyle', 'current-events', 'world-perspectives', 'culture-society',
    'communication-ei', 'goals-ambitions')),
  room text not null default 'becoming' check (room in ('becoming', 'lounge')),
  slot_start timestamptz check (slot_start is null or (extract(epoch from slot_start)::bigint % 14400 = 0)),
  status text not null default 'draft' check (status in ('draft', 'approved', 'scheduled', 'declined', 'archived')),
  source text not null default 'owner' check (source in ('owner', 'peace', 'member')),
  suggested_by uuid references public.profiles (id) on delete set null,
  mode text not null default 'text' check (mode in ('text', 'audio')),
  paused boolean not null default false,
  closed_at timestamptz,
  open_hours integer not null default 24 check (open_hours between 4 and 168),
  moderator_id uuid references public.profiles (id),
  backup_moderator_id uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index circle_one_topic_per_slot on public.circle_topics (slot_start) where room = 'becoming' and status = 'scheduled';
create trigger touch_circle_topics before update on public.circle_topics for each row execute function public.touch_updated_at();

-- Whether a topic is accepting written participation right now.
create or replace function public.circle_topic_open(t public.circle_topics)
returns boolean language sql stable set search_path = public as $$
  select t.status = 'scheduled' and t.slot_start <= now() and now() < t.slot_start + make_interval(hours => t.open_hours)
     and t.closed_at is null and not t.paused;
$$;

-- Fills the coming slots (next 48 hours) from the owner-approved pool, so routine rotation needs no manual work.
create or replace function public.circle_fill_slots()
returns integer language plpgsql security definer set search_path = public as $$
declare s timestamptz; n integer := 0; pick uuid;
begin
  s := to_timestamp(floor(extract(epoch from now()) / 14400) * 14400);
  while s < now() + interval '48 hours' loop
    if not exists (select 1 from public.circle_topics where room = 'becoming' and status = 'scheduled' and slot_start = s) then
      select id into pick from public.circle_topics
        where room = 'becoming' and status = 'approved' and slot_start is null
        order by (select count(*) from public.circle_topics x where x.status = 'scheduled' and x.category = circle_topics.category and x.slot_start > now() - interval '24 hours'), created_at
        limit 1 for update skip locked;
      exit when pick is null;
      update public.circle_topics set status = 'scheduled', slot_start = s where id = pick;
      n := n + 1;
    end if;
    s := s + interval '4 hours';
  end loop;
  return n;
end $$;
revoke all on function public.circle_fill_slots() from public, anon, authenticated;
grant execute on function public.circle_fill_slots() to service_role;

-- Only the owner approves featured topics (members' suggestions become drafts first).
create or replace function public.guard_circle_topic()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_owner() and new.status in ('approved', 'scheduled')
     and (tg_op = 'INSERT' or old.status not in ('approved', 'scheduled')) then
    raise exception 'Only the owner approves featured topics';
  end if;
  if new.status in ('approved', 'scheduled') and (tg_op = 'INSERT' or old.status not in ('approved', 'scheduled')) then
    new.approved_by := coalesce(auth.uid(), new.approved_by); new.approved_at := now();
  end if;
  return new;
end $$;
create trigger guard_circle_topic before insert or update on public.circle_topics for each row execute function public.guard_circle_topic();

-- ─── Participation ───────────────────────────────────────────────────────────────────────────
create table public.circle_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.circle_topics (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'perspective' check (kind in ('perspective', 'question', 'comment')),
  body text not null check (char_length(body) between 2 and 1500),
  reply_to uuid references public.circle_posts (id) on delete set null,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  highlighted boolean not null default false,
  created_at timestamptz not null default now()
);
create index circle_posts_topic on public.circle_posts (topic_id, created_at);
create trigger shield_circle_posts before insert or update of body on public.circle_posts for each row execute function public.shield_guard();

create table public.circle_bans (
  topic_id uuid not null references public.circle_topics (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  by_id uuid references public.profiles (id),
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  primary key (topic_id, user_id)
);

-- Fair pace: a short pause between posts and an hourly ceiling.
create or replace function public.circle_post_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare t public.circle_topics;
begin
  select * into t from public.circle_topics where id = new.topic_id;
  if t.id is null or not public.circle_topic_open(t) then raise exception 'This discussion is not open for comments right now.'; end if;
  if t.room <> 'becoming' and not public.has_paid_membership(new.author_id) then raise exception 'This lounge is part of paid memberships.'; end if;
  if exists (select 1 from public.circle_bans where topic_id = new.topic_id and user_id = new.author_id) then raise exception 'A moderator has removed you from this discussion.'; end if;
  if not exists (select 1 from public.profiles where id = new.author_id and status = 'active') then raise exception 'Your account is not active.'; end if;
  if exists (select 1 from public.circle_posts where author_id = new.author_id and created_at > now() - interval '20 seconds') then raise exception 'Please wait a moment before posting again.'; end if;
  if (select count(*) from public.circle_posts where author_id = new.author_id and created_at > now() - interval '1 hour') >= 30 then raise exception 'You have reached the hourly limit. Thank you for sharing so much.'; end if;
  new.status := 'visible'; new.highlighted := false;
  return new;
end $$;
create trigger circle_post_guard before insert on public.circle_posts for each row execute function public.circle_post_guard();

create table public.circle_polls (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.circle_topics (id) on delete cascade,
  question text not null check (char_length(question) between 3 and 300),
  options text[] not null check (cardinality(options) between 2 and 6),
  created_by uuid references public.profiles (id),
  closed boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.circle_poll_votes (
  poll_id uuid not null references public.circle_polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_index integer not null check (option_index between 0 and 5),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
-- Counts only: who voted for what is never shown.
create or replace function public.circle_poll_results(p_poll uuid)
returns table (option_index integer, votes bigint) language sql stable security definer set search_path = public as $$
  select v.option_index, count(*) from public.circle_poll_votes v where v.poll_id = p_poll group by v.option_index;
$$;
grant execute on function public.circle_poll_results(uuid) to authenticated;

create table public.circle_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 5 and 160),
  category text not null,
  note text check (char_length(note) <= 1000),
  status text not null default 'new' check (status in ('new', 'accepted', 'declined')),
  reviewer_note text check (char_length(reviewer_note) <= 500),
  created_at timestamptz not null default now()
);
create trigger shield_circle_suggestions before insert on public.circle_suggestions for each row execute function public.shield_guard();
create or replace function public.circle_suggestion_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.circle_suggestions where user_id = new.user_id and created_at > now() - interval '1 day') >= 3 then
    raise exception 'You can suggest up to three topics a day.';
  end if;
  new.status := 'new'; new.reviewer_note := null;
  return new;
end $$;
create trigger circle_suggestion_limit before insert on public.circle_suggestions for each row execute function public.circle_suggestion_limit();

create table public.circle_reports (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.circle_topics (id) on delete cascade,
  post_id uuid references public.circle_posts (id) on delete set null,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('harassment', 'threat', 'discrimination', 'personal-information', 'fraud', 'misinformation', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Moderator presence (heartbeat from the moderator console) and the audit history of every moderator action.
create table public.circle_presence (
  topic_id uuid not null references public.circle_topics (id) on delete cascade,
  moderator_id uuid not null references public.profiles (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (topic_id, moderator_id)
);
create table public.circle_mod_log (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.circle_topics (id) on delete set null,
  actor_id uuid references public.profiles (id),
  action text not null,
  target_user uuid references public.profiles (id) on delete set null,
  target_post uuid references public.circle_posts (id) on delete set null,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create or replace function public.circle_moderator_present(p_topic uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_presence where topic_id = p_topic and seen_at > now() - interval '2 minutes'
                 and public.circle_is_moderator(moderator_id));
$$;
grant execute on function public.circle_moderator_present(uuid) to authenticated;

create or replace function public.circle_heartbeat(p_topic uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.circle_is_moderator(auth.uid()) then return false; end if;
  insert into public.circle_presence (topic_id, moderator_id) values (p_topic, auth.uid())
    on conflict (topic_id, moderator_id) do update set seen_at = now();
  return true;
end $$;
grant execute on function public.circle_heartbeat(uuid) to authenticated;

-- Every moderator action goes through here and is recorded.
create or replace function public.circle_moderate(p_action text, p_topic uuid, p_post uuid default null, p_user uuid default null, p_reason text default null)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not public.circle_is_moderator(me) then raise exception 'Only authorized moderators can do this.'; end if;
  if p_action = 'hide_post' then update public.circle_posts set status = 'hidden' where id = p_post and topic_id = p_topic;
  elsif p_action = 'restore_post' then update public.circle_posts set status = 'visible' where id = p_post and topic_id = p_topic;
  elsif p_action = 'remove_post' then update public.circle_posts set status = 'removed' where id = p_post and topic_id = p_topic;
  elsif p_action = 'highlight_post' then update public.circle_posts set highlighted = not highlighted where id = p_post and topic_id = p_topic;
  elsif p_action = 'remove_user' then
    insert into public.circle_bans (topic_id, user_id, by_id, reason) values (p_topic, p_user, me, left(p_reason, 500)) on conflict do nothing;
    update public.circle_posts set status = 'hidden' where topic_id = p_topic and author_id = p_user and status = 'visible';
  elsif p_action = 'warn_user' then null;
  elsif p_action = 'pause' then update public.circle_topics set paused = true where id = p_topic;
  elsif p_action = 'resume' then update public.circle_topics set paused = false where id = p_topic;
  elsif p_action = 'close' then update public.circle_topics set closed_at = now() where id = p_topic;
  elsif p_action = 'reopen' then update public.circle_topics set closed_at = null where id = p_topic;
  elsif p_action = 'escalate' then
    insert into public.circle_reports (topic_id, post_id, reporter_id, reason, details) values (p_topic, p_post, me, 'other', left(coalesce(p_reason, 'Escalated by a moderator'), 1000));
  else raise exception 'Unknown action';
  end if;
  insert into public.circle_mod_log (topic_id, actor_id, action, target_user, target_post, reason) values (p_topic, me, p_action, p_user, p_post, left(p_reason, 500));
  return 'ok';
end $$;
grant execute on function public.circle_moderate(text, uuid, uuid, uuid, text) to authenticated;

-- ─── Row security ─────────────────────────────────────────────────────────────────────────────
alter table public.circle_moderators enable row level security;
alter table public.circle_topics enable row level security;
alter table public.circle_posts enable row level security;
alter table public.circle_bans enable row level security;
alter table public.circle_polls enable row level security;
alter table public.circle_poll_votes enable row level security;
alter table public.circle_suggestions enable row level security;
alter table public.circle_reports enable row level security;
alter table public.circle_presence enable row level security;
alter table public.circle_mod_log enable row level security;

create policy "moderators: self and owner" on public.circle_moderators for select to authenticated
  using (user_id = auth.uid() or public.has_staff_role(array['owner', 'admin']::public.staff_role[]));
create policy "moderators: owner manages" on public.circle_moderators for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Members see scheduled topics (current, past and upcoming); drafts only in the Control Center. Lounges need a paid membership.
create policy "topics: scheduled" on public.circle_topics for select to authenticated
  using ((status = 'scheduled' and (room = 'becoming' or public.has_paid_membership(auth.uid())))
         or public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]) or public.circle_is_moderator(auth.uid()));
create policy "topics: owner and admins edit" on public.circle_topics for all to authenticated
  using (public.has_staff_role(array['owner', 'admin']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'admin']::public.staff_role[]));

create policy "posts: read visible" on public.circle_posts for select to authenticated
  using (exists (select 1 from public.circle_topics t where t.id = topic_id and t.status = 'scheduled' and t.slot_start <= now()
                 and (t.room = 'becoming' or public.has_paid_membership(auth.uid())))
         and (status = 'visible' or author_id = auth.uid() or public.circle_is_moderator(auth.uid())));
create policy "posts: write own" on public.circle_posts for insert to authenticated with check (author_id = auth.uid());
create policy "posts: delete own" on public.circle_posts for delete to authenticated using (author_id = auth.uid());

create policy "bans: moderators and self" on public.circle_bans for select to authenticated using (user_id = auth.uid() or public.circle_is_moderator(auth.uid()));

create policy "polls: read with topic" on public.circle_polls for select to authenticated
  using (exists (select 1 from public.circle_topics t where t.id = topic_id and t.status = 'scheduled'));
create policy "polls: moderators create" on public.circle_polls for insert to authenticated with check (public.circle_is_moderator(auth.uid()) and created_by = auth.uid());
create policy "polls: moderators close" on public.circle_polls for update to authenticated using (public.circle_is_moderator(auth.uid()));
create policy "votes: own" on public.circle_poll_votes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from public.circle_polls p where p.id = poll_id and not p.closed));

create policy "suggestions: own and staff" on public.circle_suggestions for select to authenticated
  using (user_id = auth.uid() or public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));
create policy "suggestions: submit" on public.circle_suggestions for insert to authenticated with check (user_id = auth.uid());
create policy "suggestions: staff review" on public.circle_suggestions for update to authenticated using (public.has_staff_role(array['owner', 'admin']::public.staff_role[]));

create policy "reports: file" on public.circle_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports: own and moderators" on public.circle_reports for select to authenticated using (reporter_id = auth.uid() or public.circle_is_moderator(auth.uid()));
create policy "reports: moderators resolve" on public.circle_reports for update to authenticated using (public.circle_is_moderator(auth.uid()));

create policy "presence: moderators" on public.circle_presence for select to authenticated using (public.circle_is_moderator(auth.uid()));
create policy "log: owner and admins" on public.circle_mod_log for select to authenticated
  using (public.has_staff_role(array['owner', 'admin']::public.staff_role[]) or actor_id = auth.uid());

revoke all on public.circle_moderators, public.circle_topics, public.circle_posts, public.circle_bans, public.circle_polls, public.circle_poll_votes,
  public.circle_suggestions, public.circle_reports, public.circle_presence, public.circle_mod_log from public, anon;
grant select, insert, update, delete on public.circle_moderators, public.circle_topics, public.circle_polls, public.circle_poll_votes to authenticated;
grant select, insert, delete on public.circle_posts to authenticated;
grant select on public.circle_bans, public.circle_presence, public.circle_mod_log to authenticated;
grant select, insert, update on public.circle_suggestions, public.circle_reports to authenticated;
grant all on public.circle_moderators, public.circle_topics, public.circle_posts, public.circle_bans, public.circle_polls, public.circle_poll_votes,
  public.circle_suggestions, public.circle_reports, public.circle_presence, public.circle_mod_log to service_role;
-- Members may only change their own vote, never others'; moderators only resolve reports and close polls.

-- ─── Who Am I Becoming? (The Art of Becoming expansion, private) ───────────────────────────────
create table public.becoming_plans (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  becoming text check (char_length(becoming) <= 3000),
  future_self text check (char_length(future_self) <= 3000),
  growth_plan text check (char_length(growth_plan) <= 3000),
  updated_at timestamptz not null default now()
);
create table public.becoming_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  horizon text not null check (horizon in ('1y', '5y', '10y')),
  area text not null check (area in ('career', 'business', 'financial-freedom', 'relationships', 'travel', 'personal-growth', 'wellness', 'lifestyle')),
  title text not null check (char_length(title) between 1 and 200),
  why text check (char_length(why) <= 1000),
  first_step text check (char_length(first_step) <= 300),
  status text not null default 'active' check (status in ('active', 'achieved', 'released')),
  created_at timestamptz not null default now()
);
do $$
declare t text;
begin
  foreach t in array array['becoming_plans', 'becoming_goals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own only" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('revoke all on public.%I from public, anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
create or replace function public.becoming_goal_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.becoming_goals where user_id = new.user_id) >= 60 then raise exception 'You can keep up to 60 goals.'; end if;
  return new;
end $$;
create trigger becoming_goal_limit before insert on public.becoming_goals for each row execute function public.becoming_goal_limit();

-- Optional AI screening of written discussion (OpenAI moderation) stays OFF until the owner approves it.
insert into public.platform_settings (key, value, description) values ('circle_ai_screening', 'false'::jsonb, 'Optional contextual AI screening of Becoming Circle comments (OpenAI moderation). Off until the owner approves.') on conflict (key) do nothing;
