-- Couples moments: date invitations, private planning and surprises.
--  • A date invitation proposes a date and time; nothing is planned until the
--    partner accepts. The partner can accept, decline kindly or suggest
--    another time. Acceptance places it on the shared calendar.
--  • Planning notes belong to the planner alone (reservations, flowers, details).
--  • Surprises (flowers, gifts, notes) need no request. They stay completely
--    hidden from the partner until the chosen reveal time; even then the
--    partner sees only the title and message — never the planner's notes.
-- Couples only; singles matchmaking is unaffected.

create table relationships.date_invitations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references relationships.couples (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'dinner' check (kind in ('dinner', 'date_night', 'weekend', 'trip', 'activity', 'celebration', 'other')),
  title text not null check (char_length(title) between 2 and 120),
  message text check (char_length(message) <= 1000),
  keep_secret boolean not null default false,
  proposed_at timestamptz not null,
  duration_minutes integer not null default 180 check (duration_minutes between 30 and 4320),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'new_time', 'canceled')),
  response_note text check (char_length(response_note) <= 500),
  suggested_at timestamptz,
  event_id uuid references relationships.couple_events (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index date_invitations_couple on relationships.date_invitations (couple_id, created_at desc);

create table relationships.date_plans (
  invitation_id uuid primary key references relationships.date_invitations (id) on delete cascade,
  planner uuid not null references public.profiles (id) on delete cascade,
  notes text check (char_length(notes) <= 4000),
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 30),
  updated_at timestamptz not null default now()
);

create table relationships.surprises (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references relationships.couples (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'flowers' check (kind in ('flowers', 'gift', 'love_note', 'experience', 'breakfast', 'other')),
  title text not null check (char_length(title) between 2 and 120),
  message text check (char_length(message) <= 1000),
  private_notes text check (char_length(private_notes) <= 4000),
  reveal_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index surprises_couple on relationships.surprises (couple_id, reveal_at);

alter table relationships.date_invitations enable row level security;
alter table relationships.date_plans enable row level security;
alter table relationships.surprises enable row level security;

-- Invitations: both partners can read; only the sender creates (to their own partner).
create policy "partners read invitations" on relationships.date_invitations for select
  using (relationships.is_couple_member(couple_id));
create policy "invite my partner" on relationships.date_invitations for insert
  with check (from_user = auth.uid() and status = 'pending' and relationships.is_couple_member(couple_id)
              and public.has_experience('relationships')
              and exists (select 1 from relationships.couple_members m where m.couple_id = date_invitations.couple_id and m.user_id = to_user));
-- Plans and surprises: the planner alone.
create policy "planner only" on relationships.date_plans for all
  using (planner = auth.uid()) with check (planner = auth.uid()
    and exists (select 1 from relationships.date_invitations i where i.id = invitation_id and i.from_user = auth.uid()));
create policy "planner only" on relationships.surprises for all
  using (from_user = auth.uid()) with check (from_user = auth.uid() and relationships.is_couple_member(couple_id) and public.has_experience('relationships'));

-- Responding: only the invited partner; acceptance places it on the shared calendar.
create or replace function relationships.respond_date_invitation(p_id uuid, p_decision text, p_note text default null, p_suggested timestamptz default null)
returns text language plpgsql security definer set search_path = public, relationships as $$
declare inv relationships.date_invitations; ev uuid;
begin
  select * into inv from relationships.date_invitations where id = p_id for update;
  if inv.id is null or inv.to_user is distinct from auth.uid() then raise exception 'Invitation not found'; end if;
  if inv.status <> 'pending' then raise exception 'This invitation has already been answered'; end if;
  if p_decision = 'accepted' then
    insert into relationships.couple_events (couple_id, created_by, kind, title, notes, starts_at, ends_at)
    values (inv.couple_id, inv.from_user,
            case inv.kind when 'trip' then 'trip' when 'weekend' then 'trip' when 'celebration' then 'anniversary' when 'activity' then 'activity' else 'date_night' end,
            case when inv.keep_secret then 'Date — details are a surprise' else inv.title end, null,
            inv.proposed_at, inv.proposed_at + make_interval(mins => inv.duration_minutes))
    returning id into ev;
    update relationships.date_invitations set status = 'accepted', event_id = ev, response_note = left(p_note, 500), responded_at = now() where id = p_id;
  elsif p_decision = 'declined' then
    update relationships.date_invitations set status = 'declined', response_note = left(p_note, 500), responded_at = now() where id = p_id;
  elsif p_decision = 'new_time' then
    if p_suggested is null or p_suggested < now() then raise exception 'Please suggest a future date and time'; end if;
    update relationships.date_invitations set status = 'new_time', suggested_at = p_suggested, response_note = left(p_note, 500), responded_at = now() where id = p_id;
  else
    raise exception 'Unknown response';
  end if;
  return p_decision;
end $$;
revoke all on function relationships.respond_date_invitation(uuid, text, text, timestamptz) from public, anon;
grant execute on function relationships.respond_date_invitation(uuid, text, text, timestamptz) to authenticated;

-- The sender may cancel their own pending invitation.
create or replace function relationships.cancel_date_invitation(p_id uuid)
returns void language sql security definer set search_path = public, relationships as $$
  update relationships.date_invitations set status = 'canceled'
  where id = p_id and from_user = auth.uid() and status in ('pending', 'new_time');
$$;
revoke all on function relationships.cancel_date_invitation(uuid) from public, anon;
grant execute on function relationships.cancel_date_invitation(uuid) to authenticated;

-- What the partner may see of surprises: only revealed ones, only title and message.
create or replace function relationships.my_revealed_surprises()
returns table (id uuid, kind text, title text, message text, reveal_at timestamptz, from_me boolean)
language sql stable security definer set search_path = public, relationships as $$
  select s.id, s.kind, s.title, s.message, s.reveal_at, false
  from relationships.surprises s
  join relationships.couple_members me on me.couple_id = s.couple_id and me.user_id = auth.uid()
  where s.from_user <> auth.uid() and s.reveal_at <= now()
  order by s.reveal_at desc limit 50;
$$;
revoke all on function relationships.my_revealed_surprises() from public, anon;
grant execute on function relationships.my_revealed_surprises() to authenticated;

-- Invitations can't be edited directly (responses go through the function).
revoke all on relationships.date_invitations, relationships.date_plans, relationships.surprises from public, anon;
grant select, insert on relationships.date_invitations to authenticated;
grant select, insert, update, delete on relationships.date_plans, relationships.surprises to authenticated;
grant all on relationships.date_invitations, relationships.date_plans, relationships.surprises to service_role;
