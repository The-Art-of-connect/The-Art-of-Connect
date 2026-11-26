-- Development Tracker: one honest checkmark per stage, as the founder requested.
-- A feature is never "operational" just because tests pass: the database requires it to be built,
-- tested, merged and deployed first. Owner tested and owner approved are set only by the owner.

alter table public.dev_tracker
  add column if not exists designed boolean not null default true,
  add column if not exists built boolean not null default false,
  add column if not exists tests_passed boolean not null default false,
  add column if not exists merged boolean not null default false,
  add column if not exists deployed boolean not null default false,
  add column if not exists operational boolean not null default false,
  add column if not exists owner_tested boolean not null default false,
  add column if not exists owner_approved boolean not null default false,
  add column if not exists awaiting text check (awaiting in ('owner', 'legal', 'professional', 'openai', 'payments', 'launch', 'founder_content')),
  add column if not exists tested_by_owner_at timestamptz,
  add column if not exists approved_by_owner_at timestamptz;
alter table public.dev_tracker drop constraint if exists dev_tracker_operational_needs_deploy;
alter table public.dev_tracker add constraint dev_tracker_operational_needs_deploy
  check (not operational or (built and tests_passed and merged and deployed));
alter table public.dev_tracker drop constraint if exists dev_tracker_approval_needs_test;
alter table public.dev_tracker add constraint dev_tracker_approval_needs_test check (not owner_approved or owner_tested);

-- Owner testing and approval can only be recorded by the owner.
create or replace function public.guard_dev_tracker()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.owner_tested is distinct from old.owner_tested or new.owner_approved is distinct from old.owner_approved)
     and auth.uid() is not null and not public.has_staff_role(array['owner']::public.staff_role[]) then
    raise exception 'Only the owner can record owner testing or approval';
  end if;
  if new.owner_tested and not old.owner_tested then new.tested_by_owner_at := now(); end if;
  if new.owner_approved and not old.owner_approved then new.approved_by_owner_at := now(); end if;
  return new;
end $$;
drop trigger if exists guard_dev_tracker on public.dev_tracker;
create trigger guard_dev_tracker before update on public.dev_tracker for each row execute function public.guard_dev_tracker();

