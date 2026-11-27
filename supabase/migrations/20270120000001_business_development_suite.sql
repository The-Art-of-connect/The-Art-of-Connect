-- Founder directives 27 (Business Credibility, Financial Readiness & Collaboration), 28 (Strategic Business Development &
-- Professional Collaboration Suite) and 29 (Capital & Funding Intelligence Center), November 27, 2026.
-- One shared foundation that reuses the existing business inbox, blocks, reports, Safety Shield and Intelligence Division.
--
-- Principles enforced here:
--   * Regulated activity (investor solicitation, securities offerings, capital raising, lending, crowdfunding, transaction-based
--     compensation) stays restricted until legal review and owner authorization, including inside private messages.
--   * Fraud patterns (guaranteed returns, pyramid schemes, payment requests) are always prohibited.
--   * Funding status is never inferred: declared, verified balance, approved financing and committed funds are separate, and only
--     a reviewer can mark something verified. Lender decisions need supporting evidence.
--   * Discussion is not agreement: proposal responses never include "agree" or "bind"; no e-signature or ownership transfer exists.
--   * Journey (the service role) can never mark a document reviewed or legally approved; only a human advisor can.
--   * Deal Room content is visible only to its participants. Platform staff get aggregate metrics, never documents or messages.

-- ─── Suite settings (owner) ─────────────────────────────────────────────────────────────────
create table business.suite_settings (
  id boolean primary key default true check (id),
  executive_rooms integer not null default 2 check (executive_rooms between 0 and 20),
  elite_rooms integer not null default 10 check (elite_rooms between 0 and 100),
  executive_funding_projects integer not null default 2 check (executive_funding_projects between 0 and 20),
  elite_funding_projects integer not null default 10 check (elite_funding_projects between 0 and 100),
  max_advisors_per_room integer not null default 12 check (max_advisors_per_room between 0 and 50),
  vault_scan_required boolean not null default true,
  vault_max_mb integer not null default 25 check (vault_max_mb between 1 and 100),
  privileged_ai_processing_approved boolean not null default false,
  privileged_ai_legal_review text check (char_length(privileged_ai_legal_review) <= 2000),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
insert into business.suite_settings (id) values (true) on conflict do nothing;
create or replace function business.guard_suite_settings()
returns trigger language plpgsql set search_path = business, public as $$
begin
  if new.privileged_ai_processing_approved and not old.privileged_ai_processing_approved
     and coalesce(char_length(btrim(new.privileged_ai_legal_review)), 0) < 20 then
    raise exception 'Record the privacy and legal review before allowing AI processing of privileged material.';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger guard_suite_settings before update on business.suite_settings for each row execute function business.guard_suite_settings();

-- ─── Regulatory restrictions (owner-controlled, restricted by default) ───────────────────────
create table business.regulated_restrictions (
  key text primary key,
  label text not null,
  restricted boolean not null default true,
  legal_reviewer text check (char_length(legal_reviewer) <= 200),
  legal_review_note text check (char_length(legal_review_note) <= 4000),
  legal_reviewed_on date,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
insert into business.regulated_restrictions (key, label) values
  ('investor_matching', 'Investor matching and investment solicitation'),
  ('securities_offerings', 'Securities offerings (shares, equity, units, tokens)'),
  ('capital_raising', 'Capital-raising transactions'),
  ('crowdfunding', 'Crowdfunding'),
  ('lending', 'Lending or loan brokerage between members'),
  ('transaction_compensation', 'Transaction-based compensation, placement, finder''s or referral fees'),
  ('ownership_transfer', 'Ownership transfer execution'),
  ('binding_execution', 'Binding agreement execution and electronic signatures'),
  ('external_credit_applications', 'Submitting credit applications or financial information to lenders')
on conflict (key) do nothing;
create or replace function business.guard_restriction()
returns trigger language plpgsql set search_path = business, public as $$
begin
  if not new.restricted and old.restricted and (new.legal_reviewed_on is null or coalesce(char_length(btrim(new.legal_reviewer)), 0) < 3
       or coalesce(char_length(btrim(new.legal_review_note)), 0) < 20) then
    raise exception 'A restriction can be lifted only after legal review: record the reviewer, date and conclusion.';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger guard_restriction before update on business.regulated_restrictions for each row execute function business.guard_restriction();
create or replace function business.is_restricted(k text)
returns boolean language sql stable security definer set search_path = business, public as $$
  select coalesce((select restricted from business.regulated_restrictions where key = k), true);
$$;

-- Wording that signals regulated activity or fraud. Returns restriction keys (or always-prohibited reasons).
create or replace function business.regulated_findings(t text)
returns text[] language sql immutable set search_path = business, public as $$
  select array_remove(array[
    case when t ~* '\yguarantee(d|s)?\s+(a\s+|an\s+)?(\d+%\s+)?(return|returns|profit|profits|roi|income|payout|yield)' then 'guaranteed_returns' end,
    case when t ~* '\y(invest|investing)\s+(\$?[\d,.]+\s*[km]?\s+)?(in|into)\s+(my|our|this)\s+(company|business|deal|fund|startup|venture|project|offering)'
           or t ~* '\y(seeking|looking for|need|want)\s+(an?\s+)?investors?\y' or t ~* '\yinvestors?\s+wanted' then 'investor_matching' end,
    case when t ~* '\y(raise|raising)\s+(\$?[\d,.]+\s*[km]?\s+(in\s+)?)?(capital|funds|money|equity)\y' or t ~* '\yaccredited investors?\y' then 'capital_raising' end,
    case when t ~* '\y(buy|purchase|sell|selling|offer|offering)\s+(\d+%?\s+)?(of\s+)?(my\s+|our\s+|the\s+)?(shares|stock|equity|units|tokens|membership interests?)\y' then 'securities_offerings' end,
    case when t ~* '\ycrowd-?fund' then 'crowdfunding' end,
    case when t ~* '\y(finder''?s fee|referral fee|placement fee|success fee|commission on (the )?(deal|sale|closing|transaction|loan))' then 'transaction_compensation' end,
    case when t ~* '\y(i|we)\s+(can|will|could)\s+(lend|loan)\s+you\y' or t ~* '\yprivate loans?\y' then 'lending' end,
    case when t ~* '\y(pyramid scheme|downline|mlm|multi-level marketing)\y' or t ~* '\yrecruit\s+(\d+|two|three|four|five)\s+(people|members|others)' then 'pyramid' end,
    case when t ~* '\y(wire|send|transfer|zelle|venmo)\s+(me|us)\s+(the\s+)?(\$|money|funds|deposit|payment|\d)' or t ~* '\y(gift cards?|crypto(currency)? wallet|bitcoin address)\y' then 'payment_request' end
  ], null);
$$;
grant execute on function business.regulated_findings(text) to authenticated, service_role;

-- Blocks restricted or prohibited wording on any text a member writes in the business suite.
create or replace function business.regulated_guard()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare j jsonb := to_jsonb(new); txt text; f text[]; blocked text[] := '{}'; k text;
begin
  txt := concat_ws(' ', j ->> 'body', j ->> 'title', j ->> 'description', j ->> 'project', j ->> 'reason', j ->> 'shared_info',
                   j ->> 'detail', j ->> 'note', j ->> 'objective', j ->> 'subject', j ->> 'summary', j ->> 'sections', j ->> 'collab_summary');
  f := business.regulated_findings(txt);
  foreach k in array f loop
    if k in ('guaranteed_returns', 'pyramid', 'payment_request') or business.is_restricted(k) then blocked := blocked || k; end if;
  end loop;
  if cardinality(blocked) > 0 then
    raise exception 'REGULATED_ACTIVITY:%', array_to_string(blocked, ',') using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Sensitive financial details (SSN, card, bank account, credentials) are blocked everywhere in the suite;
-- personal contact details are additionally blocked until both members have accepted a conversation.
create or replace function business.financial_shield(t text)
returns text[] language sql immutable set search_path = public as $$
  select array(select x from unnest(public.shield_findings(t)) x where x in ('ssn', 'card', 'bank', 'credentials'));
$$;
grant execute on function business.financial_shield(text) to authenticated, service_role;
create or replace function business.financial_shield_guard()
returns trigger language plpgsql set search_path = business, public as $$
declare j jsonb := to_jsonb(new); f text[];
begin
  f := business.financial_shield(concat_ws(' ', j ->> 'body', j ->> 'title', j ->> 'detail', j ->> 'note', j ->> 'subject', j ->> 'summary', j ->> 'sections'));
  if cardinality(f) > 0 then raise exception 'SAFETY_SHIELD:%', array_to_string(f, ',') using errcode = 'P0001'; end if;
  return new;
end $$;

-- ─── Business collaboration profiles (directive 27 §3), extending business.profiles ──────────
alter table business.profiles
  add column collab_opt_in boolean not null default false,
  add column collab_welcome_requests boolean not null default false,
  add column collab_interests text[] not null default '{}' check (collab_interests <@ array['operational_partnership', 'acquisition', 'expansion',
    'leadership', 'mentorship', 'board_advisory', 'strategic_collaboration', 'joint_venture_concept', 'management_arrangement']::text[]),
  add column collab_regions text[] not null default '{}' check (cardinality(collab_regions) <= 20),
  add column collab_owns_business boolean,
  add column collab_summary text check (char_length(collab_summary) <= 1500),
  add column collab_updated_at timestamptz;
create or replace function business.guard_collab_profile()
returns trigger language plpgsql set search_path = business, public as $$
declare f text[];
begin
  f := public.shield_findings(coalesce(new.collab_summary, ''));
  if cardinality(f) > 0 then raise exception 'SAFETY_SHIELD:%', array_to_string(f, ',') using errcode = 'P0001'; end if;
  if not new.collab_opt_in then new.collab_welcome_requests := false; end if;
  new.collab_updated_at := now();
  return new;
end $$;
create trigger guard_collab_profile before insert or update of collab_opt_in, collab_welcome_requests, collab_interests, collab_regions, collab_owns_business, collab_summary
  on business.profiles for each row execute function business.guard_collab_profile();
create trigger regulated_collab_profile before insert or update of collab_summary on business.profiles
  for each row execute function business.regulated_guard();

-- ─── Private Business Deal Rooms (27 §6, 28 §10) ─────────────────────────────────────────────
create table business.deal_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  objective text check (char_length(objective) <= 4000),
  blueprint jsonb not null default '{}' check (jsonb_typeof(blueprint) = 'object'),
  assignment_id uuid references public.intel_assignments (id) on delete set null,
  stage text not null default 'exploring' check (stage in ('exploring', 'proposal', 'due_diligence', 'professional_review', 'established', 'ongoing_development')),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deal_rooms_owner on business.deal_rooms (owner_id, status);
create trigger touch_deal_rooms before update on business.deal_rooms for each row execute function public.touch_updated_at();
create trigger regulated_deal_rooms before insert or update of title, objective on business.deal_rooms for each row execute function business.regulated_guard();
create trigger financial_shield_deal_rooms before insert or update of title, objective on business.deal_rooms for each row execute function business.financial_shield_guard();

-- Participants: principals (members) and the professional advisors each principal invites for themselves.
create table business.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references business.deal_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'principal', 'advisor')),
  advisor_type text check (advisor_type in ('attorney', 'accountant', 'business_advisor', 'financing_professional', 'other_professional')),
  client_id uuid references public.profiles (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'active', 'declined', 'withdrawn', 'removed')),
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  unique (room_id, user_id),
  check ((role = 'advisor') = (advisor_type is not null and client_id is not null))
);
create index room_participants_user on business.room_participants (user_id, status);

