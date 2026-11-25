#!/usr/bin/env bash
# Safely checks and applies The Art of Connect's database migrations.
#   check  — read-only: shows which migrations are applied and which are pending.
#   apply  — applies ONLY pending migrations, in order, each in its own
#            transaction; stops at the first error; then verifies security.
# The connection string comes from the SUPABASE_DB_URL environment variable
# (a GitHub Actions secret). It is never printed or written to disk.
set -euo pipefail
MODE="${1:-check}"
cd "$(dirname "$0")/.."
: "${SUPABASE_DB_URL:?Add the SUPABASE_DB_URL secret first}"
export PGCONNECT_TIMEOUT=20
q() { psql "$SUPABASE_DB_URL" -X -q -A -t -v ON_ERROR_STOP=1 -c "$1" 2>/dev/null || echo "f"; }

# A small ledger so future checks don't depend only on markers.
if [ "$MODE" = "apply" ]; then
  psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 -c "create table if not exists public.applied_migrations (name text primary key, applied_at timestamptz not null default now());
    revoke all on public.applied_migrations from anon, authenticated;" >/dev/null
fi

pending=()
echo "Migration status:"
while IFS=$'\t' read -r file sig; do
  [[ -z "$file" || "$file" == \#* ]] && continue
  [ -f "supabase/migrations/$file" ] || { echo "  MISSING FILE  $file"; exit 1; }
  ledger=$(q "select exists (select 1 from public.applied_migrations where name = '$file')")
  marker=$(q "select ($sig)")
  if [ "$ledger" = "t" ] || [ "$marker" = "t" ]; then echo "  applied   $file"; else echo "  PENDING   $file"; pending+=("$file"); fi
done < supabase/migration-signatures.tsv

for f in supabase/migrations/*.sql; do
  grep -q "^$(basename "$f")	" supabase/migration-signatures.tsv || { echo "No marker for $(basename "$f") — add it to supabase/migration-signatures.tsv"; exit 1; }
done

echo "${#pending[@]} pending."
if [ "$MODE" = "apply" ]; then
  for file in "${pending[@]}"; do
    echo "Applying $file …"
    psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "supabase/migrations/$file" >/dev/null
    psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 -c "insert into public.applied_migrations (name) values ('$file') on conflict do nothing" >/dev/null
    echo "  done"
  done
fi

echo
echo "Security verification:"
psql "$SUPABASE_DB_URL" -X -q -A -v ON_ERROR_STOP=1 -f supabase/verify_security.sql
