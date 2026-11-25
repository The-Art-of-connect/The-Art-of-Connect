-- ════════════════════════════════════════════════════════════════════
-- Remove privileges the Data API roles never need.
-- Supabase grants TRUNCATE, REFERENCES and TRIGGER on new tables to the
-- API roles by default. TRUNCATE in particular bypasses row-level
-- security, so it is revoked everywhere, now and for future tables.
-- ════════════════════════════════════════════════════════════════════
revoke truncate, references, trigger on all tables in schema public, relationships, business, counseling from anon, authenticated;

alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;
alter default privileges in schema relationships revoke truncate, references, trigger on tables from anon, authenticated;
alter default privileges in schema business revoke truncate, references, trigger on tables from anon, authenticated;
alter default privileges in schema counseling revoke truncate, references, trigger on tables from anon, authenticated;
