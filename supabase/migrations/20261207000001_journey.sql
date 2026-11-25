-- ════════════════════════════════════════════════════════════════════
-- Journey — AI connection concierge (paid members only)
--   • Owner settings, emergency switch and typed authorization for paid
--     OpenAI usage (both OFF by default)
--   • Approved models with owner-entered rates (no prices in code)
--   • One monthly message allowance per membership (couples share one),
--     daily limits, per-member / per-membership / company spending caps and
--     a separate owner testing budget
--   • Optional message packages (prices unpublished until owner approval)
--     and purchased message balances with owner-set expiry
--   • Usage ledger: requests, tokens and cost — never message content
--   • Atomic reservation: one request in flight per allowance, duplicate
--     requests refused, failed requests never use a message
--   • Versioned instructions with publish and rollback, approved knowledge,
--     example conversations and private owner test runs
--   • Private member conversations: readable only by the member. The owner,
--     staff and other members cannot read them.
-- ════════════════════════════════════════════════════════════════════

-- ─── Settings (single row) ─────────────────────────────────────────
create table public.journey_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  paid_usage_authorized boolean not null default false,
  owner_testing_enabled boolean not null default false,
  company_monthly_limit_cents numeric(12, 4) check (company_monthly_limit_cents >= 0),
  owner_test_monthly_limit_cents numeric(12, 4) check (owner_test_monthly_limit_cents >= 0),
  max_history_messages integer not null default 12 check (max_history_messages between 0 and 50),
  max_history_chars integer not null default 12000 check (max_history_chars between 0 and 60000),
  attachments_enabled boolean not null default false,
  message_packages_published boolean not null default false,
  purchased_message_expiry_days integer check (purchased_message_expiry_days between 1 and 730),
  alert_thresholds integer[] not null default '{50,80,100}',
  default_model text,
  per_minute_requests integer not null default 6 check (per_minute_requests between 1 and 60),
  max_input_chars integer not null default 4000 check (max_input_chars between 200 and 20000),
  enhanced_packages text[] not null default '{executive-private,elite-concierge}',
  entitled_statuses text[] not null default '{active}',
  disabled_capabilities text[] not null default '{}',
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
insert into public.journey_settings (id) values (true);

create table public.journey_models (
  id text primary key check (id ~ '^[A-Za-z0-9._:-]{2,80}$'),
  input_cents_per_million numeric(12, 4) check (input_cents_per_million >= 0),
  output_cents_per_million numeric(12, 4) check (output_cents_per_million >= 0),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.journey_settings add constraint journey_default_model_fk foreign key (default_model) references public.journey_models (id);

create table public.journey_tier_limits (
  package_slug text primary key references public.membership_packages (slug) on delete cascade,
  monthly_messages integer check (monthly_messages >= 0),
  daily_messages integer check (daily_messages >= 0),
  member_monthly_limit_cents numeric(12, 4) check (member_monthly_limit_cents >= 0),
  tier_monthly_limit_cents numeric(12, 4) check (tier_monthly_limit_cents >= 0),
  max_output_tokens integer not null default 700 check (max_output_tokens between 50 and 4000),
  model text references public.journey_models (id),
  updated_at timestamptz not null default now()
);

-- Initial allowances from the founder's directive. Dollar caps stay unset
-- until the owner enters them, so nothing can run before then.
insert into public.journey_tier_limits (package_slug, monthly_messages, daily_messages)
select slug, v.m, greatest(10, v.m / 5) from (values
  ('art-of-becoming', 100), ('professional-society', 125), ('personal-society', 150), ('business-life', 175),
  ('life-love', 200), ('dual-society', 225), ('couples-membership', 250), ('complete-society', 300),
  ('executive-private', 450), ('elite-concierge', 750)) v(slug, m)
join public.membership_packages p using (slug)
on conflict (package_slug) do nothing;

-- Optional message packages. Never purchased automatically.
create table public.journey_message_packages (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  messages integer not null check (messages between 1 and 10000),
  price_cents integer check (price_cents between 0 and 1000000),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.journey_message_packages (slug, messages, price_cents, sort_order) values
  ('messages-25', 25, 499, 10), ('messages-50', 50, 899, 20), ('messages-100', 100, 1499, 30), ('messages-250', 250, 2999, 40);

-- Purchased balances, recorded only from a completed, member-authorized payment (or an owner grant).
create table public.journey_message_credits (
  id uuid primary key default gen_random_uuid(),
  holder_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('purchase', 'owner_grant')),
  package_slug text references public.journey_message_packages (slug),
  messages integer not null check (messages > 0),
  used integer not null default 0 check (used >= 0 and used <= messages),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  stripe_payment_intent_id text unique,
  note text check (length(note) <= 300),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index journey_credits_holder_idx on public.journey_message_credits (holder_id, expires_at);

-- ─── Usage ledger (no message content) ─────────────────────────────
create table public.journey_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Whose allowance this counts against: the member, or the subscriber for a couple's shared allowance.
  holder_id uuid not null references public.profiles (id) on delete cascade,
  -- Client-supplied key; the same message sent twice is refused, not charged twice.
  request_key text not null check (length(request_key) between 8 and 80),
  package_slug text,
  credit_id uuid references public.journey_message_credits (id),
  mode text not null check (mode in ('business', 'life', 'love', 'concierge')),
  model text not null,
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'failed')),
  is_owner_test boolean not null default false,
  reserved_cents numeric(12, 4) not null check (reserved_cents >= 0),
  input_tokens integer,
  output_tokens integer,
  cost_cents numeric(12, 4),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index journey_usage_user_idx on public.journey_usage (user_id, created_at desc);
