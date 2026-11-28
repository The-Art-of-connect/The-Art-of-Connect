-- Directive 51 (implementation clarification 4): counseling appointment booking and Business Launch Center formation requests.
--
-- Counseling booking
--   * Clinical services stay CLOSED before launch: members can request a time only when both 'counseling_live' and
--     'counseling_center_open' are on. Until then, staff and the owner-listed fictional QA account may exercise the flow,
--     and only with fictional (test) counselors. No payment is taken anywhere in this flow.
--   * Members see only verified, listed counselors, each counselor's own published availability and own fees (never set by
--     The Art of Connect).
--   * Double booking is impossible at the database level: a trigger serializes every booking for the same counselor (and the
--     same client) with transaction locks and refuses any overlapping requested or confirmed appointment.
--   * Members and counselors change appointments only through the functions below (no direct writes). Notices name no
--     clinical details.
--
-- Formation requests
--   * A member prepares a formation order (existing draft rules), then sends it as a request (requested_at). The request is
--     reviewed by the team before anything is filed or charged. Members can never set an order to processing, filed or
--     completed; owner and finance update the status through formation_order_review(), and the member is notified.

-- ─── Counseling: appointment details ─────────────────────────────────────────────────────────────────────────────────
alter table counseling.appointments
  add column if not exists fee_id uuid references counseling.fees (id) on delete set null,
  add column if not exists quoted_fee_cents integer check (quoted_fee_cents >= 0),
  add column if not exists canceled_by text check (canceled_by in ('client', 'counselor')),
  add column if not exists decided_at timestamptz;
create index if not exists counseling_appointments_counselor on counseling.appointments (counselor_id, starts_at);
create index if not exists counseling_appointments_client on counseling.appointments (client_id, starts_at);

-- Availability times are interpreted in the counselor's own time zone, which must be a real one.
create or replace function counseling.check_availability_timezone()
returns trigger language plpgsql set search_path = public, counseling as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then raise exception 'Choose a valid time zone.'; end if;
  return new;
end $$;
drop trigger if exists check_availability_timezone on counseling.availability;
create trigger check_availability_timezone before insert or update on counseling.availability for each row execute function counseling.check_availability_timezone();