-- The viewer's active role in a room (null when not an active participant).
create or replace function business.room_role(room uuid, uid uuid default auth.uid())
returns text language sql stable security definer set search_path = business, public as $$
  select role from business.room_participants where room_id = room and user_id = uid and status = 'active';
$$;
-- The principal an active participant acts for (themselves, or the client an advisor represents).
create or replace function business.room_side(room uuid, uid uuid default auth.uid())
returns uuid language sql stable security definer set search_path = business, public as $$
  select case when role = 'advisor' then client_id else user_id end
  from business.room_participants where room_id = room and user_id = uid and status = 'active';
$$;
grant execute on function business.room_role(uuid, uuid), business.room_side(uuid, uuid) to authenticated;

create or replace function business.guard_deal_room()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare lvl text; lim integer; n integer;
begin
  if tg_op = 'INSERT' then
    lvl := public.intel_level(new.owner_id);
    if lvl is null then raise exception 'Business Deal Rooms are part of Executive Private and Elite Concierge.'; end if;
    select case lvl when 'elite' then elite_rooms else executive_rooms end into lim from business.suite_settings;
    select count(*) into n from business.deal_rooms where owner_id = new.owner_id and status = 'active';
    if n >= lim then raise exception 'You have reached the number of active Deal Rooms included in your membership.'; end if;
  elsif new.owner_id <> old.owner_id then
    raise exception 'A Deal Room''s owner cannot change.';
  end if;
  return new;
end $$;
create trigger guard_deal_room before insert or update on business.deal_rooms for each row execute function business.guard_deal_room();
create or replace function business.add_room_owner()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  insert into business.room_participants (room_id, user_id, role, status, invited_by, joined_at) values (new.id, new.owner_id, 'owner', 'active', new.owner_id, now());
  return new;
end $$;
create trigger add_room_owner after insert on business.deal_rooms for each row execute function business.add_room_owner();

