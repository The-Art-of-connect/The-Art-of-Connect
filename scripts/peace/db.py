#!/usr/bin/env python3
"""Run SQL against the live Supabase database through the Management API.
Credentials are injected by the session's network proxy (never stored here).
Usage: python3 -I scripts/peace/db.py "select 1"    (prints JSON)"""
import json, subprocess, sys, tempfile, os
REF = "pjuekybzxgqxqdqchcmw"
def q(sql: str):
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
