-- ════════════════════════════════════════════════════════════════════
-- Legal & Policy Center
--
--   legal_documents          one row per policy (Terms, Privacy, …)
--   legal_document_versions  every version, with workflow status:
--       draft → pending_owner_review → pending_legal_review → approved
--       → scheduled (future effective time) / published → archived
--   legal_acceptances        permanent evidence of each acceptance:
--       member, exact version, text fingerprint, time, context, method
--   legal_compliance_items   launch requirements and owner decisions
--   legal_audit_log          every change, who made it, before and after
--
-- Rules enforced by the database (not only the portal):
--   • Only the owner can approve, schedule or publish, and publication
--     requires a recorded attorney approval.
--   • Approved / scheduled / published / archived text can never change;
--     edits start a new draft version.
--   • The public sees only documents in effect. Drafts stay private.
--   • Acceptances can be recorded only against a version in effect and
--     can never be altered or deleted.
-- ════════════════════════════════════════════════════════════════════

create type public.legal_status as enum ('draft', 'pending_owner_review', 'pending_legal_review', 'approved', 'scheduled', 'published', 'archived');

create table public.legal_documents (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null check (length(title) between 1 and 160),
  category text not null check (category in ('core', 'membership', 'safety', 'privacy', 'professional', 'disclaimer', 'company')),
  summary text not null default '' check (length(summary) <= 400),
  consent_key text not null unique check (consent_key ~ '^[a-z_]{2,40}$'),
  -- Where acceptance is required: registration, checkout, couples, professional.
  required_at text[] not null default '{}' check (required_at <@ array['registration', 'checkout', 'couples', 'professional']),
  brands text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_legal_documents before update on public.legal_documents for each row execute function public.touch_updated_at();

create table public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_slug text not null references public.legal_documents (slug) on update cascade on delete restrict,
  version_label text not null check (version_label ~ '^[A-Za-z0-9._-]{1,40}$'),
  title text not null check (length(title) between 1 and 160),
  summary text not null default '' check (length(summary) <= 400),
  body text not null check (length(body) <= 250000),
  body_sha256 text not null default '',
  change_summary text check (length(change_summary) <= 2000),
  status public.legal_status not null default 'draft',
  effective_date date,
  scheduled_for timestamptz,
  requires_reacceptance boolean not null default false,
  legal_reviewer text check (length(legal_reviewer) <= 200),
  legal_review_requested_at timestamptz,
  legal_approved_by_name text check (length(legal_approved_by_name) <= 200),
  legal_approved_at timestamptz,
  legal_approval_note text check (length(legal_approval_note) <= 2000),
  owner_approved_by uuid references public.profiles (id),
  owner_approved_at timestamptz,
  published_by uuid references public.profiles (id),
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_slug, version_label)
);
create index legal_versions_doc_idx on public.legal_document_versions (document_slug, created_at desc);
create unique index legal_one_published on public.legal_document_versions (document_slug) where status = 'published';
create trigger touch_legal_versions before update on public.legal_document_versions for each row execute function public.touch_updated_at();

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  accepted_email text,
  document_slug text not null references public.legal_documents (slug) on update cascade,
  version_id uuid not null references public.legal_document_versions (id) on delete restrict,
  version_label text not null,
  body_sha256 text not null,
  context text not null check (context in ('registration', 'checkout', 'couples', 'professional_application', 'reacceptance')),
  method text not null default 'checkbox' check (method in ('checkbox', 'click_through')),
  statement text not null check (length(statement) <= 1000),
  ip_hash text check (ip_hash ~ '^[0-9a-f]{16,64}$'),
  user_agent text check (length(user_agent) <= 300),
  accepted_at timestamptz not null default now()
);
create index legal_acceptances_user_idx on public.legal_acceptances (user_id, document_slug, accepted_at desc);
create index legal_acceptances_doc_idx on public.legal_acceptances (document_slug, accepted_at desc);

create table public.legal_compliance_items (
  key text primary key check (key ~ '^[a-z0-9:_-]{2,60}$'),
  kind text not null check (kind in ('requirement', 'decision')),
  area text not null,
  title text not null,
  description text not null default '',
  related_documents text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'not_applicable')),
  owner_decision text check (length(owner_decision) <= 4000),
  notes text check (length(notes) <= 4000),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create trigger touch_legal_compliance before update on public.legal_compliance_items for each row execute function public.touch_updated_at();

create table public.legal_audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  actor_roles text,
  source text not null,
  table_name text not null,
  record_key text not null,
  operation text not null,
  changed_fields text[] not null default '{}',
  previous_values jsonb,
  new_values jsonb
);
create index legal_audit_recent_idx on public.legal_audit_log (occurred_at desc);

