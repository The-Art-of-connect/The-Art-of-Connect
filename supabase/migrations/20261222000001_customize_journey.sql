-- Customize Your Journey: each paid member's voice, language, style and avatar preferences.
-- Preferences change only Journey's tone and delivery, never its philosophy or safety rules.
-- Voice previews are short clips the owner generates from OpenAI's own voices; anyone signed in may hear them.

alter table public.journey_voice_preferences
  add column if not exists presentation text not null default 'feminine' check (presentation in ('feminine', 'masculine', 'neutral')),
  add column if not exists voice text not null default 'marin' check (voice in ('marin','coral','shimmer','sage','cedar','ash','echo','verse','ballad','alloy')),
  add column if not exists age_style text not null default 'none' check (age_style in ('21-29','30-39','40-49','50-59','60+','none')),
  add column if not exists language text not null default 'en' check (language ~ '^[a-z]{2}$'),
  add column if not exists accent text not null default 'none' check (accent ~ '^[a-z-]{2,20}$'),
  add column if not exists personality text not null default 'balanced' check (personality in ('warm','direct','calm','energetic','professional','balanced')),
  add column if not exists pace text not null default 'natural' check (pace in ('slower','natural','brisker')),
  add column if not exists avatar text not null default 'champagne' check (avatar ~ '^[a-z-]{2,30}$');

create table public.journey_voice_previews (
  voice text primary key check (voice in ('marin','coral','shimmer','sage','cedar','ash','echo','verse','ballad','alloy')),
  audio_base64 text not null check (char_length(audio_base64) < 2000000),
  created_at timestamptz not null default now()
);
alter table public.journey_voice_previews enable row level security;
create policy "signed-in members may listen" on public.journey_voice_previews for select to authenticated using (true);
create policy "owner manages" on public.journey_voice_previews for all
  using (public.has_staff_role(array['owner']::public.staff_role[])) with check (public.has_staff_role(array['owner']::public.staff_role[]));
revoke all on public.journey_voice_previews from public, anon;
grant select on public.journey_voice_previews to authenticated;
grant all on public.journey_voice_previews to service_role;
