-- ════════════════════════════════════════════════════════════════════
-- Membership enrollment v3
--   • Owner-configurable pricing: experiences, bundle tiers (Signature /
--     Premier / Elite), annual discounts, couples upgrade, add-ons,
--     professional packages and onboarding fees. NO prices are seeded —
--     every price starts empty and is set by the owner.
--   • Prices are hidden from the public until the owner publishes them
--     (enforced in the database, not just the page).
--   • One unified subscription per member, recording its experiences.
--   • Adults 40+: date-of-birth eligibility enforced at sign-up, minimum
--     ages configurable by the owner; full dates of birth kept private.
--   • Referral codes, campaign attribution and public launch offers.
-- Replaces the earlier single-price membership_plans table.
-- ════════════════════════════════════════════════════════════════════

-- ─── Eligibility settings (owner-configurable) ─────────────────────
insert into public.platform_settings (key, value, description) values
  ('minimum_member_age', '40', 'Minimum age for consumer memberships'),
  ('minimum_professional_age', '21', 'Minimum age for professional applicants')
on conflict (key) do nothing;

create or replace function public.setting_int(setting_key text, fallback integer)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::integer from public.platform_settings where key = setting_key), fallback);
$$;

-- ─── Retire the old single-price plans ─────────────────────────────
alter table public.subscriptions drop column plan_id;
drop table public.membership_plans cascade;