-- Current, verified status (2026-11-26). Stages: designed, built, tests, merged, deployed, operational.
insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('public-site', 'Website', 'Public website, navigation and search', 'Six-category navigation, dropdowns, phone menu, site search.', 'functional', null, 10, true, true, true, true, true, true, null),
  ('crisis-page', 'Counseling', 'Crisis resources page (/wellness)', 'Public, no account or payment required.', 'functional', null, 20, true, true, true, true, true, true, null),
  ('owner-tools', 'Owner Portal', 'View as, Curriculum Studio, Training Library review, Journey Intelligence Center', 'Owner-only tools with two-step verification.', 'functional', 'Owner: try View as for each membership type.', 30, true, true, true, true, true, true, null),
  ('art-of-self', 'The Art of Self', 'Self-guided learning: Who Am I?, love languages, boundaries', 'Free for every member; no AI.', 'deployed', 'Opens to members when registrations open.', 40, true, true, true, true, true, false, 'launch'),
  ('identity-curriculum', 'The Art of Self', 'Identity & Self-Love founding curriculum', 'Six lessons, guided answers and analysis. Answer wording drafted by Peace.', 'deployed', 'Owner: review the drafted answers in Curriculum Studio.', 50, true, true, true, true, true, false, 'owner'),
  ('ei-curriculum', 'The Art of Self', 'Emotional Intelligence founding curriculum', 'Six lessons, scenarios, six-part analysis.', 'deployed', 'Owner: review the drafted answers in Curriculum Studio.', 60, true, true, true, true, true, false, 'owner'),
  ('portfolio', 'The Art of Self', 'Personal Discovery Portfolio (self-guided)', 'Rule-based, dated versions, corrections, print.', 'deployed', 'Opens to members when registrations open.', 70, true, true, true, true, true, false, 'launch'),
  ('dashboard', 'Members', 'Personalized dashboard and Explore Memberships', 'Shows only the member''s own societies.', 'deployed', 'Owner: check each membership with View as.', 80, true, true, true, true, true, false, 'launch'),
  ('free-registration', 'Members', 'Begin free with one primary society', 'Business 21+, Singles 30+, Couples 21+.', 'deployed', 'Turns on with registrations.', 90, true, true, true, true, true, false, 'launch'),
  ('society-transitions', 'Members', 'Secure society transitions (e.g., Singles to Couples)', 'Eligibility checked by the database; history kept.', 'deployed', null, 100, true, true, true, true, true, false, 'launch'),
  ('journey-text', 'Journey', 'Journey written conversations', 'Paid-only, allowances, budgets, owner testing.', 'deployed', 'Owner: turn on Journey and authorize billable usage, then test privately.', 110, true, true, true, true, true, false, 'owner'),
  ('journey-personality', 'Journey', 'Master personality (Blueprint)', 'Draft version 1; unpublished by design.', 'deployed', 'Owner: review and publish when ready.', 120, true, true, true, true, true, false, 'owner'),
  ('training-library', 'Journey', 'Knowledge & Training Library', '28 drafts; 0 approved.', 'deployed', 'Owner: approve categories (Journey uses only founder principles until then).', 130, true, true, true, true, true, false, 'owner'),
  ('discovery-sessions', 'Journey', 'Adaptive Discovery Sessions', 'Adaptive questions; summaries with nine headings.', 'deployed', 'Owner test once Journey is on.', 140, true, true, true, true, true, false, 'owner'),
  ('journey-analyses', 'Journey', 'Journey-written analyses and portfolio', 'On request only; one message each.', 'deployed', 'Owner test once Journey is on.', 150, true, true, true, true, true, false, 'owner'),
  ('journey-voice', 'Journey', 'Live voice with Journey', 'Lesson-aware; preferences applied; minutes metered.', 'deployed', 'Owner: choose the realtime voice model and per-minute rate, then test.', 160, true, true, true, true, true, false, 'owner'),
  ('customize-journey', 'Journey', 'Customize Your Journey and 15 avatars', 'Voice, age style, language, accent, personality, pace, portraits.', 'deployed', 'Owner: create voice previews (one-time button).', 170, true, true, true, true, true, false, 'owner'),
  ('voice-studio', 'Journey', 'Journey Live upgrade and owner Voice Studio', 'Audition voices, expression tests, depth and pace.', 'built', 'Finish and merge the in-progress branch.', 180, true, true, false, false, false, false, null),
  ('session-billing', 'Journey', 'Private Session billing protections', 'Included messages then credits; summary reserve; pause and resume.', 'tested', 'Add booking quotes, then merge and apply the database update.', 190, true, true, true, false, false, false, null),
  ('session-quotes', 'Journey', 'Private Session booking quote', 'Fee, estimated messages, balance, total due.', 'designed', null, 200, true, false, false, false, false, false, null),
  ('journey-plus', 'Journey', 'Journey Plus packages and Auto-Reload', 'Access granted only after successful payment.', 'deployed', 'Requires live payments.', 210, true, true, true, true, true, false, 'payments'),
  ('credit-only', 'Journey', 'Nonmember Journey credit purchasing', 'Owner-controlled switch; off by default.', 'designed', null, 220, true, false, false, false, false, false, null),
  ('revenue-split', 'Owner Portal', 'Separate revenue reporting (sessions, credits, counseling)', null, 'designed', null, 230, true, false, false, false, false, false, null),
  ('wellness-center', 'Counseling', 'Counseling & Wellness Center and support preferences', 'Open to every member; counselors set their own fees.', 'deployed', 'Opens to members when registrations open.', 240, true, true, true, true, true, false, 'launch'),
  ('art-of-wellness', 'Counseling', 'The Art of Wellness in-house counseling', 'Coming soon page.', 'coming_soon', 'Legal, licensing and privacy review.', 250, true, true, true, true, true, false, 'legal'),
  ('referral-report', 'Counseling', 'Professional Support Assessment & Referral Report', null, 'designed', 'Questions and criteria need qualified professional review.', 260, true, false, false, false, false, false, 'professional'),
  ('counselor-portal', 'Counseling', 'Counselor Portal', null, 'designed', null, 270, true, false, false, false, false, false, 'legal'),
  ('counseling-ops', 'Owner Portal', 'Counseling Operations Center', null, 'designed', null, 280, true, false, false, false, false, false, null),
  ('growth-plan', 'Journey', 'My Personal Growth Plan', null, 'designed', null, 290, true, false, false, false, false, false, null),
  ('couples-moments', 'The Personal Society', 'Couples calendar, date invitations and surprises', 'Partly built on an in-progress branch.', 'built', 'Finish screens and merge.', 300, true, true, false, false, false, false, null),
  ('remaining-curricula', 'The Art of Self', 'Attachment Styles and Inner-Child Discovery curricula', 'Banners ready.', 'designed', 'Founder curricula (or Peace drafts from the founding philosophy).', 310, true, false, false, false, false, false, 'founder_content'),
  ('professional-society', 'The Professional Society', 'Business dashboard, board, inbox and webinars', null, 'deployed', 'Opens when The Professional Society is switched live.', 320, true, true, true, true, true, false, 'launch'),
  ('personal-society', 'The Personal Society', 'Singles onboarding, readiness and matchmaking foundations', null, 'deployed', 'Opens when The Personal Society is switched live.', 330, true, true, true, true, true, false, 'launch'),
  ('payments', 'Platform', 'Memberships and payments (Stripe)', 'Live payments off by design.', 'deployed', 'Owner authorization for live payments.', 340, true, true, true, true, true, false, 'payments'),
  ('email', 'Platform', 'Email delivery', 'Key stored securely; not verified by Peace.', 'deployed', 'Owner: send a test email.', 350, true, true, true, true, true, false, 'owner'),
  ('identity-verification', 'Platform', 'Identity verification', 'Switched off.', 'deployed', 'Provider setup and owner authorization.', 360, true, true, true, true, true, false, 'owner')
on conflict (key) do update set area = excluded.area, title = excluded.title, detail = excluded.detail, status = excluded.status, next_step = excluded.next_step,
  sort_order = excluded.sort_order, designed = excluded.designed, built = excluded.built, tests_passed = excluded.tests_passed, merged = excluded.merged,
  deployed = excluded.deployed, operational = excluded.operational, awaiting = excluded.awaiting, updated_at = now();
