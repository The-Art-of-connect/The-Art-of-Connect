-- Voice model comparison: each voice conversation records its model and that model's rate,
-- and the usage OpenAI reported (seconds for GPT-Live; tokens for Realtime) so the owner can compare real expenses.
alter table public.journey_voice_sessions
  add column if not exists model text check (model is null or model ~ '^[A-Za-z0-9._:-]{2,80}$'),
  add column if not exists cents_per_minute numeric(12, 4) check (cents_per_minute is null or cents_per_minute >= 0),
  add column if not exists provider_usage jsonb,
  add column if not exists provider_cost_cents numeric(12, 4) check (provider_cost_cents is null or provider_cost_cents >= 0);

-- Ends a voice conversation: time measured by the server, capped at what was allowed, priced at the session's own model rate.
create or replace function public.journey_voice_end(p_id uuid, p_user uuid, p_transcript text)
returns integer language plpgsql security definer set search_path = public as $$
declare v public.journey_voice_sessions; s public.journey_settings; secs integer;
begin
  select * into v from public.journey_voice_sessions where id = p_id and user_id = p_user for update;
  if v.id is null or v.ended_at is not null then return 0; end if;
  select * into s from public.journey_settings;
  secs := least(v.allowed_seconds, greatest(0, extract(epoch from now() - v.started_at)::integer));
  update public.journey_voice_sessions set ended_at = now(), seconds_used = secs,
    cost_cents = round(coalesce(v.cents_per_minute, s.voice_cents_per_minute, 0) * secs / 60.0, 4), transcript = nullif(left(p_transcript, 100000), '')
    where id = v.id;
  return secs;
end $$;
revoke all on function public.journey_voice_end(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.journey_voice_end(uuid, uuid, text) to service_role;
