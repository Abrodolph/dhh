#!/usr/bin/env python3
"""Convert manifest.csv (from make_clips.sh) into a Supabase seed.sql.
Usage: python scripts/manifest-to-sql.py manifest.csv > seed.sql
"""
import csv, sys

def esc(s: str) -> str:
    return s.replace("'", "''")

rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
print("insert into songs (id, title, artist, album, release_year, difficulty, clip_path) values")
vals = []
for r in rows:
    year = r["year"] or "null"
    vals.append(
        f"('{r['uuid']}', '{esc(r['title'])}', '{esc(r['artist'])}', "
        f"'{esc(r['album'])}', {year}, {r['difficulty'] or 2}, '{esc(r['clip_path'])}')"
    )
print(",\n".join(vals) + "\non conflict (id) do nothing;")