create unique index journey_usage_request_key on public.journey_usage (holder_id, request_key);
create index journey_usage_holder_idx on public.journey_usage (holder_id, created_at desc);
create index journey_usage_month_idx on public.journey_usage (created_at, package_slug);

-- Effective spend of a row: actual cost once known, otherwise what was reserved.
create or replace function public.journey_row_cents(u public.journey_usage)
returns numeric language sql immutable as $$
  select case when u.status = 'completed' then coalesce(u.cost_cents, u.reserved_cents)
              when u.status = 'failed' then coalesce(u.cost_cents, 0)
              else u.reserved_cents end;
$$;

/**
 * Atomically re-checks every money and message limit and records a
 * reservation. Called only by the server (service role), after the app has
 * checked membership, switches and settings. Returns the usage id, or a
 * reason prefixed with "refused:".
 *   p_period_start: start of the member's current billing period.
 */
create or replace function public.journey_reserve(
  p_user uuid, p_holder uuid, p_request_key text, p_package text, p_mode text, p_model text,
  p_reserve numeric, p_period_start timestamptz, p_owner_test boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare
  s public.journey_settings;
  t public.journey_tier_limits;
  month_start timestamptz := date_trunc('month', now());
  day_start timestamptz := date_trunc('day', now());
  v numeric; n integer; credit uuid;
  new_id bigint;
begin
  -- One lock per allowance holder plus a company-wide lock: concurrent requests queue here.
  perform pg_advisory_xact_lock(hashtext('journey_spend'));
  select * into s from public.journey_settings;
  if not s.enabled or not s.paid_usage_authorized then return 'refused:off'; end if;
  if exists (select 1 from public.journey_usage where holder_id = p_holder and request_key = p_request_key) then return 'refused:duplicate'; end if;
  if exists (select 1 from public.journey_usage where holder_id = p_holder and status = 'reserved' and created_at > now() - interval '5 minutes') then return 'refused:in_flight'; end if;
  if (select count(*) from public.journey_usage where user_id = p_user and created_at > now() - interval '1 minute') >= s.per_minute_requests then return 'refused:rate'; end if;

  if s.company_monthly_limit_cents is null then return 'refused:company_budget_unset'; end if;
  select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u where u.created_at >= month_start;
  if v + p_reserve > s.company_monthly_limit_cents then return 'refused:company_budget'; end if;

  if p_owner_test then
    if s.owner_test_monthly_limit_cents is null then return 'refused:test_budget_unset'; end if;
    select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u where u.created_at >= month_start and u.is_owner_test;
    if v + p_reserve > s.owner_test_monthly_limit_cents then return 'refused:test_budget'; end if;
  else
    select * into t from public.journey_tier_limits where package_slug = p_package;
    if t.package_slug is null or t.monthly_messages is null or t.daily_messages is null
       or t.member_monthly_limit_cents is null or t.tier_monthly_limit_cents is null then return 'refused:limits_unset'; end if;

    select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u
      where u.created_at >= month_start and u.package_slug = p_package and not u.is_owner_test;
    if v + p_reserve > t.tier_monthly_limit_cents then return 'refused:tier_budget'; end if;

    select count(*) into n from public.journey_usage where holder_id = p_holder and created_at >= day_start and status <> 'failed' and not is_owner_test;
    if n >= t.daily_messages then return 'refused:daily'; end if;

    -- Included messages first (only non-purchased use counts against them), then purchased credit.
    select count(*) into n from public.journey_usage where holder_id = p_holder and created_at >= p_period_start
      and status <> 'failed' and credit_id is null and not is_owner_test;
    if n >= t.monthly_messages then
      select id into credit from public.journey_message_credits
        where holder_id = p_holder and used < messages and (expires_at is null or expires_at > now())
        order by expires_at nulls last, created_at limit 1 for update;
      if credit is null then return 'refused:allowance'; end if;
      update public.journey_message_credits set used = used + 1 where id = credit;
    else
      select coalesce(sum(public.journey_row_cents(u)), 0) into v from public.journey_usage u
        where u.holder_id = p_holder and u.created_at >= p_period_start and u.credit_id is null and not u.is_owner_test;
      if v + p_reserve > t.member_monthly_limit_cents then return 'refused:member_budget'; end if;
    end if;
  end if;

  insert into public.journey_usage (user_id, holder_id, request_key, package_slug, credit_id, mode, model, reserved_cents, is_owner_test)
    values (p_user, p_holder, p_request_key, p_package, credit, p_mode, p_model, p_reserve, p_owner_test) returning id into new_id;
  return new_id::text;
end $$;

/** Reconciles the reservation with actual usage. A failed request gives back its message, including purchased credit. */
create or replace function public.journey_complete(p_id bigint, p_ok boolean, p_in integer, p_out integer, p_cost numeric)
returns void language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  update public.journey_usage set status = case when p_ok then 'completed' else 'failed' end,
    input_tokens = p_in, output_tokens = p_out, cost_cents = p_cost, completed_at = now()
  where id = p_id and status = 'reserved' returning credit_id into c;
  if not p_ok and c is not null then
    update public.journey_message_credits set used = greatest(used - 1, 0) where id = c;
  end if;
end $$;

/** Releases reservations abandoned by a crashed request, so an allowance is never stuck. */
create or replace function public.journey_release_stale()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in select id from public.journey_usage where status = 'reserved' and created_at < now() - interval '5 minutes' loop
    perform public.journey_complete(r.id, false, null, null, null); n := n + 1;
  end loop;
  return n;
end $$;

/** A member's allowance status for the member dashboard (no content). */
create or replace function public.journey_holder_usage(p_holder uuid, p_period_start timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'in_flight', (select count(*) from public.journey_usage where holder_id = p_holder and status = 'reserved' and created_at > now() - interval '5 minutes'),
    'minute', (select count(*) from public.journey_usage where holder_id = p_holder and created_at > now() - interval '1 minute'),
    'day', (select count(*) from public.journey_usage where holder_id = p_holder and created_at >= date_trunc('day', now()) and status <> 'failed' and not is_owner_test),
    'period_messages', (select count(*) from public.journey_usage where holder_id = p_holder and created_at >= p_period_start and status <> 'failed' and credit_id is null and not is_owner_test),
    'period_cents', (select coalesce(sum(public.journey_row_cents(u)), 0) from public.journey_usage u where holder_id = p_holder and created_at >= p_period_start and credit_id is null),
    'purchased_remaining', (select coalesce(sum(messages - used), 0) from public.journey_message_credits where holder_id = p_holder and (expires_at is null or expires_at > now())));
$$;

-- ─── Instructions, knowledge, examples, tests ──────────────────────
create table public.journey_instruction_versions (
  id uuid primary key default gen_random_uuid(),
  version integer generated always as identity unique,
  body text not null check (length(body) between 1 and 20000),
  note text check (length(note) <= 300),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create unique index journey_one_published on public.journey_instruction_versions ((true)) where status = 'published';

create table public.journey_knowledge (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('all', 'business', 'life', 'love', 'concierge')),
  title text not null check (length(title) between 1 and 160),
  body text not null check (length(body) between 1 and 20000),
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  professional_review text check (length(professional_review) <= 500),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table public.journey_examples (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('business', 'life', 'love', 'concierge')),
  member_message text not null check (length(member_message) between 1 and 4000),
  ideal_reply text not null check (length(ideal_reply) between 1 and 8000),
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- Owner's private test conversations (fictional scenarios; never member data).
create table public.journey_test_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('business', 'life', 'love', 'concierge')),
  instruction_version integer,
  prompt text not null check (length(prompt) between 1 and 4000),
  reply text,
  correction text check (length(correction) <= 8000),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ─── Private member conversations ──────────────────────────────────
create table public.journey_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('business', 'life', 'love', 'concierge')),
  title text check (length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.journey_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.journey_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('member', 'journey')),
  content text not null check (length(content) <= 20000),
  created_at timestamptz not null default now()
);
create index journey_messages_conv_idx on public.journey_messages (conversation_id, created_at);