-- Invitations and participation changes.
--   * Principals: invited by the room owner; must be a paid member with an accepted business conversation with the owner
--     (mutual acceptance first) and no block between them.
--   * Advisors: invited by a principal, for that principal only (one party's attorney never represents everyone). Advisors join
--     through business.accept_advisor_invite and do not need a membership.
--   * Each participant can withdraw themselves; the owner can remove others.
create or replace function business.guard_participant()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare me uuid := auth.uid(); my_role text; n integer;
begin
  if tg_op = 'INSERT' then
    if new.role = 'owner' then
      if not exists (select 1 from business.deal_rooms r where r.id = new.room_id and r.owner_id = new.user_id) then raise exception 'Not permitted'; end if;
      return new;
    end if;
    if me is null or (new.role = 'advisor' and current_setting('business.advisor_accept', true) = 'on') then return new; end if; -- service role or invitation acceptance
    my_role := business.room_role(new.room_id, me);
    new.invited_by := me;
    new.status := 'invited';
    if new.role = 'principal' then
      if my_role is distinct from 'owner' then raise exception 'Only the Deal Room owner invites business participants.'; end if;
      if not public.has_paid_membership(new.user_id) then raise exception 'Business participants must be members.'; end if;
      if public.is_blocked_between(me, new.user_id) then raise exception 'Not permitted'; end if;
      if not exists (select 1 from business.conversations c where c.status = 'accepted'
                     and ((c.requester_id = me and c.recipient_id = new.user_id) or (c.requester_id = new.user_id and c.recipient_id = me))) then
        raise exception 'Invite someone to a Deal Room after you have both accepted a business conversation.';
      end if;
    else
      raise exception 'Advisors are invited with a secure project invitation.';
    end if;
    return new;
  end if;
  -- UPDATE
  if current_setting('business.cascade', true) = 'on' and old.role = 'advisor' and new.status = 'removed' then new.left_at := now(); return new; end if;
  if new.room_id <> old.room_id or new.user_id <> old.user_id or new.role <> old.role or new.client_id is distinct from old.client_id
     or new.advisor_type is distinct from old.advisor_type then
    raise exception 'Participant details cannot change.';
  end if;
  if new.status is distinct from old.status then
    if me = old.user_id then
      if not ((old.status = 'invited' and new.status in ('active', 'declined')) or (old.status = 'active' and new.status = 'withdrawn')) or old.role = 'owner' then
        raise exception 'Not permitted';
      end if;
    elsif business.room_role(old.room_id, me) = 'owner' or (old.role = 'advisor' and business.room_side(old.room_id, me) = old.client_id and business.room_role(old.room_id, me) <> 'advisor') then
      if new.status <> 'removed' or old.role = 'owner' then raise exception 'Not permitted'; end if;
    elsif me is not null then
      raise exception 'Not permitted';
    end if;
    if new.status = 'active' then new.joined_at := now(); end if;
    if new.status in ('withdrawn', 'removed', 'declined') then new.left_at := now(); end if;
  end if;
  return new;
end $$;
create trigger guard_participant before insert or update on business.room_participants for each row execute function business.guard_participant();

-- When a principal leaves, their advisors leave with them and their shared financial information is withdrawn.
create or replace function business.cascade_withdrawal()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if new.status in ('withdrawn', 'removed') and old.status = 'active' and new.role in ('principal', 'owner') then
    perform set_config('business.cascade', 'on', true);
    update business.room_participants set status = 'removed', left_at = now()
      where room_id = new.room_id and role = 'advisor' and client_id = new.user_id and status in ('invited', 'active');
    perform set_config('business.cascade', 'off', true);
    update business.room_funding_shares set revoked_at = now() where room_id = new.room_id and shared_by = new.user_id and revoked_at is null;
  end if;
  return new;
end $$;

-- Advisor invitations: a principal names the professional and their role; the advisor accepts with a one-time link.
create table business.advisor_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references business.deal_rooms (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  advisor_type text not null check (advisor_type in ('attorney', 'accountant', 'business_advisor', 'financing_professional', 'other_professional')),
  advisor_name text not null check (char_length(advisor_name) between 2 and 160),
  advisor_email text not null check (advisor_email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' and char_length(advisor_email) <= 254),
  firm text check (char_length(firm) <= 200),
  token_hash text not null unique check (char_length(token_hash) = 64),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create or replace function business.guard_advisor_invite()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare n integer; lim integer;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and (new.client_id <> auth.uid() or business.room_role(new.room_id) not in ('owner', 'principal')) then
      raise exception 'Only a business participant can invite their own advisors.';
    end if;
    select max_advisors_per_room into lim from business.suite_settings;
    select count(*) into n from business.room_participants where room_id = new.room_id and role = 'advisor' and status in ('invited', 'active');
    if n >= lim then raise exception 'This Deal Room has reached its advisor limit.'; end if;
    new.status := 'pending';
  elsif auth.uid() is not null and current_setting('business.advisor_accept', true) is distinct from 'on' and (new.status <> 'revoked' or old.status <> 'pending' or old.client_id <> auth.uid()) then
    raise exception 'Not permitted';
  end if;
  return new;
end $$;
create trigger guard_advisor_invite before insert or update on business.advisor_invites for each row execute function business.guard_advisor_invite();

-- Accepts an advisor invitation for the signed-in account (any account, no membership needed).
create or replace function business.accept_advisor_invite(token text)
returns uuid language plpgsql security definer set search_path = business, public, extensions as $$
declare i business.advisor_invites; me uuid := auth.uid();
begin
  if me is null then raise exception 'Please sign in to accept this invitation.'; end if;
  select * into i from business.advisor_invites where token_hash = encode(digest(token, 'sha256'), 'hex') for update;
  if i.id is null or i.status <> 'pending' then raise exception 'This invitation is no longer valid.'; end if;
  if i.expires_at < now() then raise exception 'This invitation has expired.'; end if;
  if me = i.client_id then raise exception 'You cannot accept your own invitation.'; end if;
  if business.room_role(i.room_id, i.client_id) is null then raise exception 'This invitation is no longer valid.'; end if;
  perform set_config('business.advisor_accept', 'on', true);
  insert into business.room_participants (room_id, user_id, role, advisor_type, client_id, status, invited_by, joined_at)
    values (i.room_id, me, 'advisor', i.advisor_type, i.client_id, 'active', i.client_id, now())
    on conflict (room_id, user_id) do update set status = 'active', joined_at = now(), left_at = null
      where business.room_participants.role = 'advisor' and business.room_participants.client_id = i.client_id;
  update business.advisor_invites set status = 'accepted', accepted_by = me, accepted_at = now() where id = i.id;
  perform set_config('business.advisor_accept', 'off', true);
  return i.room_id;
end $$;
revoke all on function business.accept_advisor_invite(text) from public, anon;
grant execute on function business.accept_advisor_invite(text) to authenticated;

-- Professional credentials (verified by the owner from official licensing sources; never inferred).
create table business.advisor_credentials (
  user_id uuid not null references public.profiles (id) on delete cascade,
  advisor_type text not null check (advisor_type in ('attorney', 'accountant', 'business_advisor', 'financing_professional', 'other_professional')),
  credential text not null check (char_length(credential) between 2 and 160),
  jurisdiction text check (char_length(jurisdiction) <= 80),
  license_number text check (char_length(license_number) <= 80),
  status text not null default 'submitted' check (status in ('submitted', 'verified', 'not_verified', 'expired')),
  verification_source text check (verification_source ~ '^https://' and char_length(verification_source) <= 1000),
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, advisor_type, credential)
);
create or replace function business.guard_credential()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if public.is_owner() then
    if new.status = 'verified' then
      if new.verification_source is null then raise exception 'Record the official source used to verify this credential.'; end if;
      new.verified_by := auth.uid(); new.verified_at := now();
    end if;
    return new;
  end if;
  if auth.uid() is not null then
    if new.user_id <> auth.uid() then raise exception 'Not permitted'; end if;
    if tg_op = 'UPDATE' and (old.status <> 'submitted' or new.status <> 'submitted') then raise exception 'A verified credential is updated by review.'; end if;
    new.status := 'submitted'; new.verified_by := null; new.verified_at := null;
  end if;
  return new;
end $$;
create trigger guard_credential before insert or update on business.advisor_credentials for each row execute function business.guard_credential();

-- ─── Strategic Business Proposals (28 §1–4, §11) ─────────────────────────────────────────────
-- A proposal is drafted privately, versioned, authorized by its author before sharing, and always labeled a nonbinding
-- discussion document. Each section records whether it is fact, assumption, estimate or proposed arrangement.
create table business.proposals (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  room_id uuid references business.deal_rooms (id) on delete set null,
  assignment_id uuid references public.intel_assignments (id) on delete set null,
  title text not null check (char_length(title) between 3 and 200),
  status text not null default 'draft' check (status in ('draft', 'authorized', 'shared', 'revising', 'withdrawn', 'archived')),
  current_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_proposals before update on business.proposals for each row execute function public.touch_updated_at();
create trigger regulated_proposals before insert or update of title on business.proposals for each row execute function business.regulated_guard();
create table business.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references business.proposals (id) on delete cascade,
  version integer not null check (version >= 1),
  author_id uuid not null references public.profiles (id) on delete cascade,
  summary text check (char_length(summary) <= 4000),
  -- { "executive_summary": {"text": "...", "basis": "fact|assumption|estimate|proposed|research", "sources": [...]}, ... }
  sections jsonb not null default '{}' check (jsonb_typeof(sections) = 'object'),
  completeness jsonb not null default '{}' check (jsonb_typeof(completeness) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'authorized', 'superseded')),
  binding boolean not null default false check (not binding),
  authorized_at timestamptz,
  change_note text check (char_length(change_note) <= 2000),
  created_at timestamptz not null default now(),
  unique (proposal_id, version)
);
create trigger regulated_proposal_versions before insert or update of summary, sections on business.proposal_versions for each row execute function business.regulated_guard();
create trigger shield_proposal_versions before insert or update of summary, sections on business.proposal_versions for each row execute function business.financial_shield_guard();
create or replace function business.guard_proposal_version()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare p business.proposals;
begin
  select * into p from business.proposals where id = new.proposal_id;
  if tg_op = 'INSERT' then
    if auth.uid() is not null and (p.author_id <> auth.uid() or new.author_id <> auth.uid()) then raise exception 'Only the author edits this proposal.'; end if;
    if public.intel_level(p.author_id) is null then raise exception 'The Strategic Proposal Builder is part of Executive Private and Elite Concierge.'; end if;
    new.status := 'draft'; new.authorized_at := null;
    new.version := coalesce((select max(version) from business.proposal_versions where proposal_id = new.proposal_id), 0) + 1;
  else
    if old.status <> 'draft' and (new.sections is distinct from old.sections or new.summary is distinct from old.summary) then
      raise exception 'An authorized version is preserved; create a new version to revise it.';
    end if;
    if new.status = 'authorized' and old.status = 'draft' then
      if auth.uid() is distinct from p.author_id then raise exception 'Only the author can authorize a proposal for sharing.'; end if;
      new.authorized_at := now();
    elsif new.status is distinct from old.status and not (old.status = 'authorized' and new.status = 'superseded') then
      raise exception 'Not permitted';
    end if;
  end if;
  return new;
end $$;
create trigger guard_proposal_version before insert or update on business.proposal_versions for each row execute function business.guard_proposal_version();
create or replace function business.track_proposal_version()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if tg_op = 'INSERT' then
    update business.proposals set current_version = new.version, status = case when status in ('shared', 'authorized') then 'revising' else status end where id = new.proposal_id;
  elsif new.status = 'authorized' and old.status = 'draft' then
    update business.proposal_versions set status = 'superseded' where proposal_id = new.proposal_id and status = 'authorized' and id <> new.id;
    update business.proposals set status = case when status = 'shared' or status = 'revising' then 'shared' else 'authorized' end where id = new.proposal_id;
  end if;
  return null;
end $$;
create trigger track_proposal_version after insert or update on business.proposal_versions for each row execute function business.track_proposal_version();

-- Responses keep discussion, interest and acknowledgement separate from agreement (there is no "agree" response).
create table business.proposal_responses (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references business.proposals (id) on delete cascade,
  version integer not null,
  responder_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('accept_discussion', 'express_interest', 'decline', 'request_information', 'suggest_revision',
    'acknowledge_receipt', 'withdraw_from_discussion')),
  note text check (char_length(note) <= 4000),
  created_at timestamptz not null default now()
);
create trigger regulated_proposal_responses before insert on business.proposal_responses for each row execute function business.regulated_guard();
create trigger shield_proposal_responses before insert on business.proposal_responses for each row execute function business.financial_shield_guard();


-- ─── Business Collaboration Inbox (27 §4, 28 §5): extends the existing private business inbox ─
alter table business.conversations
  add column kind text not null default 'connection' check (kind in ('connection', 'collaboration', 'proposal')),
  add column purpose text check (purpose in ('operational_partnership', 'acquisition', 'expansion', 'leadership', 'mentorship', 'board_advisory',
    'strategic_collaboration', 'joint_venture_concept', 'management_arrangement', 'professional_services', 'other')),
  add column project text check (char_length(project) <= 3000),
  add column reason text check (char_length(reason) <= 2000),
  add column shared_info text check (char_length(shared_info) <= 3000),
  add column proposal_id uuid references business.proposals (id) on delete set null,
  add column proposal_version integer;
alter table business.conversations drop constraint if exists conversations_status_check;
alter table business.conversations add constraint conversations_status_check
  check (status in ('requested', 'more_info', 'accepted', 'declined', 'closed', 'blocked', 'withdrawn'));
alter table business.conversations add constraint conversations_collaboration_fields
  check (kind = 'connection' or (purpose is not null and char_length(btrim(coalesce(project, ''))) >= 10 and char_length(btrim(coalesce(reason, ''))) >= 10));
