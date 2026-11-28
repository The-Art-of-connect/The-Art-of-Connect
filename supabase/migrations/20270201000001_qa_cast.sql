-- QA fictional cast for In Love (owner request, November 28, 2026). Lets Journey's QA account test Singles and Couples
-- end to end with fictional participants, without weakening any rule for real members:
--   • Realm isolation: test accounts and real members can never see, match, message or reach each other.
--   • Test-only verification: a separate flag, honored only for test accounts, never shown as Identity Verified.
--   • Fictional participants act only through qa_act(), callable only by the owner-listed QA account.

-- ─── Preferences for compatibility (optional for every member) ─────────────────────────────────────────────────────────
alter table relationships.profiles add column if not exists gender text check (gender in ('woman', 'man', 'nonbinary'));
alter table relationships.profiles add column if not exists seeking text[] not null default '{}'
  check (seeking <@ array['woman', 'man', 'nonbinary']::text[]);

-- ─── Test-only verification and realm isolation ────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists test_identity_verified boolean not null default false;
comment on column public.profiles.test_identity_verified is 'Fictional QA verification state. Honored only for is_test accounts; never displayed as Identity Verified.';

create or replace function public.same_test_realm(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_test from public.profiles where id = a), false) = coalesce((select is_test from public.profiles where id = b), false);
$$;
-- Used inside the In Love policies, which run as the member; it reveals only whether two accounts share a realm.
revoke all on function public.same_test_realm(uuid, uuid) from public, anon;
grant execute on function public.same_test_realm(uuid, uuid) to authenticated;

create or replace function public.matchmaking_eligible(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (not public.setting_enabled('require_identity_for_matchmaking')
          or exists (select 1 from public.profiles where id = uid and identity_verified_at is not null)
          -- Fictional QA accounts only: a test verification state, never a real verification.
          or exists (select 1 from public.profiles where id = uid and is_test and test_identity_verified))
     and (not public.setting_enabled('hide_flagged_from_matchmaking') or not public.has_open_safety_flag(uid));
$$;

-- Members may never change verification or test fields themselves (adds the new field to the existing guard).
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not public.has_staff_role(array['owner','admin']::public.staff_role[])
     and (new.status is distinct from old.status
          or new.email is distinct from old.email
          or new.account_type is distinct from old.account_type
          or new.age_eligible is distinct from old.age_eligible
          or new.age_verified_at is distinct from old.age_verified_at
          or new.identity_verified_at is distinct from old.identity_verified_at
          or new.referral_code is distinct from old.referral_code
          or new.referred_by_code is distinct from old.referred_by_code
          or new.is_test is distinct from old.is_test
          or new.test_identity_verified is distinct from old.test_identity_verified
          or (new.primary_society is distinct from old.primary_society and coalesce(current_setting('app.society_transition', true), '') <> 'on')) then
    raise exception 'Not permitted to change these account fields';
  end if;
  return new;
end;
$$;

-- Owner-listed fictional participants (never real people).
create table if not exists public.qa_participants (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  persona text not null,
  created_at timestamptz not null default now()
);
alter table public.qa_participants enable row level security;
drop policy if exists qa_participants_qa on public.qa_participants;
create policy qa_participants_qa on public.qa_participants for select using (public.is_qa_account(auth.uid()));
revoke all on public.qa_participants from anon, authenticated;
grant select on public.qa_participants to authenticated;

create or replace function public.is_qa_participant(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select uid is not null and exists (select 1 from public.qa_participants q join public.profiles p on p.id = q.user_id where q.user_id = uid and p.is_test);
$$;
revoke all on function public.is_qa_participant(uuid) from public, anon;

-- Fictional participants preview In Love before launch, like the QA account (real members still wait for launch).
create or replace function public.has_experience(exp experience)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when exp = 'counseling' then exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
    else exists (
      select 1 from public.experience_access a
      join public.profiles p on p.id = a.user_id
      where a.user_id = auth.uid() and a.experience = exp and a.status = 'active' and a.source <> 'free_tier'
        and p.status = 'active' and (a.expires_at is null or a.expires_at > now()))
  end and (public.setting_enabled(exp::text || '_live') or public.is_qa_account(auth.uid()) or public.is_qa_participant(auth.uid()));
$$;

-- Realm isolation in the In Love policies (everything else in them is unchanged).
drop policy if exists "members see eligible visible singles" on relationships.profiles;
create policy "members see eligible visible singles" on relationships.profiles for select using (
  (user_id = auth.uid())
  or (is_visible and track = 'single' and public.has_experience('relationships') and public.matchmaking_eligible(auth.uid())
      and public.matchmaking_eligible(user_id) and not public.is_blocked_between(auth.uid(), user_id) and public.same_test_realm(auth.uid(), user_id))
  or public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]));

