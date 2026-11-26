#!/usr/bin/env python3
"""Run SQL against the live Supabase database.
  • In GitHub Actions: uses the SUPABASE_DB_URL secret with psql.
  • In a Claude Code cloud session: uses the Supabase Management API (credentials injected by the network proxy).
Never stores credentials. Usage: python3 -I scripts/peace/db.py "select 1"   (prints JSON rows)"""
import json, os, re, subprocess, sys, tempfile
REF = "pjuekybzxgqxqdqchcmw"

def q(sql: str):
    url = os.environ.get("SUPABASE_DB_URL")
    if url:
        is_select = re.match(r"^\s*(select|with)\b", sql, re.I) is not None
        body = f"select coalesce(json_agg(t), '[]'::json) from ({sql.rstrip().rstrip(';')}) t" if is_select else sql
        r = subprocess.run(["psql", url, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-c", body], capture_output=True, text=True)
        if r.returncode != 0: return {"message": r.stderr.strip()[:2000]}
        out = r.stdout.strip()
        try: return json.loads(out) if is_select else {"ok": True}
        except Exception: return {"ok": True, "output": out[:2000]}
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as t:
        json.dump({"query": sql}, t); path = t.name
    try:
        out = subprocess.run(["curl", "-sS", "-X", "POST", f"https://api.supabase.com/v1/projects/{REF}/database/query",
                              "-H", "Content-Type: application/json", "--data-binary", "@" + path], capture_output=True, text=True).stdout
    finally:
        os.unlink(path)
    try: return json.loads(out)
    except Exception: return {"message": out[:2000]}

if __name__ == "__main__":
    print(json.dumps(q(sys.argv[1]), indent=1, default=str))