alter table business.conversations add constraint conversations_proposal_fields check ((kind = 'proposal') = (proposal_id is not null and proposal_version is not null));
drop index if exists business.business_one_open_request;
create unique index business_one_open_request on business.conversations (requester_id, recipient_id, coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(proposal_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status in ('requested', 'more_info', 'accepted');
-- Who may see a proposal: its author, members it was shared with through the inbox, and active participants of its Deal Room.
create or replace function business.can_see_proposal(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = business, public as $$
  select exists (select 1 from business.proposals p where p.id = pid and (
    p.author_id = uid
    or (p.room_id is not null and business.room_role(p.room_id, uid) is not null)
    or exists (select 1 from business.conversations c where c.proposal_id = p.id and c.recipient_id = uid and c.status not in ('blocked'))));
$$;
grant execute on function business.can_see_proposal(uuid, uuid) to authenticated;

create trigger regulated_conversations before insert or update of project, reason, shared_info on business.conversations for each row execute function business.regulated_guard();

-- Requests: personal contact details and sensitive financial details are blocked before mutual acceptance.
create or replace function business.guard_collaboration_request()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare f text[]; v business.proposal_versions;
begin
  f := public.shield_findings(concat_ws(' ', new.project, new.reason, new.shared_info));
  if cardinality(f) > 0 then raise exception 'SAFETY_SHIELD:%', array_to_string(f, ',') using errcode = 'P0001'; end if;
  if new.kind <> 'connection' then
    if public.intel_level(new.requester_id) is null then raise exception 'Business collaboration requests are part of Executive Private and Elite Concierge.'; end if;
    if not exists (select 1 from business.profiles p where p.user_id = new.recipient_id and p.collab_opt_in and p.collab_welcome_requests) then
      raise exception 'This member is not accepting business collaboration requests.';
    end if;
  end if;
  if new.kind = 'proposal' then
    select * into v from business.proposal_versions where proposal_id = new.proposal_id and version = new.proposal_version;
    if v.id is null or v.status <> 'authorized' then raise exception 'Authorize this proposal version before sharing it.'; end if;
    if not exists (select 1 from business.proposals p where p.id = new.proposal_id and p.author_id = new.requester_id) then raise exception 'Not permitted'; end if;
    update business.proposals set status = 'shared' where id = new.proposal_id and status in ('authorized', 'revising');
  end if;
  return new;
end $$;
create trigger guard_collaboration_request before insert on business.conversations for each row execute function business.guard_collaboration_request();

-- Messages: the requester may send one introduction while a request is pending; while more information is requested each side
-- may send up to three messages; after acceptance both may write. Before acceptance the full Safety Shield applies; afterwards
-- sensitive financial details stay blocked. Regulated wording is blocked at every stage.
create or replace function business.guard_message()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare c business.conversations; f text[];
begin
  select * into c from business.conversations where id = new.conversation_id;
  if c.id is null or new.sender_id not in (c.requester_id, c.recipient_id) then raise exception 'Not part of this conversation'; end if;
  if c.status = 'requested' then
    if new.sender_id <> c.requester_id or exists (select 1 from business.messages where conversation_id = c.id) then
      raise exception 'Waiting for the other member to accept your request';
    end if;
  elsif c.status = 'more_info' then
    if (select count(*) from business.messages where conversation_id = c.id and sender_id = new.sender_id) >= 4 then
      raise exception 'Waiting for the other member to decide';
    end if;
  elsif c.status <> 'accepted' then
    raise exception 'This conversation is closed';
  end if;
  if public.is_blocked_between(c.requester_id, c.recipient_id) then raise exception 'This conversation is closed'; end if;
  f := case when c.status = 'accepted' then business.financial_shield(new.body) else public.shield_findings(new.body) end;
  if cardinality(f) > 0 then raise exception 'SAFETY_SHIELD:%', array_to_string(f, ',') using errcode = 'P0001'; end if;
  if (select count(*) from regexp_matches(new.body, 'https?://', 'g')) > 3 then raise exception 'Too many links in one message'; end if;
  new.read_at := null;
  update business.conversations set last_message_at = now() where id = c.id;
  return new;
end;
$$;
create trigger regulated_business_messages before insert on business.messages for each row execute function business.regulated_guard();

-- Conversation updates: the recipient accepts (to discuss only), declines or asks for more information; either party may
-- withdraw or close; nobody can reopen a declined, withdrawn or blocked conversation.
create or replace function business.guard_conversation()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if new.requester_id <> old.requester_id or new.recipient_id <> old.recipient_id or new.post_id is distinct from old.post_id
     or new.kind <> old.kind or new.proposal_id is distinct from old.proposal_id or new.proposal_version is distinct from old.proposal_version then
    raise exception 'Conversation participants cannot change';
  end if;
  if (new.project, new.reason, new.shared_info, new.purpose) is distinct from (old.project, old.reason, old.shared_info, old.purpose)
     and (auth.uid() is distinct from old.requester_id or old.status not in ('requested', 'more_info')) then
    raise exception 'Not permitted';
  end if;
  if new.status is distinct from old.status then
    if old.status in ('declined', 'blocked', 'withdrawn') then raise exception 'This conversation is closed'; end if;
    if new.status in ('accepted', 'declined') and (old.status not in ('requested', 'more_info') or auth.uid() <> old.recipient_id) then
      raise exception 'Only the recipient can accept or decline a request';
    end if;
    if new.status = 'more_info' and (old.status <> 'requested' or auth.uid() <> old.recipient_id) then
      raise exception 'Only the recipient can ask for more information';
    end if;
    if new.status = 'requested' then raise exception 'Not permitted'; end if;
    new.responded_at := coalesce(new.responded_at, now());
  end if;
  if auth.uid() = old.requester_id and new.recipient_saved is distinct from old.recipient_saved then raise exception 'Not permitted'; end if;
  if auth.uid() = old.recipient_id and new.requester_saved is distinct from old.requester_saved then raise exception 'Not permitted'; end if;
  return new;
end;
$$;

-- ─── Deal Room workspace: plan items, communications, audit ─────────────────────────────────
-- space 'shared' is visible to every active participant; space 'private' is an advisor space visible only to one principal
-- (space_owner) and the advisors that principal invited. Legal advice is never shared automatically.
create table business.room_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references business.deal_rooms (id) on delete cascade,
  space text not null default 'shared' check (space in ('shared', 'private')),
  space_owner uuid references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('checklist', 'due_diligence', 'milestone', 'action', 'deadline', 'meeting', 'decision', 'requirement',
    'legal_question', 'financial_question', 'consultation', 'progress_review')),
  title text not null check (char_length(title) between 2 and 200),
  detail text check (char_length(detail) <= 4000),
  due_at timestamptz,
  assigned_to uuid references public.profiles (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'resolved', 'not_applicable')),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((space = 'private') = (space_owner is not null))
);
create trigger touch_room_items before update on business.room_items for each row execute function public.touch_updated_at();
create trigger regulated_room_items before insert or update of title, detail on business.room_items for each row execute function business.regulated_guard();
create trigger shield_room_items before insert or update of title, detail on business.room_items for each row execute function business.financial_shield_guard();
create table business.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references business.deal_rooms (id) on delete cascade,
  space text not null default 'shared' check (space in ('shared', 'private')),
  space_owner uuid references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  check ((space = 'private') = (space_owner is not null))
);
create index room_messages_room on business.room_messages (room_id, created_at);
create trigger regulated_room_messages before insert on business.room_messages for each row execute function business.regulated_guard();
create trigger shield_room_messages before insert on business.room_messages for each row execute function business.financial_shield_guard();

-- Can this participant see something placed in a given space?
create or replace function business.in_space(room uuid, sp text, sp_owner uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = business, public as $$
  select business.room_role(room, uid) is not null and (sp = 'shared' or business.room_side(room, uid) = sp_owner);
$$;
grant execute on function business.in_space(uuid, text, uuid, uuid) to authenticated;
create or replace function business.guard_room_content()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare j jsonb := to_jsonb(new); actor uuid := coalesce((j ->> 'created_by')::uuid, (j ->> 'sender_id')::uuid, (j ->> 'uploaded_by')::uuid);
begin
  if auth.uid() is not null then
    if actor <> auth.uid() then raise exception 'Not permitted'; end if;
    if not business.in_space(new.room_id, j ->> 'space', (j ->> 'space_owner')::uuid) then raise exception 'You are not part of this space.'; end if;
  end if;
  return new;
end $$;
create trigger guard_room_items before insert on business.room_items for each row execute function business.guard_room_content();
create trigger guard_room_messages before insert on business.room_messages for each row execute function business.guard_room_content();

create table business.room_audit (
  id bigint generated always as identity primary key,
  room_id uuid not null references business.deal_rooms (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) <= 60),
  target text check (char_length(target) <= 200),
  created_at timestamptz not null default now()
);
create or replace function business.audit_room()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare j jsonb := to_jsonb(coalesce(new, old)); room uuid;
begin
  room := coalesce((j ->> 'room_id')::uuid, (select d.room_id from business.room_documents d where d.id = (j ->> 'document_id')::uuid));
  if room is not null then
    insert into business.room_audit (room_id, actor_id, action, target)
      values (room, auth.uid(), tg_table_name || '.' || lower(tg_op) || coalesce('.' || (j ->> 'status'), ''), j ->> 'id');
  end if;
  return null;
end $$;
create trigger audit_room_participants after insert or update on business.room_participants for each row execute function business.audit_room();
create trigger cascade_withdrawal after update of status on business.room_participants for each row execute function business.cascade_withdrawal();

