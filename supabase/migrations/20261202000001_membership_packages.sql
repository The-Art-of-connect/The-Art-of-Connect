-- ════════════════════════════════════════════════════════════════════
-- Membership packages — the owner's original pricing model.
--
-- Each package is a named membership with its OWN price (not a computed
-- discount): it covers an exact set of experiences, optionally a single or
-- couple In Love track. The membership builder matches a visitor's choices
-- to a package and shows the saving against buying experiences separately.
-- Exclusive memberships (Executive Private, Elite Concierge) include all
-- three experiences plus premium benefits.
--
-- Every name, description, benefit, price, onboarding fee and annual
-- incentive is editable by the owner (and finance) in the Owner Portal.
-- Prices stay hidden from the public until the owner publishes.
-- One membership = one account, usable on every device at no extra charge.
-- ════════════════════════════════════════════════════════════════════

create table public.membership_packages (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(name) between 1 and 80),
  tagline text not null default '' check (length(tagline) <= 160),
  description text not null default '' check (length(description) <= 1000),
  category text not null check (category in ('single', 'bundle', 'exclusive')),
  experiences public.experience[] not null check (cardinality(experiences) between 1 and 3),
  love_track text check (love_track in ('single', 'couple')),
  monthly_price_cents integer check (monthly_price_cents between 0 and 10000000),
  -- Optional fixed annual price; otherwise the annual incentive applies.
  annual_price_cents integer check (annual_price_cents between 0 and 100000000),
  -- Optional per-package incentive: bill N months for a 12-month year.
  annual_months_charged numeric(4,1) check (annual_months_charged > 0 and annual_months_charged <= 12),
  onboarding_fee_cents integer check (onboarding_fee_cents between 0 and 10000000),
  benefits text[] not null default '{}' check (cardinality(benefits) <= 20),
  highlight text check (length(highlight) <= 40),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  check (love_track is null or 'relationships' = any (experiences)),
  check (category <> 'exclusive' or cardinality(experiences) = 3)
);
create trigger touch_membership_packages before update on public.membership_packages for each row execute function public.touch_updated_at();

-- Global annual incentive: "12 months for the price of N" (12 = no incentive).
alter table public.pricing_config
  add column annual_months_charged numeric(4,1) not null default 12 check (annual_months_charged > 0 and annual_months_charged <= 12);
-- Draft value from the owner's proposal: 12 months for the price of 10.
update public.pricing_config set annual_months_charged = 10;

insert into public.membership_packages (slug, name, tagline, description, category, experiences, love_track, monthly_price_cents, benefits, highlight, sort_order) values
  ('professional-society', 'The Professional Society', 'In Business',
   'Professional connection for accomplished adults 40+: business compatibility, networking, mentorship and strategic partnerships.',
   'single', '{business}', null, 2999,
   '{"Business compatibility introductions","Professional networking","Mentorship & strategic partnerships","One account on all your devices"}', null, 10),
  ('personal-society', 'The Personal Society', 'In Love · Singles',
   'Intentional matchmaking for single adults 40+ who are ready for a meaningful relationship.',
   'single', '{relationships}', 'single', 3999,
   '{"Compatibility & readiness assessments","Intentional matchmaking","Meaningful introductions","One account on all your devices"}', null, 20),
  ('art-of-becoming', 'The Art of Becoming', 'In Life',
   'Self-discovery and personal growth: guided reflection, emotional intelligence and access to qualified counselors and coaches.',
   'single', '{counseling}', null, null,
   '{"Guided self-discovery","Emotional intelligence assessments","Private journal","Access to counselors & coaches"}', null, 30),
  ('couples-membership', 'Couples Membership', 'In Love · Couples',
   'Relationship development for couples: shared tools, guided conversations and two secure, private logins.',
   'single', '{relationships}', 'couple', null,
   '{"Two secure logins — one for each partner","Shared relationship space","Guided conversations & tools","Each partner keeps a private journal"}', null, 40),
  ('dual-society', 'Dual Society', 'In Business + In Love',
   'Professional and romantic connection together, at a bundled rate.',
   'bundle', '{business,relationships}', null, 5999,
   '{"In Business and In Love","Bundled savings","One account, one subscription","One account on all your devices"}', null, 50),
  ('business-life', 'In Business + In Life', 'Two experiences',
   'Professional connection and personal growth together, at a bundled rate.',
   'bundle', '{business,counseling}', null, null,
   '{"In Business and In Life","Bundled savings","One account, one subscription"}', null, 60),
  ('life-love', 'In Life + In Love', 'Two experiences',
   'Personal growth and intentional love together, at a bundled rate.',
   'bundle', '{counseling,relationships}', null, null,
   '{"In Life and In Love","Bundled savings","One account, one subscription"}', null, 70),
  ('complete-society', 'Complete Society', 'All three experiences',
   'In Business, In Life and In Love — the complete Art of Connect experience.',
   'bundle', '{business,counseling,relationships}', null, null,
   '{"In Business, In Life and In Love","Our best bundled rate","One account on all your devices"}', null, 80),
  ('executive-private', 'Executive Private', 'Premium membership',
   'All three experiences with enhanced privacy, advanced compatibility tools and priority support.',
   'exclusive', '{business,counseling,relationships}', null, 9999,
   '{"All three experiences","Enhanced privacy options","Advanced compatibility tools","Priority support"}', null, 90),
  ('elite-concierge', 'Elite Concierge', 'Our highest membership',
   'Everything in Executive Private, plus personalized introductions, dedicated concierge assistance and exclusive opportunities.',
   'exclusive', '{business,counseling,relationships}', null, 24999,
   '{"Everything in Executive Private","Personalized introductions","Dedicated concierge assistance","Exclusive opportunities"}', 'By invitation', 100);

