-- New staff roles, kept in their own migration because Postgres requires new
-- enum values to be committed before policies can reference them.
--   executive: views business performance and runs authorized daily operations.
--   investor:  reserved for future read-only investor reporting (no access yet).
alter type public.staff_role add value if not exists 'executive';
alter type public.staff_role add value if not exists 'investor';
