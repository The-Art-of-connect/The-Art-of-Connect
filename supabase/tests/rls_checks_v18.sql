-- Journey Live: voice transcripts are private and erasable by the member only.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
insert into public.journey_voice_sessions (id, user_id, holder_id, allowed_seconds, transcript, started_at) values
  ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000061', 600, 'You: hello\nJourney: hi', now() - interval '100 days'),
  ('50000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000061', 600, 'You: today\nJourney: welcome', now());
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000062';
\echo 'v18-1) Another member cannot read or erase someone''s transcripts (expect 0|0):'
select (select count(*) from public.journey_voice_sessions), public.journey_delete_voice_transcripts();
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo 'v18-2) The OWNER cannot read members'' voice transcripts (expect 0):'
select count(*) from public.journey_voice_sessions where transcript is not null;
\echo 'v18-3) Members cannot run the retention purge themselves (expect permission denied):'
select public.journey_purge_voice_transcripts();
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v18-4) The member sets a 90-day retention, pace and manual mode (expect 0.90|true|90):'
insert into public.journey_voice_preferences (user_id, speed, manual_mode, transcript_retention_days) values (auth.uid(), 0.9, true, 90)
  on conflict (user_id) do update set speed = 0.9, manual_mode = true, transcript_retention_days = 90;
select speed || '|' || manual_mode || '|' || transcript_retention_days from public.journey_voice_preferences;
\echo 'v18-5) Pace outside the safe range is refused (expect error):'
update public.journey_voice_preferences set speed = 2.5;
reset role;
\echo 'v18-6) The scheduled purge erases only transcripts past the member''s retention (expect t|1):'
select public.journey_purge_voice_transcripts() >= 1 as purged \gset
select :'purged' || '|' || (select count(*) from public.journey_voice_sessions where transcript is not null and id::text like '50000000-%');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000061';
\echo 'v18-7) The member erases their remaining transcript (expect t|0):'
select public.journey_delete_voice_transcripts() >= 1 as erased \gset
select :'erased' || '|' || (select count(*) from public.journey_voice_sessions where transcript is not null);
reset role;
reset request.jwt.claim.sub;