-- Professional memberships (counselors, coaches & mentors).
update public.professional_packages set is_active = false where slug in ('professional', 'professional-premier');
insert into public.professional_packages (slug, name, description, monthly_price_cents, benefits, sort_order) values
  ('standard-provider', 'Standard Provider', 'A verified professional profile and directory listing after credential approval.', 2900,
   '{"Verified professional profile","Directory listing after credential approval"}', 10),
  ('professional-provider', 'Professional Provider', 'An enhanced profile with appointment scheduling and referral management.', 5900,
   '{"Everything in Standard","Enhanced professional profile","Appointment scheduling","Referral management"}', 20),
  ('premium-provider', 'Premium Provider', 'Expanded professional tools, practice analytics and additional marketing opportunities.', 9900,
   '{"Everything in Professional","Expanded professional tools","Practice analytics","Additional marketing opportunities"}', 30)
on conflict (slug) do nothing;

-- ─── Access: staff read; owner & finance manage. Public reads through
--     get_public_pricing(), which hides prices until published. ───────
alter table public.membership_packages enable row level security;
create policy "staff read" on public.membership_packages for select using (public.is_staff());
create policy "finance manages" on public.membership_packages for all
  using (public.has_staff_role(array['owner','finance']::public.staff_role[]))
  with check (public.has_staff_role(array['owner','finance']::public.staff_role[]));
revoke all on public.membership_packages from anon, authenticated;
grant select, insert, update, delete on public.membership_packages to authenticated;
grant all on public.membership_packages to service_role;

-- ─── Publishing: owner only, and every active package must be priced ──
create or replace function public.guard_pricing_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_published is distinct from old.is_published then
    if auth.uid() is not null and not public.is_owner() then
      raise exception 'Only the owner can publish pricing';
    end if;
    if new.is_published then
      if exists (select 1 from public.membership_packages where is_active and monthly_price_cents is null) then
        raise exception 'Set a monthly price for every active membership package before publishing (or switch unused packages off)';
      end if;
      if exists (select 1 from public.professional_packages where is_active and monthly_price_cents is null) then
        raise exception 'Set a monthly price for every active professional membership before publishing';
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

-- ─── Public catalogue ──────────────────────────────────────────────
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
    'annual_months_charged', case when show_prices then cfg.annual_months_charged end,
    'minimum_member_age', public.setting_int('minimum_member_age', 40),
    'couples_upgrade', jsonb_build_object(
      'name', cfg.couples_upgrade_name,
      'description', cfg.couples_upgrade_description,
      'monthly_price_cents', case when show_prices then cfg.couples_upgrade_monthly_cents end),
    'referral_reward', cfg.referral_reward_description,
    'experiences', coalesce((select jsonb_agg(jsonb_build_object(
        'experience', e.experience, 'name', e.name, 'subtitle', e.subtitle, 'description', e.description, 'benefits', e.benefits)
        order by e.sort_order) from public.experience_offerings e where e.is_active), '[]'::jsonb),
    'packages', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', p.slug, 'name', p.name, 'tagline', p.tagline, 'description', p.description, 'category', p.category,
        'experiences', p.experiences, 'love_track', p.love_track, 'benefits', p.benefits, 'highlight', p.highlight,
        'monthly_price_cents', case when show_prices then p.monthly_price_cents end,
        'annual_price_cents', case when show_prices then p.annual_price_cents end,
        'annual_months_charged', case when show_prices then p.annual_months_charged end,
        'onboarding_fee_cents', case when show_prices then p.onboarding_fee_cents end)
        order by p.sort_order) from public.membership_packages p where p.is_active), '[]'::jsonb),
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

-- Promotions now target packages (column name kept for compatibility).
comment on column public.promotions.applies_to_tiers is 'Membership package slugs the code applies to (empty = all).';