-- ─── Who may do what ───────────────────────────────────────────────
-- Editors (prepare drafts, request reviews, manage the checklist): owner, executive.
create or replace function public.is_legal_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_staff_role(array['owner','executive']::public.staff_role[]);
$$;
grant execute on function public.is_legal_editor() to authenticated;

-- ─── Workflow guard on versions ────────────────────────────────────
create or replace function public.guard_legal_version()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  locked constant public.legal_status[] := array['approved','scheduled','published','archived']::public.legal_status[];
  privileged boolean := auth.uid() is null; -- database maintenance / migrations
begin
  new.body_sha256 := encode(digest(new.body, 'sha256'), 'hex');

  if tg_op = 'INSERT' then
    if new.status <> 'draft' and not privileged then
      raise exception 'New versions start as drafts';
    end if;
    new.created_by := coalesce(new.created_by, auth.uid());
    return new;
  end if;

  -- Approved text is final: start a new draft to change it.
  if old.status = any (locked) and (new.body is distinct from old.body or new.title is distinct from old.title
      or new.summary is distinct from old.summary or new.version_label is distinct from old.version_label) then
    raise exception 'Approved, scheduled, published and archived versions cannot be edited — create a new draft';
  end if;

  if new.status is distinct from old.status and not privileged then
    if new.status in ('approved', 'scheduled', 'published') and not public.is_owner() then
      raise exception 'Only the owner can approve, schedule or publish legal documents';
    end if;
    if new.status in ('scheduled', 'published') and new.legal_approved_at is null then
      raise exception 'Record the attorney''s approval before scheduling or publishing';
    end if;
    if new.status = 'scheduled' and (new.scheduled_for is null or new.scheduled_for <= now()) then
      raise exception 'Choose a future date and time to schedule publication';
    end if;
    if old.status = 'archived' then
      raise exception 'Archived versions stay archived — create a new draft';
    end if;
    if new.status = 'approved' then
      new.owner_approved_by := auth.uid();
      new.owner_approved_at := now();
    elsif new.status = 'published' then
      new.published_by := auth.uid();
      new.published_at := now();
      new.effective_date := coalesce(new.effective_date, current_date);
    elsif new.status = 'archived' then
      new.archived_at := now();
    end if;
  end if;
  -- Recording an attorney approval is owner-only too.
  if (new.legal_approved_at is distinct from old.legal_approved_at or new.legal_approved_by_name is distinct from old.legal_approved_by_name)
     and not privileged and not public.is_owner() then
    raise exception 'Only the owner can record attorney approval';
  end if;
  return new;
end;
$$;
create trigger guard_legal_version before insert or update on public.legal_document_versions
  for each row execute function public.guard_legal_version();

-- Publishing archives the version previously in effect.
create or replace function public.archive_superseded_legal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    update public.legal_document_versions
       set status = 'archived'
     where document_slug = new.document_slug and id <> new.id and status = 'published';
  end if;
  return new;
end;
$$;
create trigger archive_superseded_legal before update on public.legal_document_versions
  for each row when (new.status = 'published') execute function public.archive_superseded_legal();

-- The version in effect: the latest published one, or a scheduled one whose time has come.
create or replace function public.legal_version_in_effect(doc text)
returns public.legal_document_versions language sql stable security definer set search_path = public as $$
  select v.* from public.legal_document_versions v
   where v.document_slug = doc
     and (v.status = 'published' or (v.status = 'scheduled' and v.scheduled_for <= now()))
   order by coalesce(v.scheduled_for, v.published_at) desc nulls last
   limit 1;
$$;
revoke execute on function public.legal_version_in_effect(text) from public, anon, authenticated;

-- Public Legal & Policy Center: documents in effect only. Drafts are never exposed.
create or replace function public.get_public_legal(doc text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'slug', d.slug, 'title', coalesce(v.title, d.title), 'category', d.category, 'summary', coalesce(v.summary, d.summary),
      'in_effect', v.id is not null,
      'version', v.version_label, 'effective_date', coalesce(v.effective_date, (v.scheduled_for)::date),
      'body', case when doc is not null then v.body end)
      order by d.sort_order), '[]'::jsonb)
  from public.legal_documents d
  left join lateral public.legal_version_in_effect(d.slug) v on true
  where doc is null or d.slug = doc;
$$;
grant execute on function public.get_public_legal(text) to anon, authenticated;