-- ─── Legal & Business Document Vault and Attorney Review Center (28 §7–8, 29 §8) ──────────────
-- Files live in the private 'deal-room-vault' bucket, reachable only through the server after a permission check
-- (signed, short-lived links). Every version is preserved; nothing is overwritten. Until a malware scan marks a version
-- clean, only its uploader can open it (while the owner's scan requirement is on).
create table business.room_documents (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references business.deal_rooms (id) on delete cascade,
  space text not null default 'shared' check (space in ('shared', 'private')),
  space_owner uuid references public.profiles (id) on delete cascade,
  audience uuid[] check (audience is null or cardinality(audience) <= 50),
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('proposal', 'business_plan', 'development_plan', 'confidentiality_agreement', 'letter_of_intent',
    'memorandum_of_understanding', 'formation_document', 'operating_agreement', 'partnership_agreement', 'shareholder_agreement',
    'personal_financial_statement', 'business_financial_statement', 'tax_return', 'bank_statement', 'proof_of_funds', 'debt_schedule',
    'financing_application', 'financing_document', 'lender_correspondence', 'conditional_approval', 'commitment_letter', 'due_diligence',
    'regulatory_approval', 'purchase_agreement', 'attorney_correspondence', 'final_executed_agreement', 'projection', 'other')),
  title text not null check (char_length(title) between 2 and 200),
  privileged boolean not null default false,
  confidential_financial boolean not null default false,
  ai_assist_allowed boolean not null default false,
  current_version integer not null default 0,
  review_status text not null default 'none' check (review_status in ('none', 'awaiting_review', 'reviewed', 'revision_requested', 'addressed', 'final_authorized')),
  retain_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((space = 'private') = (space_owner is not null)),
  check (not privileged or space = 'private')
);
create trigger touch_room_documents before update on business.room_documents for each row execute function public.touch_updated_at();
create trigger regulated_room_documents before insert or update of title on business.room_documents for each row execute function business.regulated_guard();
create trigger guard_room_documents before insert on business.room_documents for each row execute function business.guard_room_content();
create or replace function business.guard_document()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if tg_op = 'INSERT' then
    new.confidential_financial := new.confidential_financial or new.category in ('personal_financial_statement', 'business_financial_statement',
      'tax_return', 'bank_statement', 'proof_of_funds', 'debt_schedule', 'financing_application');
    new.review_status := 'none'; new.current_version := 0;
  else
    if new.room_id <> old.room_id or new.uploaded_by <> old.uploaded_by or new.space <> old.space or new.space_owner is distinct from old.space_owner then
      raise exception 'Document placement cannot change; upload a copy to another space instead.';
    end if;
    -- Review status is set by human advisors through business.document_reviews, never directly.
    if new.review_status is distinct from old.review_status and auth.uid() is not null and current_setting('business.review_write', true) is distinct from 'on' then
      raise exception 'Review status is recorded by the reviewing professional.';
    end if;
    if auth.uid() is not null and auth.uid() <> old.uploaded_by and (new.audience, new.title, new.category, new.privileged, new.ai_assist_allowed, new.retain_until)
       is distinct from (old.audience, old.title, old.category, old.privileged, old.ai_assist_allowed, old.retain_until) then
      raise exception 'Only the person who uploaded a document controls its permissions.';
    end if;
  end if;
  -- AI assistance with privileged material requires the owner's recorded privacy and legal review.
  if new.ai_assist_allowed and new.privileged and not (select privileged_ai_processing_approved from business.suite_settings) then
    raise exception 'Journey assistance with privileged material is not available yet.';
  end if;
  return new;
end $$;
create trigger guard_document before insert or update on business.room_documents for each row execute function business.guard_document();
create trigger audit_room_documents after insert or update or delete on business.room_documents for each row execute function business.audit_room();

create or replace function business.can_see_document(doc uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = business, public as $$
  select exists (select 1 from business.room_documents d where d.id = doc
    and business.in_space(d.room_id, d.space, d.space_owner, uid)
    and (d.uploaded_by = uid or d.audience is null or uid = any (d.audience)
         or (d.space = 'private' and business.room_side(d.room_id, uid) = uid)));
$$;
grant execute on function business.can_see_document(uuid, uuid) to authenticated;

create table business.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references business.room_documents (id) on delete cascade,
  version integer not null check (version >= 1),
  storage_path text not null unique check (char_length(storage_path) <= 500),
  file_name text not null check (char_length(file_name) <= 255),
  mime_type text not null check (mime_type in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  scan_status text not null default 'pending' check (scan_status in ('pending', 'clean', 'infected', 'error')),
  scanned_at timestamptz,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (document_id, version)
);
create or replace function business.guard_document_version()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare d business.room_documents; lim integer;
begin
  if tg_op = 'UPDATE' then
    if auth.uid() is not null then raise exception 'Uploaded versions are preserved as originals.'; end if;
    if (new.document_id, new.version, new.storage_path, new.sha256, new.size_bytes, new.uploaded_by) is distinct from
       (old.document_id, old.version, old.storage_path, old.sha256, old.size_bytes, old.uploaded_by) then raise exception 'Originals cannot change.'; end if;
    return new;
  end if;
  select * into d from business.room_documents where id = new.document_id;
  if auth.uid() is not null then
    if new.uploaded_by <> auth.uid() or not business.can_see_document(d.id) then raise exception 'Not permitted'; end if;
    -- Advisors upload into the space of the principal they represent (or shared space); never into another party's private space.
    new.scan_status := 'pending'; new.scanned_at := null;
  end if;
  select vault_max_mb into lim from business.suite_settings;
  if new.size_bytes > lim::bigint * 1048576 then raise exception 'This file is larger than the vault allows.'; end if;
  new.version := coalesce((select max(version) from business.document_versions where document_id = new.document_id), 0) + 1;
  new.storage_path := 'r/' || d.room_id || '/' || d.id || '/v' || new.version || '-' || new.sha256;
  perform set_config('business.review_write', 'on', true);
  update business.room_documents set current_version = new.version, review_status = case when review_status = 'none' then 'none' else 'awaiting_review' end where id = d.id;
  perform set_config('business.review_write', 'off', true);
  return new;
end $$;
create trigger guard_document_version before insert or update on business.document_versions for each row execute function business.guard_document_version();
create trigger audit_document_versions after insert or update on business.document_versions for each row execute function business.audit_room();

-- Attorney Review Center: review requests, comments and review decisions by human professionals.
create table business.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references business.room_documents (id) on delete cascade,
  version integer not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('review_requested', 'comment', 'information_requested', 'revision_proposed', 'reviewed', 'revision_required',
    'addressed', 'final_authorized')),
  note text check (char_length(note) <= 6000),
  created_at timestamptz not null default now()
);
create trigger regulated_document_reviews before insert on business.document_reviews for each row execute function business.regulated_guard();
create trigger shield_document_reviews before insert on business.document_reviews for each row execute function business.financial_shield_guard();
create or replace function business.guard_document_review()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare d business.room_documents; me uuid := auth.uid(); p business.room_participants;
begin
  -- Journey and other automated processes (no signed-in person) can never record a review decision.
  if me is null or new.author_id <> me then raise exception 'Reviews are recorded by the reviewing professional personally.'; end if;
  select * into d from business.room_documents where id = new.document_id;
  if not business.can_see_document(d.id) then raise exception 'Not permitted'; end if;
  if not exists (select 1 from business.document_versions v where v.document_id = d.id and v.version = new.version) then raise exception 'Unknown version'; end if;
  select * into p from business.room_participants where room_id = d.room_id and user_id = me and status = 'active';
  if new.kind in ('reviewed', 'revision_required', 'addressed') and not (p.role = 'advisor' and p.advisor_type in ('attorney', 'accountant')) then
    raise exception 'Only an attorney or accountant in this Deal Room can record a review decision.';
  end if;
  if new.kind = 'final_authorized' and not (p.role = 'advisor' and p.advisor_type = 'attorney') then
    raise exception 'Only an attorney can identify a document as an authorized final document.';
  end if;
  perform set_config('business.review_write', 'on', true);
  update business.room_documents set review_status = case new.kind
      when 'review_requested' then 'awaiting_review' when 'reviewed' then 'reviewed' when 'revision_required' then 'revision_requested'
      when 'addressed' then 'addressed' when 'final_authorized' then 'final_authorized' else review_status end
    where id = d.id;
  perform set_config('business.review_write', 'off', true);
  return new;
end $$;
create trigger guard_document_review before insert on business.document_reviews for each row execute function business.guard_document_review();
create trigger audit_document_reviews after insert on business.document_reviews for each row execute function business.audit_room();

insert into storage.buckets (id, name, public) values ('deal-room-vault', 'deal-room-vault', false) on conflict (id) do nothing;
do $$ begin
  update storage.buckets set file_size_limit = 104857600,
    allowed_mime_types = array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/jpeg', 'image/png']
  where id = 'deal-room-vault';
exception when undefined_column then null; end $$;
-- No storage policies for members: every read and write goes through the server after business.can_see_document.

