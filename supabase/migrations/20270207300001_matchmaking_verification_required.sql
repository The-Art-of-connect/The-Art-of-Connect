-- Directive 51 clarification 3: identity verification is a production matchmaking requirement.
-- Fictional QA participants demonstrate matchmaking with a test-only verification (profiles.test_identity_verified),
-- honored only for is_test accounts inside the isolated test realm and never displayed as Identity Verified.
update public.platform_settings set value = 'true', updated_at = now() where key = 'require_identity_for_matchmaking';
