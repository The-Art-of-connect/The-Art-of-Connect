-- Journey Model Lab: the owner privately compares approved OpenAI models using
-- the same master personality version. Each owner test records the model,
-- response time, tokens, cost and the owner's own quality ratings.
alter table public.journey_test_runs
  add column if not exists model text check (char_length(model) <= 80),
  add column if not exists latency_ms integer check (latency_ms >= 0),
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists cost_cents numeric(12,4),
  add column if not exists comparison_id uuid,
  add column if not exists ratings jsonb not null default '{}'::jsonb check (jsonb_typeof(ratings) = 'object'),
  add column if not exists rating_note text check (char_length(rating_note) <= 2000);
create index if not exists journey_test_runs_comparison on public.journey_test_runs (comparison_id);
create index if not exists journey_test_runs_model on public.journey_test_runs (model, created_at desc);