-- ─── Capital & Funding Intelligence Center (27 §2, 29) ──────────────────────────────────────
create table business.funding_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  room_id uuid references business.deal_rooms (id) on delete set null,
  assignment_id uuid references public.intel_assignments (id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  kind text not null check (kind in ('startup', 'acquisition', 'expansion', 'equipment', 'real_estate', 'franchise', 'working_capital', 'other')),
  -- Funding discovery answers; every value carries its basis ('self_reported', 'document', 'verified').
  assessment jsonb not null default '{}' check (jsonb_typeof(assessment) = 'object'),
  missing jsonb not null default '[]' check (jsonb_typeof(missing) = 'array'),
  stage text not null default 'assessment' check (stage in ('assessment', 'strategy', 'research', 'package', 'applications', 'funded', 'improvement', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_funding_projects before update on business.funding_projects for each row execute function public.touch_updated_at();
create trigger regulated_funding_projects before insert or update of title on business.funding_projects for each row execute function business.regulated_guard();
create or replace function business.guard_funding_project()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare lvl text; lim integer; n integer;
begin
  if tg_op = 'INSERT' then
    lvl := public.intel_level(new.user_id);
    if lvl is null then raise exception 'The Capital & Funding Intelligence Center is part of Executive Private and Elite Concierge.'; end if;
    select case lvl when 'elite' then elite_funding_projects else executive_funding_projects end into lim from business.suite_settings;
    select count(*) into n from business.funding_projects where user_id = new.user_id and stage not in ('closed', 'funded');
    if n >= lim then raise exception 'You have reached the number of active funding projects included in your membership.'; end if;
  elsif new.user_id <> old.user_id then raise exception 'Not permitted';
  end if;
  if new.room_id is not null and business.room_role(new.room_id, new.user_id) is null then raise exception 'Link a Deal Room you participate in.'; end if;
  return new;
end $$;
create trigger guard_funding_project before insert or update on business.funding_projects for each row execute function business.guard_funding_project();

-- Funding scenarios: sources and uses, repayment estimates and risks (estimates are labeled; nothing is a commitment).
create table business.funding_scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references business.funding_projects (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  uses jsonb not null default '[]' check (jsonb_typeof(uses) = 'array'),
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  assumptions jsonb not null default '[]' check (jsonb_typeof(assumptions) = 'array'),
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_funding_scenarios before update on business.funding_scenarios for each row execute function public.touch_updated_at();

-- Funding positions keep the four categories apart. Members record declared funds and their own commitments; a verified balance
-- or approved financing is submitted with evidence and only becomes 'verified' through review (never from income or net worth).
create table business.funding_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references business.funding_projects (id) on delete cascade,
  category text not null check (category in ('declared', 'verified_balance', 'approved_financing', 'committed')),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  as_of date not null default current_date,
  method text not null check (method in ('self_reported', 'bank_connection', 'lender_letter', 'professional_letter', 'member_attestation')),
  document_id uuid references business.room_documents (id) on delete set null,
  status text not null default 'recorded' check (status in ('recorded', 'pending_review', 'verified', 'not_verified', 'expired', 'withdrawn')),
  expires_on date,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  check ((category = 'declared') = (method = 'self_reported')),
  check ((category = 'committed') = (method = 'member_attestation')),
  check (category in ('declared', 'committed') or method in ('bank_connection', 'lender_letter', 'professional_letter'))
);
create or replace function business.guard_funding_position()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if public.is_owner() and tg_op = 'UPDATE' and auth.uid() <> old.user_id then
    -- The owner reviews submitted evidence only; amounts and categories never change in review.
    if old.status <> 'pending_review' or (new.amount_cents, new.category, new.method, new.as_of, new.user_id) is distinct from (old.amount_cents, old.category, old.method, old.as_of, old.user_id)
       or new.status not in ('verified', 'not_verified') then raise exception 'Not permitted'; end if;
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
    if new.status = 'verified' then new.expires_on := coalesce(new.expires_on, old.as_of + 30); end if;
    return new;
  end if;
  if auth.uid() is not null then
    if new.user_id <> auth.uid() then raise exception 'Not permitted'; end if;
    if tg_op = 'INSERT' then
      new.status := case when new.category in ('declared', 'committed') then 'recorded' else 'pending_review' end;
      new.reviewed_by := null; new.reviewed_at := null;
      if new.category in ('verified_balance', 'approved_financing') and new.document_id is null and new.method <> 'bank_connection' then
        raise exception 'Attach the lender or professional letter for review.';
      end if;
    else
      if (new.amount_cents, new.category, new.method, new.as_of) is distinct from (old.amount_cents, old.category, old.method, old.as_of) and old.status in ('verified', 'pending_review') then
        raise exception 'Record a new entry instead of changing reviewed information.';
      end if;
      if new.status is distinct from old.status and new.status <> 'withdrawn' then raise exception 'Not permitted'; end if;
      if new.reviewed_by is distinct from old.reviewed_by then raise exception 'Not permitted'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger guard_funding_position before insert or update on business.funding_positions for each row execute function business.guard_funding_position();

-- Sharing funding readiness into a Deal Room is explicit, per room, and revocable; principals see the summary only.
create table business.room_funding_shares (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references business.deal_rooms (id) on delete cascade,
  position_id uuid not null references business.funding_positions (id) on delete cascade,
  shared_by uuid not null references public.profiles (id) on delete cascade,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (room_id, position_id)
);
create or replace function business.guard_funding_share()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' and (new.shared_by <> auth.uid() or business.room_role(new.room_id) not in ('owner', 'principal')
       or not exists (select 1 from business.funding_positions p where p.id = new.position_id and p.user_id = auth.uid())) then
      raise exception 'Only you can share your own funding information, in a Deal Room where you are a business participant.';
    end if;
    if tg_op = 'UPDATE' and (old.shared_by <> auth.uid() or new.position_id <> old.position_id or new.room_id <> old.room_id) then raise exception 'Not permitted'; end if;
  end if;
  return new;
end $$;
create trigger guard_funding_share before insert or update on business.room_funding_shares for each row execute function business.guard_funding_share();

-- Funding Application Tracker: lender decisions need supporting evidence and are entered by the member (never automatic).
create table business.funding_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references business.funding_projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_name text not null check (char_length(provider_name) between 2 and 200),
  provider_url text check (provider_url ~ '^https://' and char_length(provider_url) <= 1000),
  product text check (char_length(product) <= 200),
  amount_requested_cents bigint check (amount_requested_cents >= 0),
  status text not null default 'researching' check (status in ('researching', 'preparing_documents', 'ready_for_professional_review',
    'ready_to_apply', 'submitted_by_member', 'awaiting_lender', 'documents_requested', 'under_lender_review', 'conditionally_approved',
    'approved', 'declined', 'withdrawn', 'funded')),
  evidence_document_id uuid references business.room_documents (id) on delete set null,
  decision_note text check (char_length(decision_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_funding_applications before update on business.funding_applications for each row execute function public.touch_updated_at();
create table business.funding_application_history (
  id bigint generated always as identity primary key,
  application_id uuid not null references business.funding_applications (id) on delete cascade,
  status text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  evidence_document_id uuid,
  created_at timestamptz not null default now()
);
create or replace function business.guard_funding_application()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if auth.uid() is null then raise exception 'Lender decisions are recorded by the member, never automatically.'; end if;
  if new.user_id <> auth.uid() or not exists (select 1 from business.funding_projects p where p.id = new.project_id and p.user_id = auth.uid()) then
    raise exception 'Not permitted';
  end if;
  if new.status in ('conditionally_approved', 'approved', 'funded') and new.evidence_document_id is null then
    raise exception 'Attach the lender''s letter or confirmation before marking financing as approved or funded.';
  end if;
  if new.evidence_document_id is not null and not exists (select 1 from business.room_documents d where d.id = new.evidence_document_id and d.uploaded_by = auth.uid()) then
    raise exception 'Attach a document you uploaded.';
  end if;
  return new;
end $$;
create trigger guard_funding_application before insert or update on business.funding_applications for each row execute function business.guard_funding_application();
create or replace function business.log_funding_application()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into business.funding_application_history (application_id, status, changed_by, evidence_document_id) values (new.id, new.status, auth.uid(), new.evidence_document_id);
  end if;
  return null;
end $$;
create trigger log_funding_application after insert or update on business.funding_applications for each row execute function business.log_funding_application();

-- Funding Communication Center: drafts the member authorizes and sends personally (no automatic external sending).
create table business.funding_communications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references business.funding_projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('inquiry', 'preparation', 'information_request', 'clarification', 'meeting_preparation', 'follow_up', 'document_response')),
  recipient text not null check (char_length(recipient) between 2 and 200),
  subject text not null check (char_length(subject) between 2 and 200),
  body text not null check (char_length(body) between 10 and 8000),
  status text not null default 'draft' check (status in ('draft', 'authorized', 'sent_by_member', 'archived')),
  authorized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_funding_communications before update on business.funding_communications for each row execute function public.touch_updated_at();
create trigger regulated_funding_communications before insert or update of subject, body on business.funding_communications for each row execute function business.regulated_guard();
create trigger shield_funding_communications before insert or update of subject, body on business.funding_communications for each row execute function business.financial_shield_guard();

-- Funding resource library (owner-approved, sourced, dated) and professional referrals with affiliate disclosure.
create table business.funding_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  kind text not null check (kind in ('sba', 'commercial_lending', 'line_of_credit', 'equipment', 'commercial_real_estate', 'franchise',
    'seller_financing_education', 'cdfi', 'government_program', 'grant', 'corporate_sponsorship', 'international', 'equity_education', 'other')),
  official_url text not null check (official_url ~ '^https://' and char_length(official_url) <= 1000),
  jurisdiction text not null default 'US-federal' check (char_length(jurisdiction) <= 40),
  summary text not null check (char_length(summary) <= 4000),
  requirements jsonb not null default '[]' check (jsonb_typeof(requirements) = 'array'),
  limitations text check (char_length(limitations) <= 2000),
  licensing_note text check (char_length(licensing_note) <= 1000),
  verified_on date not null,
  review_by date,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  prepared_by text not null default 'peace',
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create or replace function business.guard_funding_resource()
returns trigger language plpgsql security definer set search_path = business, public as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then
    if not public.is_owner() then raise exception 'Only the owner approves funding resources.'; end if;
    new.approved_by := auth.uid(); new.approved_at := now();
  end if;
  return new;
end $$;
create trigger guard_funding_resource before insert or update on business.funding_resources for each row execute function business.guard_funding_resource();

create table business.professional_referrals (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  services text[] not null default '{}' check (services <@ array['accounting', 'tax', 'legal', 'business_advisory', 'financing_preparation', 'bookkeeping']::text[]),
  affiliated boolean not null,
  affiliation_disclosure text check (char_length(affiliation_disclosure) <= 2000),
  fee_disclosure text not null check (char_length(fee_disclosure) between 10 and 2000),
  website text check (website ~ '^https://'),
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  created_at timestamptz not null default now(),
  check (not affiliated or char_length(btrim(coalesce(affiliation_disclosure, ''))) >= 20)
);
insert into business.professional_referrals (name, services, affiliated, affiliation_disclosure, fee_disclosure, status) values
  ('T. Turner & Associates, LLC', array['accounting', 'tax', 'bookkeeping', 'business_advisory']::text[], true,
   'T. Turner & Associates, LLC has an affiliated business relationship with The Art of Connect, LLC. You are never required to use an affiliated provider, and choosing another professional does not affect your membership. [Owner to confirm the nature of the affiliation and any compensation before approval.]',
   'Professional services are provided under the firm''s own engagement terms and fees, which are separate from your membership.',
   'draft')
on conflict do nothing;

-- ─── Intelligence Division additions: credibility, funding research, corrections, funding watchlist ─
alter table public.intel_assignments drop constraint if exists intel_assignments_category_check;
alter table public.intel_assignments add constraint intel_assignments_category_check check (category in ('sports-ownership', 'leadership-discovery',
  'business-acquisition', 'international-expansion', 'supplier-discovery', 'board-advisory', 'retirement-legacy', 'business-ownership', 'collaboration',
  'business-credibility', 'funding-resources', 'funding-providers', 'proposal-research', 'other'));
alter table public.intel_findings drop constraint if exists intel_findings_verification_check;
alter table public.intel_findings add constraint intel_findings_verification_check check (verification in ('confirmed', 'corroborated', 'unverified',
  'conflicting', 'outdated', 'suggestion', 'self_reported', 'unresolved_concern', 'not_established'));
alter table public.intel_findings drop constraint if exists intel_findings_kind_check;
alter table public.intel_findings add constraint intel_findings_kind_check check (kind in ('opportunity', 'organization', 'person', 'requirement',
  'financial', 'risk', 'regulatory', 'resource', 'note', 'credibility', 'funding_provider', 'funding_program'));
alter table public.intel_watchlist add column focus text not null default 'opportunity' check (focus in ('opportunity', 'funding'));

-- Correction and review process for research findings (27 §1).
create table public.intel_corrections (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid references public.intel_findings (id) on delete set null,
  requested_by uuid references public.profiles (id) on delete set null,
  subject text not null check (char_length(subject) between 2 and 200),
  explanation text not null check (char_length(explanation) between 10 and 4000),
  evidence_url text check (evidence_url ~ '^https://' and char_length(evidence_url) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'corrected', 'upheld', 'withdrawn')),
  resolution text check (char_length(resolution) <= 4000),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create trigger shield_intel_corrections before insert on public.intel_corrections for each row execute function public.shield_guard();

-- Can this viewer open (download) a file version? Requires document access and, while the owner's scan requirement is on,
-- a clean malware scan (the uploader can always reopen their own upload).
create or replace function business.can_open_version(vid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = business, public as $$
  select exists (select 1 from business.document_versions v where v.id = vid and business.can_see_document(v.document_id, uid)
    and v.scan_status <> 'infected'
    and (v.scan_status = 'clean' or v.uploaded_by = uid or not (select vault_scan_required from business.suite_settings)));
$$;
grant execute on function business.can_open_version(uuid, uuid) to authenticated, service_role;

-- ─── Row-level security ──────────────────────────────────────────────────────────────────────
alter table business.suite_settings enable row level security;
alter table business.regulated_restrictions enable row level security;
alter table business.deal_rooms enable row level security;
alter table business.room_participants enable row level security;
alter table business.advisor_invites enable row level security;
alter table business.advisor_credentials enable row level security;
alter table business.proposals enable row level security;
alter table business.proposal_versions enable row level security;
alter table business.proposal_responses enable row level security;
alter table business.room_items enable row level security;
alter table business.room_messages enable row level security;
alter table business.room_audit enable row level security;
alter table business.room_documents enable row level security;
alter table business.document_versions enable row level security;
alter table business.document_reviews enable row level security;
alter table business.funding_projects enable row level security;
alter table business.funding_scenarios enable row level security;
alter table business.funding_positions enable row level security;
alter table business.room_funding_shares enable row level security;
alter table business.funding_applications enable row level security;
alter table business.funding_application_history enable row level security;
alter table business.funding_communications enable row level security;
alter table business.funding_resources enable row level security;
alter table business.professional_referrals enable row level security;
alter table public.intel_corrections enable row level security;

create policy "read" on business.suite_settings for select to authenticated using (true);
create policy "owner manages" on business.suite_settings for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "read" on business.regulated_restrictions for select to authenticated using (true);
create policy "owner manages" on business.regulated_restrictions for update to authenticated using (public.is_owner()) with check (public.is_owner());

create policy "participants" on business.deal_rooms for select to authenticated
  using (business.room_role(id) is not null or exists (select 1 from business.room_participants p where p.room_id = id and p.user_id = auth.uid() and p.status = 'invited'));
create policy "create" on business.deal_rooms for insert to authenticated with check (owner_id = auth.uid());
create policy "owner edits" on business.deal_rooms for update to authenticated using (business.room_role(id) = 'owner') with check (business.room_role(id) = 'owner');

create policy "participants" on business.room_participants for select to authenticated using (user_id = auth.uid() or business.room_role(room_id) is not null);
create policy "owner invites" on business.room_participants for insert to authenticated with check (role = 'principal' and business.room_role(room_id) = 'owner');
create policy "update" on business.room_participants for update to authenticated using (user_id = auth.uid() or business.room_role(room_id) is not null)
  with check (user_id = auth.uid() or business.room_role(room_id) is not null);

create policy "own invitations" on business.advisor_invites for select to authenticated using (client_id = auth.uid());
create policy "invite" on business.advisor_invites for insert to authenticated with check (client_id = auth.uid());
create policy "revoke" on business.advisor_invites for update to authenticated using (client_id = auth.uid()) with check (client_id = auth.uid());

create policy "own, room, owner" on business.advisor_credentials for select to authenticated
  using (user_id = auth.uid() or public.is_owner() or exists (select 1 from business.room_participants a join business.room_participants b on a.room_id = b.room_id
    where a.user_id = advisor_credentials.user_id and a.status = 'active' and b.user_id = auth.uid() and b.status = 'active'));
create policy "submit" on business.advisor_credentials for insert to authenticated with check (user_id = auth.uid());
create policy "update" on business.advisor_credentials for update to authenticated using (user_id = auth.uid() or public.is_owner()) with check (user_id = auth.uid() or public.is_owner());

create policy "see" on business.proposals for select to authenticated using (business.can_see_proposal(id));
create policy "create" on business.proposals for insert to authenticated with check (author_id = auth.uid() and public.intel_level(auth.uid()) is not null
  and (room_id is null or business.room_role(room_id) in ('owner', 'principal')));
create policy "author" on business.proposals for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "see" on business.proposal_versions for select to authenticated using (author_id = auth.uid() or (status <> 'draft' and business.can_see_proposal(proposal_id)));
create policy "author writes" on business.proposal_versions for insert to authenticated with check (author_id = auth.uid());
create policy "author edits" on business.proposal_versions for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "see" on business.proposal_responses for select to authenticated using (business.can_see_proposal(proposal_id));
create policy "respond" on business.proposal_responses for insert to authenticated with check (responder_id = auth.uid() and business.can_see_proposal(proposal_id)
  and not exists (select 1 from business.proposals p where p.id = proposal_id and p.author_id = auth.uid()));

create policy "space" on business.room_items for select to authenticated using (business.in_space(room_id, space, space_owner));
create policy "add" on business.room_items for insert to authenticated with check (created_by = auth.uid());
create policy "update" on business.room_items for update to authenticated using (business.in_space(room_id, space, space_owner)) with check (business.in_space(room_id, space, space_owner));
create policy "remove own" on business.room_items for delete to authenticated using (created_by = auth.uid());
create policy "space" on business.room_messages for select to authenticated using (business.in_space(room_id, space, space_owner));
create policy "send" on business.room_messages for insert to authenticated with check (sender_id = auth.uid());
create policy "principals" on business.room_audit for select to authenticated using (business.room_role(room_id) in ('owner', 'principal'));

create policy "see" on business.room_documents for select to authenticated using (business.can_see_document(id));
create policy "upload" on business.room_documents for insert to authenticated with check (uploaded_by = auth.uid());
create policy "update" on business.room_documents for update to authenticated using (business.can_see_document(id)) with check (business.room_role(room_id) is not null);
create policy "see" on business.document_versions for select to authenticated using (business.can_see_document(document_id));
create policy "upload" on business.document_versions for insert to authenticated with check (uploaded_by = auth.uid());
create policy "see" on business.document_reviews for select to authenticated using (business.can_see_document(document_id));
create policy "review" on business.document_reviews for insert to authenticated with check (author_id = auth.uid());

create policy "own" on business.funding_projects for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own" on business.funding_scenarios for all to authenticated
  using (exists (select 1 from business.funding_projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from business.funding_projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "own" on business.funding_positions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner reviews evidence" on business.funding_positions for select to authenticated using (public.is_owner() and status in ('pending_review', 'verified', 'not_verified'));
create policy "owner records review" on business.funding_positions for update to authenticated using (public.is_owner() and status = 'pending_review') with check (public.is_owner());
create policy "shared into my rooms" on business.funding_positions for select to authenticated
  using (exists (select 1 from business.room_funding_shares s where s.position_id = id and s.revoked_at is null and business.room_role(s.room_id) in ('owner', 'principal')));
create policy "see" on business.room_funding_shares for select to authenticated using (shared_by = auth.uid() or business.room_role(room_id) in ('owner', 'principal'));
create policy "share" on business.room_funding_shares for insert to authenticated with check (shared_by = auth.uid());
create policy "revoke" on business.room_funding_shares for update to authenticated using (shared_by = auth.uid()) with check (shared_by = auth.uid());
create policy "own" on business.funding_applications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own" on business.funding_application_history for select to authenticated
  using (exists (select 1 from business.funding_applications a where a.id = application_id and a.user_id = auth.uid()));
create policy "own" on business.funding_communications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members read approved" on business.funding_resources for select to authenticated
  using ((status = 'approved' and public.intel_level(auth.uid()) is not null) or public.has_staff_role(array['owner', 'executive']::public.staff_role[]));
create policy "manage" on business.funding_resources for all to authenticated
  using (public.has_staff_role(array['owner', 'executive']::public.staff_role[])) with check (public.has_staff_role(array['owner', 'executive']::public.staff_role[]));
create policy "read approved" on business.professional_referrals for select to authenticated using (status = 'approved' or public.is_owner());
create policy "owner manages" on business.professional_referrals for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "request" on public.intel_corrections for insert to authenticated with check (requested_by = auth.uid() and status = 'open');
create policy "own or owner" on public.intel_corrections for select to authenticated using (requested_by = auth.uid() or public.is_owner());
create policy "owner resolves" on public.intel_corrections for update to authenticated using (public.is_owner()) with check (public.is_owner());

grant select, insert, update, delete on business.suite_settings, business.regulated_restrictions, business.deal_rooms, business.room_participants,
  business.advisor_invites, business.advisor_credentials, business.proposals, business.proposal_versions, business.proposal_responses, business.room_items,
  business.room_messages, business.room_documents, business.document_versions, business.document_reviews, business.funding_projects,
  business.funding_scenarios, business.funding_positions, business.room_funding_shares, business.funding_applications, business.funding_communications,
  business.funding_resources, business.professional_referrals to authenticated;
grant select on business.room_audit, business.funding_application_history to authenticated;
grant select, insert, update on public.intel_corrections to authenticated;
grant all on all tables in schema business to service_role;
grant usage, select on all sequences in schema business to service_role;
grant all on public.intel_corrections to service_role;
grant execute on function business.is_restricted(text) to authenticated, service_role;

-- Owner oversight: aggregates only, never documents, messages, proposals or financial details.
create or replace function business.suite_metrics()
returns jsonb language plpgsql stable security definer set search_path = business, public as $$
begin
  if not public.has_staff_role(array['owner', 'executive']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  return jsonb_build_object(
    'deal_rooms_active', (select count(*) from business.deal_rooms where status = 'active'),
    'participants', coalesce((select jsonb_object_agg(role, n) from (select role, count(*) n from business.room_participants where status = 'active' group by 1) s), '{}'),
    'advisors_by_type', coalesce((select jsonb_object_agg(advisor_type, n) from (select advisor_type, count(*) n from business.room_participants where role = 'advisor' and status = 'active' group by 1) s), '{}'),
    'advisor_invites_pending', (select count(*) from business.advisor_invites where status = 'pending'),
    'credentials_awaiting_review', (select count(*) from business.advisor_credentials where status = 'submitted'),
    'collaboration_profiles', (select count(*) from business.profiles where collab_opt_in),
    'collaboration_requests', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from business.conversations where kind <> 'connection' group by 1) s), '{}'),
    'proposals', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from business.proposals group by 1) s), '{}'),
    'documents', (select count(*) from business.room_documents),
    'versions_awaiting_scan', (select count(*) from business.document_versions where scan_status = 'pending'),
    'versions_infected', (select count(*) from business.document_versions where scan_status = 'infected'),
    'funding_projects', (select count(*) from business.funding_projects where stage not in ('closed')),
    'applications', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from business.funding_applications group by 1) s), '{}'),
    'funding_evidence_awaiting_review', (select count(*) from business.funding_positions where status = 'pending_review'),
    'funding_resources_draft', (select count(*) from business.funding_resources where status = 'draft'),
    'corrections_open', (select count(*) from public.intel_corrections where status in ('open', 'reviewing')),
    'reports_open', (select count(*) from business.reports where status in ('open', 'reviewing')),
    'restrictions', (select jsonb_object_agg(key, restricted) from business.regulated_restrictions)
  );
