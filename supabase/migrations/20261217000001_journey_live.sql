-- Journey Live — personal real-time voice conversations.
-- Owner controls for Journey's default voice, speaking speed, response depth and
-- patient turn-taking; member controls for pace, manual speaking mode and
-- transcript retention. Raw audio is never stored. Transcripts stay private to
-- the member and can be deleted at any time.

alter table public.journey_settings
  add column if not exists voice_default text not null default 'marin' check (voice_default in ('alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'marin', 'sage', 'shimmer', 'verse')),
  add column if not exists voice_speed numeric(3, 2) not null default 1.00 check (voice_speed between 0.70 and 1.30),
  add column if not exists voice_depth text not null default 'complete' check (voice_depth in ('balanced', 'complete', 'in_depth')),
  add column if not exists voice_eagerness text not null default 'low' check (voice_eagerness in ('low', 'medium', 'auto')),
  add column if not exists voice_noise_reduction text not null default 'near_field' check (voice_noise_reduction in ('near_field', 'far_field', 'off')),
  add column if not exists voice_transcribe_model text not null default 'gpt-4o-mini-transcribe' check (voice_transcribe_model ~ '^[A-Za-z0-9._:-]{2,80}$');

alter table public.journey_voice_preferences
  add column if not exists speed numeric(3, 2) not null default 1.00 check (speed between 0.70 and 1.30),
  add column if not exists manual_mode boolean not null default false,
  add column if not exists transcript_retention_days integer default 90 check (transcript_retention_days is null or transcript_retention_days between 1 and 3650);

alter table public.journey_voice_sessions
  add column if not exists conversation_id uuid references public.journey_conversations (id) on delete set null,
  add column if not exists mode text check (mode in ('business', 'life', 'love', 'concierge'));

-- Members may erase their own voice transcripts (one or all). Nobody else can read them.
create or replace function public.journey_delete_voice_transcripts(p_session uuid default null)
returns integer language sql security definer set search_path = public as $$
  with u as (
    update public.journey_voice_sessions set transcript = null
    where user_id = auth.uid() and transcript is not null and (p_session is null or id = p_session)
    returning 1)
  select count(*)::integer from u;
$$;
revoke all on function public.journey_delete_voice_transcripts(uuid) from public, anon;
grant execute on function public.journey_delete_voice_transcripts(uuid) to authenticated;

-- Retention: transcripts older than each member's chosen period are erased (run by the scheduled job).
create or replace function public.journey_purge_voice_transcripts()
returns integer language sql security definer set search_path = public as $$
  with u as (
    update public.journey_voice_sessions v set transcript = null
    from public.journey_voice_preferences p
    where p.user_id = v.user_id and v.transcript is not null and p.transcript_retention_days is not null
      and v.started_at < now() - make_interval(days => p.transcript_retention_days)
    returning 1)
  select count(*)::integer from u;
$$;
revoke all on function public.journey_purge_voice_transcripts() from public, anon, authenticated;
grant execute on function public.journey_purge_voice_transcripts() to service_role;