-- ─── Row-level security ────────────────────────────────────────────
alter table public.journey_settings enable row level security;
alter table public.journey_models enable row level security;
alter table public.journey_tier_limits enable row level security;
alter table public.journey_message_packages enable row level security;
alter table public.journey_message_credits enable row level security;
alter table public.journey_usage enable row level security;
alter table public.journey_instruction_versions enable row level security;
alter table public.journey_knowledge enable row level security;
alter table public.journey_examples enable row level security;
alter table public.journey_test_runs enable row level security;
alter table public.journey_conversations enable row level security;
alter table public.journey_messages enable row level security;

-- Configuration: owner manages; executive and finance may read.
create policy "staff read" on public.journey_settings for select using (public.has_staff_role(array['owner','executive','finance']::public.staff_role[]));
create policy "owner updates" on public.journey_settings for update
  using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));

create policy "staff read" on public.journey_models for select using (public.has_staff_role(array['owner','executive','finance']::public.staff_role[]));
create policy "owner and finance manage" on public.journey_models for all
  using (public.has_staff_role(array['owner','finance']::public.staff_role[])) with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));

create policy "staff read" on public.journey_tier_limits for select using (public.has_staff_role(array['owner','executive','finance']::public.staff_role[]));
create policy "owner and finance manage" on public.journey_tier_limits for all
  using (public.has_staff_role(array['owner','finance']::public.staff_role[])) with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));