end $$;
grant execute on function business.suite_metrics() to authenticated;

-- ─── Feature registry, Development Tracker and QA (honest stages: nothing operational) ───────
insert into business.features (key, name, description, guest, free, premium, status, sort_order) values
  ('collaboration_requests', 'Business Collaboration Requests', 'Purpose-specific collaboration requests and proposals in your business inbox (Executive Private and Elite).', false, false, true, 'coming_soon', 60),
  ('deal_rooms', 'Private Business Deal Rooms', 'Confidential project workspaces with advisors, Attorney Review Center and Document Vault (Executive Private and Elite).', false, false, true, 'coming_soon', 61),
  ('proposal_builder', 'Strategic Business Proposal Builder', 'Journey-guided, versioned, nonbinding discussion proposals (Executive Private and Elite).', false, false, true, 'coming_soon', 62),
  ('funding_center', 'Capital & Funding Intelligence Center', 'Funding assessments, scenarios, packages, readiness checklists and application tracking (Executive Private and Elite).', false, false, true, 'coming_soon', 63)
on conflict (key) do nothing;

insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('bd-foundation', 'CONNECT 360', 'Business development suite foundation (directives 27–29)',
   'Database: collaboration profiles and requests on the existing inbox, Deal Rooms with principals and per-party advisors, advisor invitations and credential review, versioned nonbinding proposals with discussion-only responses, Document Vault with preserved versions and scan gating, Attorney Review Center (human review only), funding projects, scenarios, four separate funding categories, application tracker with evidence, communication drafts, funding resources, affiliate-disclosed referrals, research corrections, regulated-activity guard.',
   'built', 'Build the member screens; owner reviews the restrictions and referral disclosure.', 480, true, true, true, false, false, false, null),
  ('bd-credibility', 'CONNECT 360', 'Business credibility research and corrections (directive 27 §1)',
   'Findings labeled confirmed, corroborated, self-reported, unresolved concern or not established; correction requests reviewed by the owner; never presented as a guarantee.',
   'designed', 'Needs research providers enabled and a budget.', 481, true, false, false, false, false, false, 'owner'),
  ('bd-vault-scanning', 'CONNECT 360', 'Document Vault malware scanning',
   'Uploads stay openable only by their uploader until a scan marks them clean. Needs an approved scanning service.',
   'designed', 'Owner: choose and approve a malware scanning service.', 482, true, false, false, false, false, false, 'owner'),
  ('bd-proof-of-funds', 'CONNECT 360', 'Proof-of-funds through Stripe Financial Connections',
   'Separate consent and Stripe Authorized Purpose approval; shares only a dated "at or above" statement; Sandbox only until approved.',
   'designed', 'Owner: request Stripe approval for the new purpose.', 483, true, false, false, false, false, false, 'owner'),
  ('bd-funding-research', 'CONNECT 360', 'Funding resource library and provider research (directive 29 §3–5)',
   'Owner-approved, sourced and dated funding resources; Parallel and Exa research of programs and providers; comparison reports with estimates labeled.',
   'designed', 'Draft the first SBA and federal program entries for owner review.', 484, true, false, false, false, false, false, null),
  ('bd-legal-review', 'CONNECT 360', 'Legal review before sensitive activation (directives 27–29)',
   'Lending, credit reporting, fair lending, brokerage, referral, securities, privilege and privacy review before any regulated or sensitive production capability; restrictions stay on until recorded review.',
   'designed', 'Owner: engage counsel when ready.', 485, true, false, false, false, false, false, 'owner')
