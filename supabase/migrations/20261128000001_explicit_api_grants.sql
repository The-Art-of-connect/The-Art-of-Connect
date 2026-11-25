-- ════════════════════════════════════════════════════════════════════
-- Explicit Data API permissions
-- This project has "automatic table API access" turned off, so no table
-- is reachable through the API unless granted here. Each role receives
-- only the operations the application uses; row-level security then
-- decides which rows each person may touch.
--   anon           visitors who are not signed in
--   authenticated  signed-in members and staff
--   service_role   trusted server code only (Stripe webhooks)
-- ════════════════════════════════════════════════════════════════════

grant usage on schema public, relationships, business, counseling to anon, authenticated, service_role;

-- ─── Visitors (not signed in) ──────────────────────────────────────
grant select on public.platform_settings to anon;
grant insert on public.waitlist, public.professional_interest to anon;

-- ─── Signed-in members and staff (RLS applies to every row) ────────
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.staff_roles to authenticated;
grant select, insert, update, delete on public.experience_access to authenticated;
grant select, update on public.platform_settings to authenticated;
grant select, insert, update, delete on public.signup_allowlist to authenticated;
grant select on public.subscriptions, public.payments to authenticated;
grant select, insert on public.waitlist to authenticated;
grant select, insert, update, delete on public.referrals to authenticated;
grant select, insert, update, delete on public.promotions to authenticated;
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert, update on public.moderation_reports to authenticated;
grant select on public.audit_log to authenticated;
grant select, insert, update on public.consents to authenticated;
grant select, insert, update on public.professional_interest to authenticated;
grant select, update on public.pricing_config, public.experience_offerings to authenticated;
grant select, insert, update, delete on public.membership_tiers, public.membership_addons, public.professional_packages to authenticated;
grant select on public.member_private, public.identity_verifications to authenticated;
grant select, insert, update, delete on public.safety_flags, public.blocks, public.launch_checklist to authenticated;
-- rate_limit_events: no direct access for anyone; only public.rate_limit_hit() touches it.

grant select, insert, update, delete on all tables in schema relationships, business, counseling to authenticated;

-- ─── Trusted server (bypasses RLS; key never leaves the server) ────
grant all on all tables in schema public, relationships, business, counseling to service_role;
grant usage, select on all sequences in schema public, relationships, business, counseling to service_role;

-- ─── Functions ─────────────────────────────────────────────────────
-- Helpers evaluated inside row-level security policies.
grant execute on function
  public.has_staff_role(public.staff_role[]), public.is_owner(), public.is_staff(),
  public.setting_enabled(text), public.setting_int(text, integer), public.has_experience(public.experience),
  public.matchmaking_eligible(uuid), public.is_blocked_between(uuid, uuid), public.has_open_safety_flag(uuid)
  to anon, authenticated, service_role;
grant execute on function relationships.is_couple_member(uuid) to authenticated, service_role;

-- Public catalogue and protections (safe for visitors).
grant execute on function public.get_public_pricing(boolean), public.get_public_offers(), public.check_promotion(text),
  public.rate_limit_hit(text, integer, integer) to anon, authenticated;

-- Member and staff actions.
grant execute on function public.log_admin_action(text, text, text, jsonb), relationships.start_couple(),
  relationships.accept_partner_invitation(text) to authenticated;

-- Never callable through the API.
revoke execute on function public.bootstrap_owner(citext) from public, anon, authenticated;
