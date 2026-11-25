-- Customize Your Journey: preferences are private; previews are readable by signed-in members, writable by the owner only.
reset role;
reset request.jwt.claim.sub;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000051';
\echo 'v24-1) A member saves their own preferences (expect masculine|cedar|calm):'
insert into public.journey_voice_preferences (user_id, presentation, voice, personality) values (auth.uid(), 'masculine', 'cedar', 'calm');
select presentation || '|' || voice || '|' || personality from public.journey_voice_preferences;
\echo 'v24-2) An unsupported voice is refused (expect error):'
update public.journey_voice_preferences set voice = 'celebrity';
\echo 'v24-3) A member cannot add a voice preview (expect error):'
insert into public.journey_voice_previews (voice, audio_base64) values ('alloy', 'abc');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000052';
\echo 'v24-4) Another member cannot see those preferences (expect 0):'
select count(*) from public.journey_voice_preferences;
reset role;