on conflict (key) do nothing;

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('bd-regulated-guard', 'professional', 'Regulated activity and fraud guard', 'bd-foundation', null,
    'Investor solicitation, securities, lending, crowdfunding and fees stay restricted; fraud patterns are always blocked.',
    array['Using fictional members, send a business message mentioning guaranteed returns: it is refused.', 'Write "we are seeking investors" in a collaboration request: it is refused while the restriction is on.', 'Discuss "seller financing education" or "an operational partnership": it is allowed.']::text[],
    'Restricted wording is refused everywhere, including private messages.', 480),
  ('bd-deal-room-privacy', 'professional', 'Deal Room privacy and advisor spaces', 'bd-foundation', null,
    'Each party''s advisors see only what that party authorizes; legal advice is never shared automatically.',
    array['Create a Deal Room as a fictional Executive member and invite a principal you have an accepted conversation with.', 'Each principal invites their own fictional attorney; each attorney sees the shared space and only their own client''s private space.', 'Withdraw a principal: their advisors leave and their shared funding information is revoked.', 'Confirm the Owner Portal shows counts only, no documents or messages.']::text[],
    'Participant-, space- and document-level permissions hold.', 481),
  ('bd-funding-categories', 'professional', 'Funding categories and lender decisions', 'bd-foundation', null,
    'Declared, verified balance, approved financing and committed funds stay separate; approvals need evidence.',
    array['Record declared funds: status Recorded, never Verified.', 'Try to mark a fictional application Approved without a lender letter: refused.', 'Owner reviews a fictional lender letter: only the status changes, never the amount.']::text[],
    'No inferred or automatic funding status.', 482)
on conflict (key) do nothing;
