-- CONNECT 360 provider webhooks: every signed delivery is recorded once (duplicates ignored), with only its type and resource id.
-- Research content is not stored here. Service role writes; the owner sees counts in the Owner Portal.
create table public.intel_webhook_deliveries (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('parallel', 'exa')),
  delivery_id text not null check (char_length(delivery_id) <= 200),
  event_type text not null check (char_length(event_type) <= 80),
  resource_id text check (char_length(resource_id) <= 200),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, delivery_id)
);
alter table public.intel_webhook_deliveries enable row level security;
create policy "owner reads" on public.intel_webhook_deliveries for select to authenticated using (public.is_owner());
grant select on public.intel_webhook_deliveries to authenticated;
grant all on public.intel_webhook_deliveries to service_role;
grant usage, select on all sequences in schema public to service_role;
