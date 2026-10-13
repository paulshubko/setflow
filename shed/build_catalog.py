#!/usr/bin/env python3
"""Build public/catalog.json from a free-exercise-db checkout.

usage: build_catalog.py <source_dir> <out_json> <commit>
"""
import json
import os
import sys
import time

src, out, commit = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(os.path.join(src, "dist", "exercises.json"), encoding="utf-8"))

keep = ("id", "name", "category", "level", "force", "mechanic", "equipment",
        "primaryMuscles", "secondaryMuscles", "instructions", "images")
items, missing = [], []
for e in data:
    row = {k: e.get(k) for k in keep}
    row["images"] = [p for p in (e.get("images") or [])
                     if os.path.exists(os.path.join(src, "exercises", p))]
    if not row["images"]:
        missing.append(e["id"])
    items.append(row)

doc = {
    "dataset": "yuhonas/free-exercise-db",
    "commit": commit,
    "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "image_base": "img/",
    "note": "Image provenance is unknown per the dataset maintainer. Personal use.",
    "count": len(items),
    "exercises": items,
}
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
print(f"catalog: {len(items)} exercises, {len(missing)} without images -> {out}")