-- Package prices: finance roles always; members only once the owner publishes them.
create policy "staff and published" on public.journey_message_packages for select
  using (public.has_staff_role(array['owner','executive','finance']::public.staff_role[])
         or (is_active and exists (select 1 from public.journey_settings where message_packages_published)));
create policy "owner and finance manage" on public.journey_message_packages for all
  using (public.has_staff_role(array['owner','finance']::public.staff_role[])) with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));
-- Balances: the holder sees their own; finance sees all. Written only by the server after a member-authorized payment.
create policy "holder and finance" on public.journey_message_credits for select
  using (holder_id = auth.uid() or public.has_staff_role(array['owner','executive','finance']::public.staff_role[]));

-- Usage ledger: finance views it (it holds no content); members see their own. Written only by the server.
create policy "finance and own" on public.journey_usage for select
  using (user_id = auth.uid() or holder_id = auth.uid() or public.has_staff_role(array['owner','executive','finance']::public.staff_role[]));

-- Instructions, knowledge, examples, tests: owner and executive.
create policy "owner manages" on public.journey_instruction_versions for all
  using (public.has_staff_role(array['owner','executive']::public.staff_role[])) with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));
create policy "owner manages" on public.journey_knowledge for all
  using (public.has_staff_role(array['owner','executive']::public.staff_role[])) with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));
create policy "owner manages" on public.journey_examples for all
  using (public.has_staff_role(array['owner','executive']::public.staff_role[])) with check (public.has_staff_role(array['owner','executive']::public.staff_role[]));
create policy "owner only" on public.journey_test_runs for all
  using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));

