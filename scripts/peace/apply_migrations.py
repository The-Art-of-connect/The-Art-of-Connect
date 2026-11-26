#!/usr/bin/env python3
"""Apply named migration files (from supabase/migrations) to the live database, each in one transaction with its
history record. Skips versions already applied. Usage: python3 -I scripts/peace/apply_migrations.py 2027..._name.sql"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import q  # noqa: E402
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "supabase", "migrations")
applied = {r["version"] for r in q("select version from supabase_migrations.schema_migrations")}
for f in sys.argv[1:]:
    version, name = os.path.basename(f).split("_", 1)
    name = name.removesuffix(".sql")
    if version in applied: print("skip", version); continue
    sql = open(os.path.join(ROOT, os.path.basename(f))).read()
    res = q(f"begin;\n{sql}\ninsert into supabase_migrations.schema_migrations(version, name) values ('{version}', '{name}');\ncommit;")
    if isinstance(res, dict) and "message" in res:
        print("FAILED", version, res["message"][:400]); q("rollback;"); sys.exit(1)
    print("applied", version, name)