drop policy if exists "request connection" on relationships.connections;
create policy "request connection" on relationships.connections for insert with check (
  requester_id = auth.uid() and public.has_experience('relationships') and public.matchmaking_eligible(auth.uid())
  and public.matchmaking_eligible(recipient_id) and not public.is_blocked_between(requester_id, recipient_id)
  and public.same_test_realm(requester_id, recipient_id));

-- Membership marks and conversations respect the realm too.
create or replace function public.member_visible_to(viewer uuid, target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select viewer is not null and target is not null and (viewer = target or (
    exists (select 1 from public.profiles p where p.id = target and p.status = 'active')
    and not public.is_blocked_between(viewer, target)
    and public.same_test_realm(viewer, target)
    and (
      exists (select 1 from public.social_profiles sp where sp.user_id = target and public.social_profile_visible(viewer, target, sp.profile_visibility))
      or exists (select 1 from business.profiles bp where bp.user_id = target and bp.is_visible)
      or exists (select 1 from relationships.profiles rp where rp.user_id = target and rp.is_visible)
      or exists (select 1 from public.social_connections c where (c.requester_id = viewer and c.addressee_id = target) or (c.requester_id = target and c.addressee_id = viewer))
      or exists (select 1 from public.social_conversation_members a join public.social_conversation_members b on a.conversation_id = b.conversation_id where a.user_id = viewer and b.user_id = target)
      or exists (select 1 from public.social_circle_members a join public.social_circle_members b on a.circle_id = b.circle_id where a.user_id = viewer and b.user_id = target)
      or exists (select 1 from business.conversations c where (c.requester_id = viewer and c.recipient_id = target) or (c.requester_id = target and c.recipient_id = viewer))
      or exists (select 1 from business.room_participants a join business.room_participants b on a.room_id = b.room_id where a.user_id = viewer and b.user_id = target and a.left_at is null)
    )));
$$;
revoke all on function public.member_visible_to(uuid, uuid) from public, anon, authenticated;

-- ─── Discovery with mutual preferences and the realm ───────────────────────────────────────────────────────────────────
drop function if exists relationships.discover(integer);
create or replace function relationships.discover(p_limit integer default 24)
returns table (user_id uuid, first_name text, age integer, city text, intent text, headline text, about text,
               reasons text[], distinction text, identity_verified boolean, test_verified boolean)
language sql stable security definer set search_path = public, relationships as $$
  with me as (select auth.uid() id),
  mine as (select rp.city, rp.relationship_intent, rp.gender, rp.seeking from relationships.profiles rp where rp.user_id = (select id from me)),
  my_interests as (select coalesce((select sp.interests from public.social_profiles sp where sp.user_id = (select id from me)), '{}'::text[]) i)
  select rp.user_id,
    nullif(split_part(coalesce(p.display_name, ''), ' ', 1), ''),
    case when rp.birth_year is not null then extract(year from now())::int - rp.birth_year end,
    rp.city, rp.relationship_intent, rp.headline, rp.about,
    array_remove(array[
      case when rp.relationship_intent is not null and rp.relationship_intent = m.relationship_intent then 'You want the same kind of relationship' end,
      case when rp.city is not null and lower(rp.city) = lower(m.city) then 'You live in the same city' end,
      case when exists (select 1 from unnest(coalesce(sp.interests, '{}'::text[])) x, my_interests mi where x = any(mi.i)) then 'You share interests' end,
      case when exists (select 1 from relationships.assessments a where a.user_id = rp.user_id) then 'Completed relationship readiness' end
    ], null),
    public.membership_distinction(rp.user_id),
    p.identity_verified_at is not null,
    p.is_test and p.test_identity_verified
  from relationships.profiles rp
  join public.profiles p on p.id = rp.user_id and p.status = 'active'
  left join public.social_profiles sp on sp.user_id = rp.user_id
  left join mine m on true
  where rp.user_id <> (select id from me)
    and rp.is_visible and rp.track = 'single'
    and public.has_experience('relationships')
    and public.matchmaking_eligible((select id from me)) and public.matchmaking_eligible(rp.user_id)
    and not public.is_blocked_between((select id from me), rp.user_id)
    and public.same_test_realm((select id from me), rp.user_id)
    -- Mutual preferences: when either member has said who they're looking for, both must match.
    and (coalesce(cardinality(m.seeking), 0) = 0 or rp.gender = any(m.seeking))
    and (cardinality(rp.seeking) = 0 or coalesce(m.gender = any(rp.seeking), false))
    and not exists (select 1 from relationships.connections c
                    where (c.requester_id = (select id from me) and c.recipient_id = rp.user_id)
                       or (c.recipient_id = (select id from me) and c.requester_id = rp.user_id))
  order by p.identity_verified_at is null, rp.updated_at desc
  limit least(coalesce(p_limit, 24), 60);
$$;
revoke all on function relationships.discover(integer) from public, anon;
grant execute on function relationships.discover(integer) to authenticated;

-- ─── The QA console: act as a fictional participant toward the QA account ──────────────────────────────────────────────
create table if not exists public.qa_action_log (
  id bigint generated always as identity primary key,
  qa_user uuid not null, participant uuid not null, action text not null, result text, created_at timestamptz not null default now()
);
alter table public.qa_action_log enable row level security;
drop policy if exists qa_action_log_qa on public.qa_action_log;
create policy qa_action_log_qa on public.qa_action_log for select using (qa_user = auth.uid());
revoke all on public.qa_action_log from anon, authenticated;
grant select on public.qa_action_log to authenticated;

create or replace function public.qa_act(p_participant uuid, p_action text, p_text text default null)
returns text language plpgsql security definer set search_path = public, relationships as $$
declare
  qa uuid := auth.uid(); r text := 'ok'; cid uuid; conv uuid; req uuid; qa_email citext; inv relationships.partner_invitations;
begin
  if not public.is_qa_account(qa) then raise exception 'QA_NOT_ALLOWED'; end if;
  if not public.is_qa_participant(p_participant) then raise exception 'QA_NOT_A_PARTICIPANT'; end if;
  -- Act as the fictional participant for the rest of this call; existing rules then apply to them.
  perform set_config('request.jwt.claim.sub', p_participant::text, true);
  case p_action
    when 'express_interest' then
      if public.is_blocked_between(p_participant, qa) then raise exception 'Blocked members cannot connect.'; end if;
      insert into relationships.connections (requester_id, recipient_id) values (p_participant, qa) on conflict do nothing;
    when 'accept_interest', 'decline_interest' then
      update relationships.connections set status = case when p_action = 'accept_interest' then 'accepted' else 'declined' end
        where requester_id = qa and recipient_id = p_participant and status = 'pending';
      if not found then r := 'no pending interest from the QA account'; end if;
    when 'send_message' then
      conv := relationships.start_love_conversation(qa);
      insert into public.social_messages (conversation_id, sender_id, body) values (conv, p_participant, coalesce(nullif(trim(p_text), ''), 'Hello! (fictional QA message)'));
    when 'request_exclusive' then
      perform relationships.request_exclusive(qa);
    when 'accept_exclusive', 'decline_exclusive' then
      select id into req from relationships.exclusive_requests where requester_id = qa and recipient_id = p_participant and status = 'pending';
      if req is null then raise exception 'No pending Exclusive Connection invitation from the QA account.'; end if;
      perform relationships.respond_exclusive(req, p_action = 'accept_exclusive');
    when 'become_couple' then
      r := relationships.become_couple(qa);
    when 'accept_partner_invitation' then
      select * into inv from relationships.partner_invitations
        where inviter_id = qa and invitee_email = (select email from public.profiles where id = p_participant) and status = 'pending' and expires_at > now()
        order by created_at desc limit 1;
      if inv.id is null then raise exception 'No pending partner invitation to this participant''s email.'; end if;
      insert into relationships.couple_members (couple_id, user_id) values (inv.couple_id, p_participant);
      update relationships.partner_invitations set status = 'accepted' where id = inv.id;
      update relationships.profiles set track = 'couple', is_visible = false where user_id in (p_participant, qa);
    when 'add_goal', 'checkin_shared', 'checkin_private', 'add_event' then
      select couple_id into cid from relationships.couple_members where user_id = p_participant
        and couple_id in (select couple_id from relationships.couple_members where user_id = qa);
      if cid is null then raise exception 'This participant is not in a couple space with the QA account.'; end if;
      if p_action = 'add_goal' then
        insert into relationships.couple_goals (couple_id, created_by, title) values (cid, p_participant, coalesce(nullif(trim(p_text), ''), 'Plan a weekend away together (fictional)'));
      elsif p_action = 'add_event' then
        insert into relationships.couple_events (couple_id, created_by, kind, title, starts_at, ends_at)
          values (cid, p_participant, 'date_night', coalesce(nullif(trim(p_text), ''), 'Dinner by the water (fictional)'), now() + interval '3 days', now() + interval '3 days 3 hours');
      else
        insert into relationships.couple_checkins (couple_id, user_id, mood, note, shared)
          values (cid, p_participant, 'grateful', case when p_action = 'checkin_shared' then 'Shared: grateful for our walk today (fictional).' else 'Private: a note only I can see (fictional).' end, p_action = 'checkin_shared')
          on conflict (couple_id, user_id, day) do update set mood = excluded.mood, note = excluded.note, shared = excluded.shared;
      end if;
    when 'block' then
      insert into public.blocks (blocker_id, blocked_id) values (p_participant, qa) on conflict do nothing;
    when 'unblock' then
      delete from public.blocks where blocker_id = p_participant and blocked_id = qa;
    when 'report' then
      insert into public.moderation_reports (reporter_id, reported_user_id, experience, reason, details)
        values (p_participant, qa, 'relationships', 'other', '[Fictional QA test report — not a real concern] ' || coalesce(p_text, 'Testing the reporting workflow.'));
    when 'reset' then
      delete from public.blocks where (blocker_id = p_participant and blocked_id = qa) or (blocker_id = qa and blocked_id = p_participant);
      delete from relationships.connections where (requester_id = p_participant and recipient_id = qa) or (requester_id = qa and recipient_id = p_participant);
      delete from relationships.exclusive_requests where (requester_id = p_participant and recipient_id = qa) or (requester_id = qa and recipient_id = p_participant);
      delete from relationships.couple_consents where (user_id = p_participant and partner_id = qa) or (user_id = qa and partner_id = p_participant);
      delete from relationships.couples where id in (select couple_id from relationships.couple_members where user_id = p_participant)
        and id in (select couple_id from relationships.couple_members where user_id = qa);
      delete from public.social_conversations c where c.kind = 'direct'
        and exists (select 1 from public.social_conversation_members m where m.conversation_id = c.id and m.user_id = p_participant)
        and exists (select 1 from public.social_conversation_members m where m.conversation_id = c.id and m.user_id = qa);
      update relationships.profiles set track = 'single', is_visible = true where user_id in (p_participant, qa);
    else raise exception 'QA_UNKNOWN_ACTION';
  end case;
  perform set_config('request.jwt.claim.sub', qa::text, true);
  insert into public.qa_action_log (qa_user, participant, action, result) values (qa, p_participant, p_action, r);
  return r;
exception when others then
  perform set_config('request.jwt.claim.sub', qa::text, true);
  raise;
end $$;
revoke all on function public.qa_act(uuid, text, text) from public, anon;
grant execute on function public.qa_act(uuid, text, text) to authenticated;

-- Where each fictional participant stands with the QA account (for the QA console only).
create or replace function public.qa_participant_status()
returns table (user_id uuid, name text, persona text, age integer, gender text, seeking text[], city text, test_verified boolean, distinction text,
               connection text, exclusive text, couple boolean, blocked boolean)
language sql stable security definer set search_path = public, relationships as $$
  select q.user_id, p.display_name, q.persona,
    case when rp.birth_year is not null then extract(year from now())::int - rp.birth_year end, rp.gender, rp.seeking, rp.city,
    p.test_identity_verified, public.membership_distinction(q.user_id),
    (select c.status || case when c.requester_id = auth.uid() then ' (you asked)' else ' (they asked)' end from relationships.connections c
       where (c.requester_id = q.user_id and c.recipient_id = auth.uid()) or (c.requester_id = auth.uid() and c.recipient_id = q.user_id) order by c.created_at desc limit 1),
    (select e.status from relationships.exclusive_requests e
       where (e.requester_id = q.user_id and e.recipient_id = auth.uid()) or (e.requester_id = auth.uid() and e.recipient_id = q.user_id) order by e.created_at desc limit 1),
    exists (select 1 from relationships.couple_members a join relationships.couple_members b on a.couple_id = b.couple_id where a.user_id = q.user_id and b.user_id = auth.uid()),
    public.is_blocked_between(q.user_id, auth.uid())
  from public.qa_participants q
  join public.profiles p on p.id = q.user_id
  left join relationships.profiles rp on rp.user_id = q.user_id
  where public.is_qa_account(auth.uid())
  order by q.persona, p.display_name;
$$;
revoke all on function public.qa_participant_status() from public, anon;
grant execute on function public.qa_participant_status() to authenticated;
