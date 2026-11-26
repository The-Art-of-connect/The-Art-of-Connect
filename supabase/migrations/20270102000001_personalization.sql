-- Customize Your Journey: GPT-Live's regional and multilingual voices, more languages with automatic detection,
-- and masculine or feminine presentation. Voice previews can be recorded from GPT-Live (any audio format).
update public.journey_voice_preferences set presentation = 'feminine', voice = case when voice = 'alloy' then 'marin' else voice end where presentation = 'neutral' or voice = 'alloy';
alter table public.journey_voice_preferences drop constraint if exists journey_voice_preferences_presentation_check;
alter table public.journey_voice_preferences add constraint journey_voice_preferences_presentation_check check (presentation in ('feminine', 'masculine'));
alter table public.journey_voice_preferences drop constraint if exists journey_voice_preferences_voice_check;
alter table public.journey_voice_preferences add constraint journey_voice_preferences_voice_check check (voice in ('marin', 'coral', 'shimmer', 'sage', 'cedar', 'ash', 'echo', 'verse', 'ballad', 'pearl', 'quartz', 'ripple', 'halo', 'vesper', 'willow', 'stone', 'gleam', 'meridian', 'delta', 'cinder', 'beacon', 'bossa', 'tempo', 'calandria', 'compas', 'hornero', 'luciernaga', 'destello', 'nuri', 'juni', 'flitz', 'brise', 'sillage', 'nira', 'harema', 'shida', 'noeul'));
alter table public.journey_voice_preferences drop constraint if exists journey_voice_preferences_language_check;
alter table public.journey_voice_preferences add constraint journey_voice_preferences_language_check check (language = 'auto' or language ~ '^[a-z]{2}$');
alter table public.journey_voice_preferences alter column language set default 'auto';

alter table public.journey_voice_previews drop constraint if exists journey_voice_previews_voice_check;
alter table public.journey_voice_previews add constraint journey_voice_previews_voice_check check (voice in ('marin', 'coral', 'shimmer', 'sage', 'cedar', 'ash', 'echo', 'verse', 'ballad', 'pearl', 'quartz', 'ripple', 'halo', 'vesper', 'willow', 'stone', 'gleam', 'meridian', 'delta', 'cinder', 'beacon', 'bossa', 'tempo', 'calandria', 'compas', 'hornero', 'luciernaga', 'destello', 'nuri', 'juni', 'flitz', 'brise', 'sillage', 'nira', 'harema', 'shida', 'noeul'));
alter table public.journey_voice_previews add column if not exists mime text not null default 'audio/mpeg' check (mime in ('audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm'));
alter table public.journey_voice_previews add column if not exists source text not null default 'tts' check (source in ('tts', 'gpt-live'));
