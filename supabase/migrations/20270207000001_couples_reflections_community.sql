-- Directive 51 §4 and §7: couples' private reflections and the Couples Connection Community (directive 08).
--
-- 1. Private reflections stay with their author for life (directive 47). A member may share ONE reflection at a time with
--    their partner. A shared reflection is readable by the partner only while both are still in the same couple; when the
--    couple ends, every share ends automatically and nothing is exposed afterwards.
-- 2. The Couples Connection Community reuses Find Your Circle. Couples circles (eligibility 'couples') are open only to
--    members in an ACTIVE couple: a shared space both partners have joined. This is enforced by the database, and a member
--    whose couple ends leaves those circles automatically. Eligible members may propose new Couples Connection Circles,
--    which the founder approves as with every other circle.
-- Idempotent: safe to run more than once.

-- ─── An active couple: both partners have joined the shared space ─────────────────────────────────────────────────────
create or replace function relationships.in_active_couple(p uuid)
returns boolean language sql stable security definer set search_path = public, relationships as $$
  -- A member may ask only about themselves (staff and server-side work may ask about anyone), so nobody can probe
  -- another member's relationship status.
  select p is not null
     and (p = auth.uid() or auth.uid() is null or public.has_staff_role(array['owner', 'admin', 'moderator']::public.staff_role[]))
     and exists (
       select 1 from relationships.couple_members a join relationships.couple_members b on b.couple_id = a.couple_id and b.user_id <> a.user_id
       where a.user_id = p);
$$;
revoke all on function relationships.in_active_couple(uuid) from public, anon;
grant execute on function relationships.in_active_couple(uuid) to authenticated, service_role;

-- ─── Private reflections: optional, per-reflection sharing with the current partner ─────────────────────────────────────
alter table relationships.private_reflections add column if not exists shared_at timestamptz;
alter table relationships.private_reflections add column if not exists shared_couple_id uuid references relationships.couples (id) on delete set null;
alter table relationships.private_reflections add column if not exists updated_at timestamptz;
create index if not exists private_reflections_user on relationships.private_reflections (user_id, created_at desc);
create index if not exists private_reflections_shared on relationships.private_reflections (shared_couple_id) where shared_couple_id is not null;

-- The author does everything with their own reflections, but can only share into the couple they are in now, and only
-- once their partner has joined it (so nothing shared early becomes visible to someone who joins later).
drop policy if exists "author only" on relationships.private_reflections;
create policy "author only" on relationships.private_reflections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and (shared_couple_id is null or (relationships.is_couple_member(shared_couple_id) and relationships.in_active_couple(auth.uid()))));

-- The partner may READ a reflection only when the author chose to share it, and only while BOTH are in that couple.
drop policy if exists "partner reads shared reflection" on relationships.private_reflections;
create policy "partner reads shared reflection" on relationships.private_reflections for select
  using (shared_at is not null and shared_couple_id is not null and user_id <> auth.uid()
         and relationships.is_couple_member(shared_couple_id)
         and exists (select 1 from relationships.couple_members m where m.couple_id = shared_couple_id and m.user_id = private_reflections.user_id));

-- Tell the partner a reflection was shared with them, never what it says. When it becomes private again (by the author or
-- because the couple ended), that notice is withdrawn.
create or replace function relationships.notify_reflection_shared()
returns trigger language plpgsql security definer set search_path = public, relationships as $$
begin
  if tg_op = 'UPDATE' and new.shared_at is null and old.shared_at is not null then
    delete from public.member_notices where kind = 'system' and ref_id = new.id and user_id <> new.user_id;
  end if;
  if new.shared_at is not null and new.shared_couple_id is not null and (tg_op = 'INSERT' or old.shared_at is null) then
    insert into public.member_notices (user_id, kind, title, body, href, ref_id)
      select m.user_id, 'system', 'Your partner shared a reflection with you',
             'Your partner chose to share one of their private reflections. Read it in Private Reflections, in your Couples space.',
             '/app/relationships/reflections', new.id
        from relationships.couple_members m where m.couple_id = new.shared_couple_id and m.user_id <> new.user_id
      on conflict (user_id, kind, ref_id) do update set created_at = now(), read_at = null, popup_seen_at = null;
  end if;
  return new;