-- ─── Acceptance ────────────────────────────────────────────────────
-- Records acceptance of the versions currently in effect for the signed-in
-- member. Refuses if any requested document has no version in effect.
create or replace function public.record_legal_acceptance(docs text[], ctx text, statement text, ip_hash text default null, user_agent text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  d text;
  v public.legal_document_versions;
  n integer := 0;
begin
  if uid is null then raise exception 'Sign in to accept agreements'; end if;
  if coalesce(array_length(docs, 1), 0) = 0 then raise exception 'No documents to accept'; end if;
  foreach d in array docs loop
    v := public.legal_version_in_effect(d);
    if v.id is null then
      raise exception 'The % is not yet in effect and cannot be accepted', d;
    end if;
    insert into public.legal_acceptances (user_id, accepted_email, document_slug, version_id, version_label, body_sha256, context, statement, ip_hash, user_agent)
    values (uid, (select email::text from public.profiles where id = uid), d, v.id, v.version_label, v.body_sha256, ctx, statement, ip_hash, left(user_agent, 300));
    n := n + 1;
  end loop;
  return n;
end;
$$;
grant execute on function public.record_legal_acceptance(text[], text, text, text, text) to authenticated;

-- Registration: the account is created by the server, so acceptance is
-- recorded by the server for the new account in the same request.
create or replace function public.record_legal_acceptance_for(target uuid, docs text[], ctx text, statement text, ip_hash text default null, user_agent text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  d text;
  v public.legal_document_versions;
  n integer := 0;
begin
  if target is null then raise exception 'No account'; end if;
  foreach d in array docs loop
    v := public.legal_version_in_effect(d);
    if v.id is null then
      raise exception 'The % is not yet in effect and cannot be accepted', d;
    end if;
    insert into public.legal_acceptances (user_id, accepted_email, document_slug, version_id, version_label, body_sha256, context, statement, ip_hash, user_agent)
    values (target, (select email::text from public.profiles where id = target), d, v.id, v.version_label, v.body_sha256, ctx, statement, ip_hash, left(user_agent, 300));
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.record_legal_acceptance_for(uuid, text[], text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_legal_acceptance_for(uuid, text[], text, text, text, text) to service_role;

-- Which in-effect documents the signed-in person still needs to accept.
create or replace function public.pending_legal_acceptances()
returns table (slug text, title text, version_label text, reason text)
language sql stable security definer set search_path = public as $$
  with me as (
    select p.id, p.account_type,
           exists (select 1 from public.subscriptions s where s.user_id = p.id and s.couples_upgrade and s.status in ('active','trialing','past_due')) as couples
    from public.profiles p where p.id = auth.uid()
  )
  select d.slug, v.title, v.version_label,
         case when not exists (select 1 from public.legal_acceptances a where a.user_id = me.id and a.document_slug = d.slug)
              then 'not_yet_accepted' else 'updated' end
  from me
  join public.legal_documents d on (
        (me.account_type = 'professional' and 'professional' = any (d.required_at))
     or (me.account_type <> 'professional' and 'registration' = any (d.required_at))
     or (me.couples and 'couples' = any (d.required_at)))
  cross join lateral public.legal_version_in_effect(d.slug) v
  where v.id is not null
    and me.account_type <> 'staff'
    and (not exists (select 1 from public.legal_acceptances a where a.user_id = me.id and a.document_slug = d.slug)
         or (v.requires_reacceptance and not exists (select 1 from public.legal_acceptances a where a.user_id = me.id and a.version_id = v.id)));
$$;
grant execute on function public.pending_legal_acceptances() to authenticated;

-- Acceptance evidence is permanent. The only permitted change is the
-- automatic removal of the member link when an account is deleted.
create or replace function public.legal_acceptance_immutable()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.user_id is null and old.user_id is not null
     and (to_jsonb(new) - 'user_id') = (to_jsonb(old) - 'user_id') then
    return new;
  end if;
  raise exception 'Acceptance records cannot be changed or deleted';
end;
$$;
create trigger legal_acceptance_no_change before update or delete on public.legal_acceptances
  for each row execute function public.legal_acceptance_immutable();

-- ─── Legal audit trail (who, before, after, when) ──────────────────
create or replace function public.log_legal_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_j jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  new_j jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
  keys text[];
  prev jsonb := '{}';
  next jsonb := '{}';
  k text;
  uid uuid := auth.uid();
  summarize constant text[] := array['body'];
begin
  select array_agg(x order by x) into keys from (select jsonb_object_keys(coalesce(new_j, old_j)) x) s
   where x not in ('updated_at', 'created_at', 'body_sha256')
     and (tg_op <> 'UPDATE' or (old_j -> x) is distinct from (new_j -> x));
  if tg_op = 'UPDATE' and keys is null then return new; end if;
  foreach k in array coalesce(keys, '{}') loop
    -- Long text is summarized by its fingerprint and length, not copied.
    if k = any (summarize) then
      if old_j is not null then prev := prev || jsonb_build_object(k, jsonb_build_object('sha256', old_j ->> 'body_sha256', 'characters', length(old_j ->> k))); end if;
      if new_j is not null then next := next || jsonb_build_object(k, jsonb_build_object('sha256', new_j ->> 'body_sha256', 'characters', length(new_j ->> k))); end if;
    else
      if old_j is not null then prev := prev || jsonb_build_object(k, old_j -> k); end if;
      if new_j is not null then next := next || jsonb_build_object(k, new_j -> k); end if;
    end if;
  end loop;
  insert into public.legal_audit_log (actor_id, actor_email, actor_roles, source, table_name, record_key, operation, changed_fields, previous_values, new_values)
  values (uid, (select email::text from public.profiles where id = uid),
          (select string_agg(role::text, ', ' order by role) from public.staff_roles where user_id = uid),
          case when uid is null then 'system' else 'owner_portal' end,
          tg_table_name, coalesce(coalesce(new_j, old_j) ->> tg_argv[0], '?'), tg_op, coalesce(keys, '{}'),
          case when tg_op = 'INSERT' then null else prev end, case when tg_op = 'DELETE' then null else next end);
  return coalesce(new, old);
end;
$$;
create trigger audit_legal_documents after insert or update or delete on public.legal_documents
  for each row execute function public.log_legal_change('slug');
create trigger audit_legal_versions after insert or update or delete on public.legal_document_versions
  for each row execute function public.log_legal_change('id');
create trigger audit_legal_compliance after insert or update or delete on public.legal_compliance_items
  for each row execute function public.log_legal_change('key');
create trigger audit_legal_acceptances after insert on public.legal_acceptances
  for each row execute function public.log_legal_change('id');

create or replace function public.legal_audit_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'The legal audit trail cannot be changed or deleted';
end;
$$;
create trigger legal_audit_no_change before update or delete on public.legal_audit_log
  for each row execute function public.legal_audit_immutable();
create trigger legal_audit_no_truncate before truncate on public.legal_audit_log
  for each statement execute function public.legal_audit_immutable();

-- ─── Row-level security and explicit grants ───────────────────────
alter table public.legal_documents enable row level security;
alter table public.legal_document_versions enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.legal_compliance_items enable row level security;
alter table public.legal_audit_log enable row level security;

create policy "editors read" on public.legal_documents for select using (public.is_legal_editor());
create policy "owner manages" on public.legal_documents for all using (public.is_owner()) with check (public.is_owner());

create policy "editors read" on public.legal_document_versions for select using (public.is_legal_editor());
create policy "editors draft" on public.legal_document_versions for insert with check (public.is_legal_editor());
create policy "editors update" on public.legal_document_versions for update using (public.is_legal_editor()) with check (public.is_legal_editor());
create policy "owner deletes drafts" on public.legal_document_versions for delete using (public.is_owner() and status = 'draft');

create policy "own or owner reads" on public.legal_acceptances for select
  using (user_id = auth.uid() or public.has_staff_role(array['owner','executive']::public.staff_role[]));

create policy "editors read" on public.legal_compliance_items for select using (public.is_legal_editor());
create policy "editors update" on public.legal_compliance_items for update using (public.is_legal_editor()) with check (public.is_legal_editor());
create policy "owner adds" on public.legal_compliance_items for insert with check (public.is_owner());

create policy "owner reads" on public.legal_audit_log for select using (public.has_staff_role(array['owner','executive']::public.staff_role[]));

revoke all on public.legal_documents, public.legal_document_versions, public.legal_acceptances, public.legal_compliance_items, public.legal_audit_log from anon, authenticated;
grant select, insert, update on public.legal_documents to authenticated;
grant select, insert, update, delete on public.legal_document_versions to authenticated;
grant select on public.legal_acceptances to authenticated;   -- inserts only through record_legal_acceptance()
grant select, insert, update on public.legal_compliance_items to authenticated;
grant select on public.legal_audit_log to authenticated;
grant all on public.legal_documents, public.legal_document_versions, public.legal_acceptances, public.legal_compliance_items to service_role;
grant select, insert on public.legal_audit_log to service_role;
