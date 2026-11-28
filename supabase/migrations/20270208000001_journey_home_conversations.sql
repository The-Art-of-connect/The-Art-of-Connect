-- The main Journey chat is separate from lesson-specific, discovery and owner-test chats.
alter table public.journey_conversations
  add column if not exists home_chat boolean not null default false;

create index if not exists journey_conversations_home_chat_recent_idx
  on public.journey_conversations (user_id, updated_at desc, id desc)
  where home_chat;