-- ─── Pricing model ─────────────────────────────────────────────────
create table public.pricing_config (
  id boolean primary key default true check (id),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  annual_discount_percent numeric(5,2) not null default 0 check (annual_discount_percent between 0 and 90),
  couples_upgrade_name text not null default 'Couples upgrade',
  couples_upgrade_description text not null default 'Adds a second, secure login for your partner and your shared relationship space.',
  couples_upgrade_monthly_cents integer check (couples_upgrade_monthly_cents >= 0),
  referral_reward_description text,
  is_published boolean not null default false,
  published_at timestamptz,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
insert into public.pricing_config default values;

create table public.experience_offerings (
  experience public.experience primary key,
  name text not null,
  subtitle text not null,
  description text not null,
  monthly_price_cents integer check (monthly_price_cents >= 0),
  benefits text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.experience_offerings (experience, name, subtitle, description, benefits, sort_order) values
  ('business', 'In Business', 'Professional Connections', 'Business compatibility, professional networking, mentorship, strategic partnerships and collaboration.',
   '{"Business compatibility introductions","Professional networking","Mentorship","Strategic partnerships & collaboration"}', 1),
  ('counseling', 'In Life', 'Personal Growth & Guidance', 'Self-discovery, personal development, emotional intelligence, private journaling and access to qualified counselors and coaches.',
   '{"Guided self-discovery","Emotional intelligence assessments","Private journal","Access to counselors & coaches"}', 2),
  ('relationships', 'In Love', 'Romantic Connections', 'Intentional matchmaking for singles and relationship development tools for couples.',
   '{"Compatibility & readiness assessments","Intentional matchmaking for singles","Meaningful introductions","Tools for couples"}', 3);

create table public.membership_tiers (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  description text not null,
  experience_count integer not null unique check (experience_count between 1 and 3),
  bundle_discount_percent numeric(5,2) not null default 0 check (bundle_discount_percent between 0 and 90),
  annual_discount_percent numeric(5,2) check (annual_discount_percent between 0 and 90), -- overrides the global annual discount when set
  setup_fee_cents integer check (setup_fee_cents >= 0),
  benefits text[] not null default '{}',
  eligibility text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.membership_tiers (slug, name, description, experience_count, benefits, sort_order) values
  ('signature', 'Signature Membership', 'Choose any one experience.', 1,
   '{"One experience of your choice","One secure account on every device","Upgrade at any time"}', 1),
  ('premier', 'Premier Membership', 'Choose any two experiences at a bundled rate.', 2,
   '{"Any two experiences","Bundled savings","One account, one subscription"}', 2),
  ('elite', 'Elite Membership', 'All three experiences at our best bundled rate.', 3,
   '{"In Business, In Life and In Love","Our best bundled rate","Priority access to new features"}', 3);

create table public.membership_addons (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  description text not null default '',
  billing text not null check (billing in ('monthly', 'one_time')),
  price_cents integer check (price_cents >= 0),
  audience text not null default 'member' check (audience in ('member', 'professional')),
  requires_experience public.experience,
  eligibility text,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.professional_packages (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  description text not null,
  eligible_types public.professional_type[] not null default '{licensed_clinical,coach,mentor,other_nonclinical}',
  monthly_price_cents integer check (monthly_price_cents >= 0),
  onboarding_fee_cents integer check (onboarding_fee_cents >= 0),
  benefits text[] not null default '{}',
  eligibility text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.professional_packages (slug, name, description, benefits, sort_order) values
  ('professional', 'Professional', 'A verified profile, scheduling and consent-based referrals.',
   '{"Verified professional profile","Availability & appointment scheduling","Consent-based client referrals"}', 1),
  ('professional-premier', 'Professional Premier', 'Featured placement and advanced practice tools.',
   '{"Everything in Professional","Featured placement","Practice insights"}', 2);

create trigger touch_pricing before update on public.pricing_config for each row execute function public.touch_updated_at();
create trigger touch_offerings before update on public.experience_offerings for each row execute function public.touch_updated_at();
create trigger touch_tiers before update on public.membership_tiers for each row execute function public.touch_updated_at();
create trigger touch_addons before update on public.membership_addons for each row execute function public.touch_updated_at();
create trigger touch_packages before update on public.professional_packages for each row execute function public.touch_updated_at();

-- Only the owner can publish or unpublish pricing; publishing requires
-- every active experience, tier and add-on to have a price.
create or replace function public.guard_pricing_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_published is distinct from old.is_published then
    if auth.uid() is not null and not public.is_owner() then
      raise exception 'Only the owner can publish pricing';
    end if;
    if new.is_published then
      if exists (select 1 from public.experience_offerings where is_active and monthly_price_cents is null) then
        raise exception 'Set a monthly price for every active experience before publishing';
      end if;
      if exists (select 1 from public.membership_addons where is_active and price_cents is null) then
        raise exception 'Set a price for every active add-on before publishing';
      end if;
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_publish before update on public.pricing_config for each row execute function public.guard_pricing_publish();

-- RLS: pricing tables are readable directly only by staff. The public
-- reads them through get_public_pricing(), which hides prices until
-- the owner publishes.
alter table public.pricing_config enable row level security;
alter table public.experience_offerings enable row level security;
alter table public.membership_tiers enable row level security;
alter table public.membership_addons enable row level security;
alter table public.professional_packages enable row level security;

create policy "staff read" on public.pricing_config for select using (public.is_staff());
create policy "finance edits" on public.pricing_config for update
  using (public.has_staff_role(array['owner','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));
create policy "staff read" on public.experience_offerings for select using (public.is_staff());
create policy "finance edits" on public.experience_offerings for update
  using (public.has_staff_role(array['owner','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));
create policy "staff read" on public.membership_tiers for select using (public.is_staff());
create policy "finance manages" on public.membership_tiers for all
  using (public.has_staff_role(array['owner','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));
create policy "staff read" on public.membership_addons for select using (public.is_staff());
create policy "finance manages" on public.membership_addons for all
  using (public.has_staff_role(array['owner','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));
create policy "staff read" on public.professional_packages for select using (public.is_staff());
create policy "finance manages" on public.professional_packages for all
  using (public.has_staff_role(array['owner','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));

-- Public pricing catalogue. Prices are null unless published (staff may
-- request a preview of draft prices).
create or replace function public.get_public_pricing(preview boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  cfg public.pricing_config;
  show_prices boolean;
begin
  select * into cfg from public.pricing_config limit 1;
  show_prices := cfg.is_published or (preview and public.has_staff_role(array['owner','admin','finance']::public.staff_role[]));
  return jsonb_build_object(
    'published', cfg.is_published,
    'preview', show_prices and not cfg.is_published,
    'currency', cfg.currency,
    'annual_discount_percent', case when show_prices then cfg.annual_discount_percent end,
    'minimum_member_age', public.setting_int('minimum_member_age', 40),
    'couples_upgrade', jsonb_build_object(
      'name', cfg.couples_upgrade_name,
      'description', cfg.couples_upgrade_description,
      'monthly_price_cents', case when show_prices then cfg.couples_upgrade_monthly_cents end),
    'referral_reward', cfg.referral_reward_description,
    'experiences', coalesce((select jsonb_agg(jsonb_build_object(
        'experience', e.experience, 'name', e.name, 'subtitle', e.subtitle, 'description', e.description,
        'benefits', e.benefits, 'monthly_price_cents', case when show_prices then e.monthly_price_cents end)
        order by e.sort_order) from public.experience_offerings e where e.is_active), '[]'::jsonb),
    'tiers', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', t.slug, 'name', t.name, 'description', t.description, 'experience_count', t.experience_count,
        'benefits', t.benefits, 'eligibility', t.eligibility,
        'bundle_discount_percent', case when show_prices then t.bundle_discount_percent end,
        'annual_discount_percent', case when show_prices then t.annual_discount_percent end,
        'setup_fee_cents', case when show_prices then t.setup_fee_cents end)
        order by t.sort_order) from public.membership_tiers t where t.is_active), '[]'::jsonb),
    'addons', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', a.slug, 'name', a.name, 'description', a.description, 'billing', a.billing, 'audience', a.audience,
        'requires_experience', a.requires_experience, 'eligibility', a.eligibility,
        'price_cents', case when show_prices then a.price_cents end)
        order by a.sort_order) from public.membership_addons a where a.is_active), '[]'::jsonb),
    'professional_packages', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', p.slug, 'name', p.name, 'description', p.description, 'eligible_types', p.eligible_types,
        'benefits', p.benefits, 'eligibility', p.eligibility,
        'monthly_price_cents', case when show_prices then p.monthly_price_cents end,
        'onboarding_fee_cents', case when show_prices then p.onboarding_fee_cents end)
        order by p.sort_order) from public.professional_packages p where p.is_active), '[]'::jsonb)
  );
end;
$$;
grant execute on function public.get_public_pricing(boolean) to anon, authenticated;

-- ─── Promotions & launch offers ────────────────────────────────────
alter table public.promotions
  add column is_public_offer boolean not null default false,
  add column redemption_count integer not null default 0,
  add column applies_to_tiers text[] not null default '{}';
alter table public.promotions drop column applies_to;

-- Validate a code without exposing the promotions table.
create or replace function public.check_promotion(promo_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', p.code, 'description', p.description, 'percent_off', p.percent_off,
                            'amount_off_cents', p.amount_off_cents, 'applies_to_tiers', p.applies_to_tiers)
  from public.promotions p
  where upper(p.code) = upper(trim(promo_code))
    and p.is_active
    and (p.starts_at is null or p.starts_at <= now())
    and (p.ends_at is null or p.ends_at > now())
    and (p.max_redemptions is null or p.redemption_count < p.max_redemptions)
  limit 1;
$$;
grant execute on function public.check_promotion(text) to anon, authenticated;

create or replace function public.get_public_offers()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', p.code, 'description', p.description,
                  'percent_off', p.percent_off, 'amount_off_cents', p.amount_off_cents, 'ends_at', p.ends_at)), '[]'::jsonb)
  from public.promotions p
  where p.is_public_offer and p.is_active
    and (p.starts_at is null or p.starts_at <= now()) and (p.ends_at is null or p.ends_at > now());
$$;
grant execute on function public.get_public_offers() to anon, authenticated;

-- ─── Unified subscription ──────────────────────────────────────────
alter table public.subscriptions
  add column tier_slug text,
  add column tier_name text,
  add column experiences public.experience[] not null default '{}',
  add column billing_interval text check (billing_interval in ('month', 'year')),
  add column amount_cents integer,            -- charged per billing interval
  add column monthly_equivalent_cents integer, -- for MRR reporting
  add column couples_upgrade boolean not null default false,
  add column addons text[] not null default '{}',
  add column promotion_code text,
  add column stripe_product_id text,
  add column stripe_membership_item_id text,
  add column kind text not null default 'member' check (kind in ('member', 'professional'));

alter table public.experience_access drop constraint experience_access_source_check;
alter table public.experience_access add constraint experience_access_source_check
  check (source in ('subscription', 'owner_grant', 'referral', 'comp', 'couples_upgrade'));

-- ─── Private member details (date of birth) ────────────────────────
-- Readable only by the member. Staff see eligibility, never the date.
create table public.member_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth date not null check (date_of_birth > '1900-01-01'),
  recorded_at timestamptz not null default now()
);
alter table public.member_private enable row level security;
create policy "own record only" on public.member_private for select using (user_id = auth.uid());

alter table public.profiles
  add column account_type text not null default 'member' check (account_type in ('member', 'professional', 'staff')),
  add column age_eligible boolean not null default false,
  add column age_verified_at timestamptz,
  add column referral_code text unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  add column referred_by_code text,
  add column attribution jsonb not null default '{}';

-- ─── Referrals: one row per referred member ────────────────────────
alter table public.referrals drop constraint referrals_code_key;
create index referrals_code_idx on public.referrals (code);

-- ─── Campaign attribution on the waitlist ──────────────────────────
alter table public.waitlist
  add column desired_tier text,
  add column desired_interval text check (desired_interval in ('month', 'year')),
  add column couples_upgrade boolean not null default false,
  add column addons text[] not null default '{}',
  add column referral_code text,
  add column attribution jsonb not null default '{}';

-- ─── Sign-up: registration gate + age eligibility ──────────────────
-- Consumers must give a date of birth meeting the owner-set minimum
-- age (default 40). Professionals have their own minimum and gate.
-- Allow-listed staff accounts are exempt. The date of birth is moved
-- out of the auth metadata (so it never appears in session tokens) into
-- member_private.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  acct text := case when meta ->> 'account_type' = 'professional' then 'professional' else 'member' end;
  allow_listed boolean := exists (select 1 from public.signup_allowlist where email = new.email);
  dob date;
  min_age integer;
  ref text := nullif(upper(trim(meta ->> 'referral_code')), '');
  referrer uuid;
begin
  if not allow_listed then
    if acct = 'member' and not public.setting_enabled('registrations_open') then
      raise exception 'Membership enrollment is not open yet';
    end if;
    if acct = 'professional' and not public.setting_enabled('counselor_applications_open') then
      raise exception 'Professional applications are not open yet';
    end if;

    begin
      dob := (meta ->> 'date_of_birth')::date;
    exception when others then
      dob := null;
    end;
    if dob is null then
      raise exception 'A valid date of birth is required';
    end if;
    min_age := case when acct = 'member' then public.setting_int('minimum_member_age', 40)
                    else public.setting_int('minimum_professional_age', 21) end;
    if dob > (current_date - make_interval(years => min_age)) then
      raise exception 'Membership is available to adults % and older', min_age;
    end if;
  end if;

  insert into public.profiles (id, email, display_name, account_type, age_eligible, age_verified_at, referred_by_code, attribution)
  values (new.id, new.email,
          coalesce(nullif(meta ->> 'display_name', ''), split_part(new.email, '@', 1)),
          case when allow_listed and dob is null then 'staff' else acct end,
          dob is not null, case when dob is not null then now() end,
          ref,
          coalesce(meta -> 'attribution', '{}'));

  if dob is not null then
    insert into public.member_private (user_id, date_of_birth) values (new.id, dob);
  end if;

  if ref is not null then
    select id into referrer from public.profiles where referral_code = ref and id <> new.id;
    if referrer is not null then
      insert into public.referrals (code, referrer_id, referred_user_id, status) values (ref, referrer, new.id, 'pending');
    end if;
  end if;
  return new;
end;
$$;

-- Remove the date of birth from auth metadata after it has been stored.
create or replace function public.scrub_auth_metadata()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data ? 'date_of_birth' then
    update auth.users set raw_user_meta_data = raw_user_meta_data - 'date_of_birth' where id = new.id;
  end if;
  return null;
end;
$$;
create trigger scrub_dob_after_signup after insert on auth.users
  for each row execute function public.scrub_auth_metadata();

-- Profiles: members may not change eligibility, referral or account fields.
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
          or new.referral_code is distinct from old.referral_code
          or new.referred_by_code is distinct from old.referred_by_code) then
    raise exception 'Not permitted to change these account fields';
  end if;
  return new;
end;
$$;

-- ─── Couples upgrade: partner joins with their own secure login ────
create or replace function relationships.accept_partner_invitation(token text)
returns uuid language plpgsql security definer set search_path = public, relationships, extensions as $$
declare inv relationships.partner_invitations;
declare me citext;
begin
  select email into me from public.profiles where id = auth.uid();
  select * into inv from relationships.partner_invitations
    where token_hash = encode(digest(token, 'sha256'), 'hex') and status = 'pending'
    for update;
  if inv.id is null or inv.expires_at < now() then
    raise exception 'This invitation is not valid';
  end if;
  if me is null or me <> inv.invitee_email then
    raise exception 'This invitation was sent to a different email address';
  end if;
  insert into relationships.couple_members (couple_id, user_id) values (inv.couple_id, auth.uid());
  update relationships.partner_invitations set status = 'accepted' where id = inv.id;
  update relationships.profiles set track = 'couple', is_visible = false where user_id in (auth.uid(), inv.inviter_id);

  -- If the inviter's membership includes the couples upgrade, the partner
  -- receives In Love access through it (no second subscription needed).
  if exists (select 1 from public.subscriptions s
             where s.user_id = inv.inviter_id and s.couples_upgrade
               and s.status in ('active', 'trialing', 'past_due')) then
    insert into public.experience_access (user_id, experience, status, source)
    values (auth.uid(), 'relationships', 'active', 'couples_upgrade')
    on conflict (user_id, experience) do update set status = 'active', source = 'couples_upgrade';
  end if;
  return inv.couple_id;
end;
$$;
