-- Founder directives 33 and 34: one master professional history, approved résumés, uploads with preserved originals,
-- and the professional-readiness gate for Executive and Elite introductions (built into the existing Résumé Builder).

alter table public.resumes
  add column is_master boolean not null default false,
  add column status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved')),
  add column approved_at timestamptz,
  add column source text not null default 'builder' check (source in ('builder', 'upload', 'journey_enhanced')),
  add column parent_id uuid references public.resumes (id) on delete set null,
  add column upload_id uuid,
  add column opportunity text check (char_length(opportunity) <= 160),
  add column review jsonb not null default '{}' check (jsonb_typeof(review) = 'object');
create unique index resumes_one_master on public.resumes (user_id) where is_master;

-- Originals the member uploads (PDF or Word), kept unchanged in a private bucket.
create table public.resume_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) <= 255),
  mime_type text not null check (mime_type in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  extracted_text text check (char_length(extracted_text) <= 40000),
  created_at timestamptz not null default now()
);
alter table public.resumes add constraint resumes_upload_fk foreign key (upload_id) references public.resume_uploads (id) on delete set null;
alter table public.resume_uploads enable row level security;
create policy "own" on public.resume_uploads for select to authenticated using (user_id = auth.uid());
create policy "remove own" on public.resume_uploads for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.resume_uploads to authenticated;
grant all on public.resume_uploads to service_role;
insert into storage.buckets (id, name, public) values ('resume-uploads', 'resume-uploads', false) on conflict (id) do nothing;
do $$ begin
  update storage.buckets set file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] where id = 'resume-uploads';
exception when undefined_column then null; end $$;
-- Uploads and reads go through the server (service role) after the member is identified; members have no direct storage policies.

-- Approval belongs to the member alone. Journey's enhanced drafts arrive as "pending approval" and stay so until the member approves.
create or replace function public.guard_resume_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      if new.status = 'approved' then new.approved_at := now(); end if;
    end if;
    if new.status <> 'approved' then new.approved_at := null; end if;
  else
    if new.data is distinct from old.data and old.status = 'approved' then
      -- Editing an approved résumé returns it to draft until the member approves the changes.
      new.status := 'draft'; new.approved_at := null;
    elsif new.status = 'approved' and old.status <> 'approved' then
      if auth.uid() is distinct from new.user_id then raise exception 'Only the member approves their résumé.'; end if;
      new.approved_at := now();
    elsif new.status <> 'approved' then
      new.approved_at := null;
    end if;
  end if;
  if new.is_master and new.kind <> 'resume' then raise exception 'A cover letter cannot be the master professional history.'; end if;
  return new;
end $$;
create trigger guard_resume_status before insert or update on public.resumes for each row execute function public.guard_resume_status();

-- Professionally ready: an approved résumé, reviewed within the last year.
create or replace function public.professional_ready(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.resumes r where r.user_id = p and r.kind = 'resume' and r.status = 'approved' and r.approved_at > now() - interval '365 days');
$$;
grant execute on function public.professional_ready(uuid) to authenticated, service_role;

-- Directive 34: Executive and Elite members need an approved résumé on file before initiating professional introductions
-- (collaboration and proposal requests). Nothing else in the membership is blocked.
create or replace function business.guard_collaboration_request()
returns trigger language plpgsql security definer set search_path = business, public as $$
declare f text[]; v business.proposal_versions;
begin
  f := public.shield_findings(concat_ws(' ', new.project, new.reason, new.shared_info));
  if cardinality(f) > 0 then raise exception 'SAFETY_SHIELD:%', array_to_string(f, ',') using errcode = 'P0001'; end if;
  if new.kind <> 'connection' then
    if public.intel_level(new.requester_id) is null then raise exception 'Business collaboration requests are part of Executive Private and Elite Concierge.'; end if;
    if not public.professional_ready(new.requester_id) then
      raise exception 'Please approve your professional résumé before sending introductions. Everything else in your membership stays available.';
    end if;
    if not exists (select 1 from business.profiles p where p.user_id = new.recipient_id and p.collab_opt_in and p.collab_welcome_requests) then
      raise exception 'This member is not accepting business collaboration requests.';
    end if;
  end if;
  if new.kind = 'proposal' then
    select * into v from business.proposal_versions where proposal_id = new.proposal_id and version = new.proposal_version;
    if v.id is null or v.status <> 'authorized' then raise exception 'Authorize this proposal version before sharing it.'; end if;
    if not exists (select 1 from business.proposals p where p.id = new.proposal_id and p.author_id = new.requester_id) then raise exception 'Not permitted'; end if;
    update business.proposals set status = 'shared' where id = new.proposal_id and status in ('authorized', 'revising');
  end if;
  return new;
end $$;

insert into public.dev_tracker (key, area, title, detail, status, next_step, sort_order, designed, built, tests_passed, merged, deployed, operational, awaiting) values
  ('professional-readiness', 'CONNECT 360', 'Professional résumé requirement and readiness dashboard (directives 33–34)',
   'Upload (PDF or Word, original preserved), build, or approve a saved résumé; Journey enhancement for paid members asks questions instead of inventing; member approval required; one master history plus tailored versions; readiness dashboard from real data; approved résumé required only for professional introductions and applications; annual review prompts.',
   'built', 'Owner: try all three options with a fictional Executive test account.', 494, true, true, true, false, false, false, null),
  ('opportunity-radar', 'CONNECT 360', 'Opportunity Radar and Application Center (directives 32–33)',
   'Official-source discovery (casting, sports, executive, board, contracting and more), readiness comparison against the member''s authorized portfolio, application packages for member approval, consent before any external submission, tracking and preparation.',
   'designed', 'Needs the research providers enabled (testing budget approved) and approved sources.', 495, true, false, false, false, false, false, null)
on conflict (key) do nothing;