end $$;
revoke all on function relationships.notify_reflection_shared() from public, anon, authenticated;
drop trigger if exists reflection_shared_notice on relationships.private_reflections;
create trigger reflection_shared_notice after insert or update of shared_at on relationships.private_reflections
  for each row execute function relationships.notify_reflection_shared();

-- ─── When a couple ends: sharing ends, and couples-only circles are left ───────────────────────────────────────────────
create or replace function relationships.couple_member_left()
returns trigger language plpgsql security definer set search_path = public, relationships as $$
begin
  -- Directive 47: never automatically expose private reflections after separation. Every share in that couple ends.
  update relationships.private_reflections set shared_at = null, shared_couple_id = null where shared_couple_id = old.couple_id;
  -- Couples circles are for active couples only. A couple has two partners, so once one leaves, neither the member who
  -- left nor the partner now on their own remains in couples circles (including Elite Couples).
  delete from public.social_circle_members cm
   using public.social_circles c
   where c.id = cm.circle_id and (c.eligibility = 'couples' or c.category = 'couples')
     and (cm.user_id = old.user_id or cm.user_id in (select user_id from relationships.couple_members where couple_id = old.couple_id));
  return old;
end $$;
revoke all on function relationships.couple_member_left() from public, anon, authenticated;
drop trigger if exists couple_member_left on relationships.couple_members;
create trigger couple_member_left after delete on relationships.couple_members
  for each row execute function relationships.couple_member_left();

-- ─── Couples circles: active couples only (replaces the earlier "couples society" shortcut) ────────────────────────────
create or replace function public.social_circle_eligible(p uuid, c public.social_circles)
returns boolean language plpgsql stable security definer set search_path = public, relationships as $$
begin
  if not public.social_member(p) then return false; end if;
  if c.eligibility = 'all' then return true; end if;
  if c.eligibility = 'couples' then
    return relationships.in_active_couple(p);
  end if;
  if c.eligibility = 'singles' then
    return exists (select 1 from public.profiles where id = p and primary_society = 'singles')
       and coalesce(public.social_age(p), 0) >= public.setting_int('minimum_singles_age', 30)
       and not exists (select 1 from relationships.couple_members m where m.user_id = p);
  end if;
  if c.eligibility = 'elite' then
    -- Elite Couples (a couples circle for verified Elite Members) also needs an active couple.
    return exists (select 1 from public.elite_badges b where b.user_id = p and b.status = 'active')
       and (c.category <> 'couples' or relationships.in_active_couple(p));
  end if;
  return false;
end $$;

-- On approval the proposer hosts the circle, but only while they still meet its requirements (a couple may have ended
-- while the proposal waited).
create or replace function public.social_approve_circle(p_circle uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c public.social_circles;
begin
  if not public.has_staff_role(array['owner']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  select * into c from public.social_circles where id = p_circle and status = 'proposed';
  if c.id is null then raise exception 'Not found'; end if;
  update public.social_circles set status = case when p_approve then 'active' else 'declined' end where id = c.id;
  if p_approve and c.created_by is not null and (c.eligibility = 'all' or public.social_circle_eligible(c.created_by, c)) then
    insert into public.social_circle_members (circle_id, user_id, role) values (c.id, c.created_by, 'host') on conflict (circle_id, user_id) do update set role = 'host';
  end if;
end $$;
revoke all on function public.social_approve_circle(uuid, boolean) from public, anon;
grant execute on function public.social_approve_circle(uuid, boolean) to authenticated;

-- Members may propose open circles, and members of an active couple may propose Couples Connection Circles.
drop policy if exists "propose circle" on public.social_circles;
create policy "propose circle" on public.social_circles for insert to authenticated
  with check (created_by = auth.uid() and status = 'proposed' and not is_official and public.social_member(auth.uid())
              and (eligibility = 'all' or (eligibility = 'couples' and category = 'couples' and relationships.in_active_couple(auth.uid()))));