-- No double booking, whoever writes the row.
create or replace function counseling.prevent_double_booking()
returns trigger language plpgsql security definer set search_path = public, counseling as $$
begin
  if new.status not in ('requested', 'confirmed') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('requested', 'confirmed') and (new.starts_at, new.ends_at, new.counselor_id, new.client_id)
     is not distinct from (old.starts_at, old.ends_at, old.counselor_id, old.client_id) then
    return new;
  end if;
  -- Lock both people in a fixed order so concurrent requests queue instead of racing (and never deadlock).
  perform pg_advisory_xact_lock(hashtextextended('counseling.booking:' || least(new.counselor_id, new.client_id)::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('counseling.booking:' || greatest(new.counselor_id, new.client_id)::text, 0));
  if exists (
    select 1 from counseling.appointments x
    where x.id <> new.id and x.status in ('requested', 'confirmed')
      and (x.counselor_id = new.counselor_id or x.client_id = new.client_id)
      and x.starts_at < new.ends_at and new.starts_at < x.ends_at
  ) then
    raise exception 'SLOT_TAKEN';
  end if;
  return new;
end $$;
drop trigger if exists prevent_double_booking on counseling.appointments;
create trigger prevent_double_booking before insert or update on counseling.appointments for each row execute function counseling.prevent_double_booking();

-- Appointments change only through the functions below: with no insert, update or delete policy left, row-level security
-- refuses every direct write by members and counselors.
drop policy if exists "client requests appointment" on counseling.appointments;
drop policy if exists "parties update appointment" on counseling.appointments;

-- A member always sees the name of a counselor they have an appointment with, even if the counselor later stops listing.
drop policy if exists "clients see their counselors" on counseling.counselors;
create policy "clients see their counselors" on counseling.counselors for select
  using (exists (select 1 from counseling.appointments a where a.counselor_id = counseling.counselors.user_id and a.client_id = auth.uid()));

-- Whether this member may request appointments now: 'open' (launched), 'testing' (pre-launch testing by staff or the QA
-- account with a fictional counselor), 'fictional_only' (pre-launch tester, but this counselor is a real person) or
-- 'not_open'.
create or replace function public.counseling_booking_status(p_counselor uuid default null)
returns text language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then 'not_open'
    when public.setting_enabled('counseling_live') and public.setting_enabled('counseling_center_open') then 'open'
    when not (public.is_staff() or public.is_qa_account(auth.uid())) then 'not_open'
    when p_counselor is null or exists (select 1 from public.profiles p where p.id = p_counselor and p.is_test) then 'testing'
    else 'fictional_only'
  end;
$$;

-- A counselor's open times for a session of p_minutes over the coming days, from their own weekly availability, minus
-- times already requested or confirmed. Returns times only (never who booked them).
create or replace function public.counseling_open_slots(p_counselor uuid, p_minutes integer, p_days integer default 21)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public, counseling as $$
  with days as (
    select (current_date + g)::date as d from generate_series(-1, least(greatest(coalesce(p_days, 21), 1), 60)) g
  ), windows as (
    select ((days.d + a.start_time) at time zone a.timezone) as ws, ((days.d + a.end_time) at time zone a.timezone) as we
    from counseling.availability a join days on extract(dow from days.d) = a.weekday
    where a.counselor_id = p_counselor
  ), slots as (
    select distinct s, s + make_interval(mins => p_minutes) as e
    from windows w, generate_series(w.ws, w.we - make_interval(mins => p_minutes), make_interval(mins => p_minutes)) s
  )
  select slots.s, slots.e from slots
  where auth.uid() is not null
    and p_minutes between 10 and 240
    and slots.s > now()
    and slots.s < now() + make_interval(days => least(greatest(coalesce(p_days, 21), 1), 60))
    and exists (select 1 from counseling.counselors c where c.user_id = p_counselor and c.is_verified and c.is_listed)
    and not exists (
      select 1 from counseling.appointments x
      where x.counselor_id = p_counselor and x.status in ('requested', 'confirmed')
        and x.starts_at < slots.e and slots.s < x.ends_at)
  order by slots.s
  limit 300;
$$;

create or replace function public.counseling_request_appointment(p_counselor uuid, p_fee uuid, p_starts timestamptz, p_format text, p_name text)
returns uuid language plpgsql security definer set search_path = public, counseling as $$
declare
  me uuid := auth.uid();
  st text;
  c counseling.counselors;
  f counseling.fees;
  nm text := left(trim(coalesce(p_name, '')), 80);
  new_id uuid;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  st := public.counseling_booking_status(p_counselor);
  if st = 'not_open' then raise exception 'BOOKING_NOT_OPEN'; end if;
  if st = 'fictional_only' then raise exception 'FICTIONAL_ONLY'; end if;
  if me = p_counselor then raise exception 'NOT_PERMITTED'; end if;
  select * into c from counseling.counselors where user_id = p_counselor and is_verified and is_listed;
  if not found then raise exception 'COUNSELOR_UNAVAILABLE'; end if;
  select * into f from counseling.fees where id = p_fee and counselor_id = p_counselor;
  if not found then raise exception 'FEE_REQUIRED'; end if;
  if p_format not in ('video', 'phone', 'in_person') then raise exception 'FORMAT_UNAVAILABLE'; end if;
  if (p_format = 'in_person' and not (c.offers_in_person and f.format in ('in_person', 'any')))
     or (p_format <> 'in_person' and not (c.offers_virtual and f.format in ('virtual', 'any'))) then
    raise exception 'FORMAT_UNAVAILABLE';
  end if;
  if char_length(nm) < 1 then raise exception 'NAME_REQUIRED'; end if;
  if not exists (select 1 from public.counseling_open_slots(p_counselor, f.duration_minutes, 60) s where s.starts_at = p_starts) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;
  insert into counseling.clients (user_id, preferred_name) values (me, nm)
    on conflict (user_id) do update set preferred_name = excluded.preferred_name;
  insert into counseling.appointments (counselor_id, client_id, starts_at, ends_at, format, status, fee_id, quoted_fee_cents)
    values (p_counselor, me, p_starts, p_starts + make_interval(mins => f.duration_minutes), p_format, 'requested', f.id, f.fee_cents)
    returning id into new_id;
  insert into public.member_notices (user_id, kind, title, body, href, ref_id)
    values (p_counselor, 'system', 'New appointment request', 'A member has requested a time with you. Review it in My Counseling Practice.', '/app/wellness/practice', new_id)
    on conflict do nothing;
  return new_id;
end $$;

-- The client cancels their own request or confirmed appointment before it begins.
create or replace function public.counseling_cancel_appointment(p_id uuid)
returns void language plpgsql security definer set search_path = public, counseling as $$
declare a counseling.appointments;
begin
  select * into a from counseling.appointments where id = p_id and client_id = auth.uid() for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if a.status not in ('requested', 'confirmed') or a.starts_at <= now() then raise exception 'NOT_CANCELLABLE'; end if;
  update counseling.appointments set status = 'canceled', canceled_by = 'client', decided_at = now() where id = p_id;
  insert into public.member_notices (user_id, kind, title, body, href, ref_id)
    values (a.counselor_id, 'system', 'An appointment was canceled', 'A member canceled an appointment with you. The time is open again.', '/app/wellness/practice', p_id)
    on conflict (user_id, kind, ref_id) do update set title = excluded.title, body = excluded.body, created_at = now(), read_at = null, popup_seen_at = null;
end $$;

-- The counselor confirms or declines a request, cancels a confirmed appointment, or records how a past one went.
create or replace function public.counseling_respond_appointment(p_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = public, counseling as $$
declare a counseling.appointments; next_status text; t text; b text;
begin
  select * into a from counseling.appointments where id = p_id and counselor_id = auth.uid() for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_decision = 'confirm' and a.status = 'requested' and a.starts_at > now() then
    next_status := 'confirmed'; t := 'Your appointment is confirmed'; b := 'Your counselor confirmed your requested time. See My Appointments for the details.';
  elsif p_decision = 'decline' and a.status = 'requested' then
    next_status := 'canceled'; t := 'Your appointment request was declined'; b := 'Your counselor could not accept the requested time. You can choose another time in the Counseling & Wellness Center.';
  elsif p_decision = 'cancel' and a.status = 'confirmed' and a.starts_at > now() then
    next_status := 'canceled'; t := 'Your appointment was canceled'; b := 'Your counselor canceled this appointment. You can choose another time in the Counseling & Wellness Center.';
  elsif p_decision in ('completed', 'no_show') and a.status = 'confirmed' and a.starts_at <= now() then
    next_status := p_decision;
  else
    raise exception 'NOT_PERMITTED';
  end if;
  update counseling.appointments
    set status = next_status, decided_at = now(), canceled_by = case when next_status = 'canceled' then 'counselor' else canceled_by end
    where id = p_id;
  if t is not null then
    insert into public.member_notices (user_id, kind, title, body, href, ref_id)
      values (a.client_id, 'system', t, b, '/app/wellness/appointments', p_id)
      on conflict (user_id, kind, ref_id) do update set title = excluded.title, body = excluded.body, created_at = now(), read_at = null, popup_seen_at = null;
  end if;
end $$;

revoke all on function public.counseling_booking_status(uuid), public.counseling_open_slots(uuid, integer, integer),
  public.counseling_request_appointment(uuid, uuid, timestamptz, text, text), public.counseling_cancel_appointment(uuid),
  public.counseling_respond_appointment(uuid, text) from public, anon;
grant execute on function public.counseling_booking_status(uuid), public.counseling_open_slots(uuid, integer, integer),
  public.counseling_request_appointment(uuid, uuid, timestamptz, text, text), public.counseling_cancel_appointment(uuid),
  public.counseling_respond_appointment(uuid, text) to authenticated, service_role;

-- ─── Business Launch Center: formation requests ──────────────────────────────────────────────────────────────────────
alter table public.formation_orders
  add column if not exists requested_at timestamptz,
  add column if not exists status_note text check (char_length(status_note) <= 1000);
create index if not exists formation_orders_user on public.formation_orders (user_id, created_at desc);

create or replace function public.guard_formation_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- provider updates run on the server
  -- Owner and finance review a request through formation_order_review(): status and note only, never fees or details.
  if tg_op = 'UPDATE' and current_setting('aoc.formation_review', true) = 'on'
     and public.has_staff_role(array['owner', 'finance']::public.staff_role[]) then
    if (new.user_id, new.business_id, new.provider, new.package, new.government_fee_cents, new.third_party_fee_cents, new.service_charge_cents,
        new.recurring_fees, new.provider_order_ref, new.disclosed_at, new.authorized_at, new.requested_at)
       is distinct from (old.user_id, old.business_id, old.provider, old.package, old.government_fee_cents, old.third_party_fee_cents, old.service_charge_cents,
        old.recurring_fees, old.provider_order_ref, old.disclosed_at, old.authorized_at, old.requested_at) then
      raise exception 'Fees and order details come from the provider.';
    end if;
    if new.status is distinct from old.status then
      if old.requested_at is null then raise exception 'Only requests a member has sent can be reviewed.'; end if;
      if old.status in ('completed', 'cancelled', 'refunded', 'failed') then raise exception 'This order is closed.'; end if;
      if new.status not in ('processing', 'filed', 'completed', 'cancelled', 'failed') then raise exception 'Not permitted'; end if;
    end if;
    return new;
  end if;
  if new.user_id <> auth.uid() or not exists (select 1 from public.member_businesses b where b.id = new.business_id and b.user_id = auth.uid()) then raise exception 'Not permitted'; end if;
  if tg_op = 'INSERT' then
    new.status := 'draft'; new.provider_order_ref := null; new.disclosed_at := null; new.authorized_at := null;
    new.government_fee_cents := null; new.third_party_fee_cents := null; new.service_charge_cents := null;
    new.requested_at := null; new.status_note := null;
    return new;
  end if;
  if (new.government_fee_cents, new.third_party_fee_cents, new.service_charge_cents, new.recurring_fees, new.provider_order_ref, new.disclosed_at)
     is distinct from (old.government_fee_cents, old.third_party_fee_cents, old.service_charge_cents, old.recurring_fees, old.provider_order_ref, old.disclosed_at) then
    raise exception 'Fees and order details come from the provider.';
  end if;
  if new.status_note is distinct from old.status_note then raise exception 'Not permitted'; end if;
  -- Sending the request: once, from a draft. Afterwards its details stay as sent.
  if new.requested_at is distinct from old.requested_at then
    if old.requested_at is not null or new.requested_at is null or old.status <> 'draft' or new.status <> 'draft' then raise exception 'Not permitted'; end if;
    new.requested_at := now();
  end if;
  if old.requested_at is not null and (new.business_id, new.provider, new.package) is distinct from (old.business_id, old.provider, old.package) then
    raise exception 'This request has been sent for review and can no longer be changed.';
  end if;
  if new.status is distinct from old.status then
    if new.status = 'authorized' then
      if old.status <> 'disclosed' then raise exception 'Review every fee before authorizing.'; end if;
      if new.provider = 'bizee' and not coalesce((select value = 'true' from public.platform_settings where key = 'formation_orders_live'), false) then
        raise exception 'Formation orders through a partner are not available yet.';
      end if;
      new.authorized_at := now();
    elsif new.status <> 'cancelled' or old.status not in ('draft', 'disclosed', 'authorized') then
      raise exception 'Not permitted';
    end if;
  end if;
  return new;
end $$;

-- Owner and finance see requests members have sent (and the business each one is for).
drop policy if exists "staff review requests" on public.formation_orders;
create policy "staff review requests" on public.formation_orders for select to authenticated
  using (requested_at is not null and public.has_staff_role(array['owner', 'finance']::public.staff_role[]));
drop policy if exists "staff review requested businesses" on public.member_businesses;
create policy "staff review requested businesses" on public.member_businesses for select to authenticated
  using (public.has_staff_role(array['owner', 'finance']::public.staff_role[])
         and exists (select 1 from public.formation_orders o where o.business_id = member_businesses.id and o.requested_at is not null));

create or replace function public.formation_order_review(p_order uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.formation_orders; label text;
begin
  if not public.has_staff_role(array['owner', 'finance']::public.staff_role[]) then raise exception 'Not permitted'; end if;
  select * into o from public.formation_orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  perform set_config('aoc.formation_review', 'on', true);
  update public.formation_orders set status = coalesce(p_status, status), status_note = nullif(left(trim(coalesce(p_note, '')), 1000), '') where id = p_order;
  perform set_config('aoc.formation_review', 'off', true);
  if p_status is not null and p_status is distinct from o.status then
    label := case p_status when 'processing' then 'being prepared by our team' when 'filed' then 'filed with the state'
      when 'completed' then 'complete' when 'cancelled' then 'closed' when 'failed' then 'unable to proceed' else p_status end;
    insert into public.member_notices (user_id, kind, title, body, href, ref_id)
      values (o.user_id, 'system', 'Your formation request was updated', 'Your request is now ' || label || '. Open it in the Business Launch Center for details.', '/app/launch/orders/' || o.id, o.id)
      on conflict (user_id, kind, ref_id) do update set title = excluded.title, body = excluded.body, href = excluded.href, created_at = now(), read_at = null, popup_seen_at = null;
  end if;
end $$;
revoke all on function public.formation_order_review(uuid, text, text) from public, anon;
grant execute on function public.formation_order_review(uuid, text, text) to authenticated, service_role;
