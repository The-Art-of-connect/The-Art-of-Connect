#!/usr/bin/env bash
# Runs every database security check against a fresh, throwaway Postgres
# database and compares the results with the verified expected output.
#   PGHOST/PGPORT/PGUSER select the server (never point this at production).
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="aoc_security_test_$$"
psql -q -c "create database $DB" >/dev/null
trap 'psql -q -c "drop database if exists $DB" >/dev/null' EXIT

psql -d "$DB" -q -v ON_ERROR_STOP=1 -f supabase/tests/stub.sql $(ls supabase/migrations/*.sql | sort | sed 's/^/-f /') >/dev/null
psql -d "$DB" -qAt -f supabase/tests/rls_checks.sql -f supabase/tests/rls_checks_v2.sql \
  -f supabase/tests/rls_checks_v3.sql -f supabase/tests/rls_checks_v4.sql -f supabase/tests/rls_checks_v5.sql -f supabase/tests/rls_checks_v6.sql -f supabase/tests/rls_checks_v7.sql -f supabase/tests/rls_checks_v8.sql -f supabase/tests/rls_checks_v9.sql -f supabase/tests/rls_checks_v10.sql -f supabase/tests/rls_checks_v11.sql -f supabase/tests/rls_checks_v12.sql -f supabase/tests/rls_checks_v13.sql -f supabase/tests/rls_checks_v14.sql -f supabase/tests/rls_checks_v15.sql -f supabase/tests/rls_checks_v16.sql -f supabase/tests/rls_checks_v17.sql -f supabase/tests/rls_checks_v19.sql -f supabase/tests/rls_checks_v21.sql -f supabase/tests/rls_checks_v22.sql -f supabase/tests/rls_checks_v23.sql -f supabase/tests/rls_checks_v24.sql -f supabase/tests/rls_checks_v25.sql -f supabase/tests/rls_checks_v26.sql -f supabase/tests/rls_checks_v27.sql -f supabase/tests/rls_checks_v29.sql -f supabase/tests/rls_checks_v30.sql -f supabase/tests/rls_checks_v31.sql -f supabase/tests/rls_checks_v32.sql 2>&1 \
  | grep -vE '^(CONTEXT|PL/pgSQL|DETAIL|SQL statement|HINT)' \
  | sed -E 's/^psql:[^:]+:[0-9]+: //' > /tmp/aoc_security_actual.out

if diff -u supabase/tests/expected.out /tmp/aoc_security_actual.out; then
  echo "All $(grep -cE '^(v[0-9]+-)?[0-9]+\)' supabase/tests/expected.out) database security checks passed."
else
  echo "Database security checks FAILED (see differences above)." >&2
  exit 1
fi
