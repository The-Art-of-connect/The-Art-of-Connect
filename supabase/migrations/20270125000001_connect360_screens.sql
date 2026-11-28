-- CONNECT 360 member screens: privacy-preserving read functions (limited fields only; business profiles stay private otherwise).

-- Members who opted in and welcome collaboration requests, for Executive and Elite viewers. Only collaboration fields are returned.
create or replace function business.collab_directory()
returns table (user_id uuid, display text, industry text, interests text[], regions text[], summary text, owns_business boolean)
language sql stable security definer set search_path = business, public as $$
  select p.user_id, coalesce(nullif(p.display_name, ''), nullif(p.company, ''), 'A Professional Society member'), p.industry,
         p.collab_interests, p.collab_regions, p.collab_summary, p.collab_owns_business
  from business.profiles p join public.profiles u on u.id = p.user_id
  where public.intel_level(auth.uid()) is not null
    and p.collab_opt_in and p.collab_welcome_requests and u.status = 'active'
    and p.user_id <> auth.uid() and not public.is_blocked_between(auth.uid(), p.user_id)
  order by p.collab_updated_at desc nulls last
  limit 200;
$$;
grant execute on function business.collab_directory() to authenticated;

-- People in a Deal Room, visible only to its participants (names and roles; advisors show their credential review state).
create or replace function business.room_people(room uuid)
returns table (participant_id uuid, user_id uuid, display text, role text, advisor_type text, client_id uuid, status text, credential text)
language sql stable security definer set search_path = business, public as $$
  select rp.id, rp.user_id,
         coalesce(nullif(bp.display_name, ''), nullif(bp.company, ''), nullif(u.display_name, ''), 'Participant'),
         rp.role, rp.advisor_type, rp.client_id, rp.status,
         case when rp.role = 'advisor' then coalesce((select ac.status from business.advisor_credentials ac where ac.user_id = rp.user_id and ac.advisor_type = rp.advisor_type order by (ac.status = 'verified') desc limit 1), 'not_submitted') end
  from business.room_participants rp
  join public.profiles u on u.id = rp.user_id
  left join business.profiles bp on bp.user_id = rp.user_id
  where rp.room_id = room and business.room_role(room) is not null and rp.status in ('invited', 'active')
  order by case rp.role when 'owner' then 0 when 'principal' then 1 else 2 end, rp.created_at;
$$;
grant execute on function business.room_people(uuid) to authenticated;

-- Members the viewer may invite as Deal Room principals: an accepted business conversation, a paid membership, no block.
create or replace function business.my_collaborators()
returns table (user_id uuid, display text)
language sql stable security definer set search_path = business, public as $$
  select distinct o.uid, coalesce(nullif(bp.display_name, ''), nullif(bp.company, ''), 'A Professional Society member')
  from (select case when c.requester_id = auth.uid() then c.recipient_id else c.requester_id end uid
        from business.conversations c where c.status = 'accepted' and auth.uid() in (c.requester_id, c.recipient_id)) o
  left join business.profiles bp on bp.user_id = o.uid
  where public.has_paid_membership(o.uid) and not public.is_blocked_between(auth.uid(), o.uid);
$$;
grant execute on function business.my_collaborators() to authenticated;

insert into public.qa_features (key, department, title, tracker_key, href, purpose, steps, expected, sort) values
  ('c360-collaboration', 'professional', 'CONNECT 360 collaboration', 'bd-foundation', '/app/connect360/collaborate',
    'Purpose-specific collaboration requests between consenting Executive and Elite members.',
    array['As fictional Executive member A, approve a résumé, then save collaboration preferences (opt in, welcome requests).', 'As fictional Executive member B, find A in the directory and send a request; try including a phone number or "seeking investors": both are refused with a clear message.', 'As A, ask for more information, then accept to discuss; confirm the note that accepting is not an agreement.', 'Either member withdraws: the conversation closes.']::text[],
    'Only opted-in members appear; requests carry purpose, project and reason.', 493),
  ('c360-deal-rooms', 'professional', 'CONNECT 360 Deal Rooms', 'bd-foundation', '/app/connect360/rooms',
    'Confidential workspaces with per-party advisors, plans, discussion and scanned documents.',
    array['As A, create a Deal Room and invite B (after an accepted conversation); B joins.', 'Each creates a private advisor invitation; open each link with a separate fictional advisor account.', 'Confirm each advisor sees the shared space and only their own client''s private space.', 'Add plan items and messages in both spaces; add a document and attach a fictional PDF (testing storage): it opens only after the security check passes.', 'An attorney records Reviewed; a non-attorney cannot.', 'B withdraws: B''s advisors are removed too.']::text[],
    'Participant-, space- and document-level permissions hold; nothing is binding.', 494)
on conflict (key) do nothing;