-- Conversations: the member only. No staff policy exists, by design.
create policy "member owns" on public.journey_conversations for select using (user_id = auth.uid());
create policy "member deletes" on public.journey_conversations for delete using (user_id = auth.uid());
create policy "member owns" on public.journey_messages for select using (user_id = auth.uid());

-- ─── Grants ────────────────────────────────────────────────────────
revoke all on public.journey_settings, public.journey_models, public.journey_tier_limits, public.journey_message_packages, public.journey_message_credits,
  public.journey_usage, public.journey_instruction_versions, public.journey_knowledge, public.journey_examples,
  public.journey_test_runs, public.journey_conversations, public.journey_messages from anon, authenticated;
grant select, update on public.journey_settings to authenticated;
grant select, insert, update, delete on public.journey_models, public.journey_tier_limits, public.journey_message_packages,
  public.journey_instruction_versions, public.journey_knowledge, public.journey_examples, public.journey_test_runs to authenticated;
grant select on public.journey_usage, public.journey_messages, public.journey_message_credits to authenticated;
grant select, delete on public.journey_conversations to authenticated;
grant all on public.journey_settings, public.journey_models, public.journey_tier_limits, public.journey_message_packages, public.journey_message_credits,
  public.journey_usage, public.journey_instruction_versions, public.journey_knowledge, public.journey_examples,
  public.journey_test_runs, public.journey_conversations, public.journey_messages to service_role;

revoke all on function public.journey_reserve(uuid, uuid, text, text, text, text, numeric, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.journey_complete(bigint, boolean, integer, integer, numeric) from public, anon, authenticated;
revoke all on function public.journey_release_stale() from public, anon, authenticated;
revoke all on function public.journey_holder_usage(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.journey_reserve(uuid, uuid, text, text, text, text, numeric, timestamptz, boolean) to service_role;
grant execute on function public.journey_complete(bigint, boolean, integer, integer, numeric) to service_role;
grant execute on function public.journey_release_stale() to service_role;
grant execute on function public.journey_holder_usage(uuid, timestamptz) to service_role;

-- Only the owner can authorize paid AI usage, with or without the portal.
create or replace function public.guard_journey_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.paid_usage_authorized and not old.paid_usage_authorized
     and not public.has_staff_role(array['owner']::public.staff_role[]) then
    raise exception 'Only the owner can authorize paid AI usage';
  end if;
  if auth.uid() is not null and new.message_packages_published and not old.message_packages_published
     and not public.has_staff_role(array['owner']::public.staff_role[]) then
    raise exception 'Only the owner can publish message package prices';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_journey_settings before update on public.journey_settings for each row execute function public.guard_journey_settings();

-- ─── Audit: every Journey configuration change ─────────────────────
create trigger audit_journey_settings after update on public.journey_settings for each row execute function public.log_financial_change('id');
create trigger audit_journey_models after insert or update or delete on public.journey_models for each row execute function public.log_financial_change('id');
create trigger audit_journey_tier_limits after insert or update or delete on public.journey_tier_limits for each row execute function public.log_financial_change('package_slug');
create trigger audit_journey_message_packages after insert or update or delete on public.journey_message_packages for each row execute function public.log_financial_change('slug');
create trigger audit_journey_message_credits after insert or update or delete on public.journey_message_credits for each row execute function public.log_financial_change('id');
create trigger audit_journey_instructions after insert or update or delete on public.journey_instruction_versions for each row execute function public.log_financial_change('id');

insert into public.launch_checklist (key, category, title, description, requires_owner_approval, sort_order) values
  ('journey:key', 'Journey AI', 'OpenAI API key added on the server', 'OPENAI_API_KEY in Netlify environment variables only. Use a dedicated OpenAI project with its own monthly budget as a backstop.', false, 900),
  ('journey:limits', 'Journey AI', 'Journey financial controls approved', 'Model rates, message allowances, daily limits, member / membership / company caps and the owner testing budget entered and approved.', true, 910),
  ('journey:testing', 'Journey AI', 'Journey tested privately', 'Owner test conversations in every experience; exhausted allowance, duplicate and simultaneous requests verified.', true, 920),
  ('journey:packages', 'Journey AI', 'Message package prices approved', 'Prices stay hidden until the owner publishes them.', true, 930)
on conflict (key) do nothing;
