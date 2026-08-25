#!/usr/bin/env python3
"""
Syncs Ashok's public Credly badges into certs.json for ashoksutar.me.

Fetches the (unofficial but widely-used, auth-free) public JSON endpoint
Credly exposes for badge wallets, converts each badge into the site's
cert-card schema, and merges it with certs-manual.json (certs that were
never issued through Credly, e.g. Forage/McKinsey/Microsoft programs
maintained by hand).

Run via .github/workflows/sync-certs.yml on a schedule + manual dispatch.
Exits non-zero only on unexpected/fatal errors; a Credly fetch failure
is logged and the script leaves certs.json untouched so a transient
outage never wipes the live site's certifications.
"""
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

CREDLY_USERNAME = "ashok-sutar"
CREDLY_URL = f"https://www.credly.com/users/{CREDLY_USERNAME}/badges.json"
SITE_DIR = Path(__file__).resolve().parent.parent / "Website Data"
MANUAL_PATH = SITE_DIR / "certs-manual.json"
OUTPUT_PATH = SITE_DIR / "certs.json"


def fetch_credly_badges():
    req = urllib.request.Request(
        CREDLY_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; ashoksutar.me cert sync)"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.load(resp)
    return payload.get("data", [])


def badge_to_cert(badge):
    template = badge.get("badge_template", {})
    issuer_summary = (badge.get("issuer") or {}).get("summary", "")
    issuer_name = issuer_summary.replace("issued by ", "").strip() or "Credly"
    return {
        "name": template.get("name", "Untitled Badge"),
        "issuer": issuer_name,
        "year": (badge.get("issued_at_date") or "")[:4] or "—",
        "url": f"https://www.credly.com/badges/{badge['id']}",
        "image_url": template.get("image_url"),
        "issued_at_date": badge.get("issued_at_date", ""),
        "source": "credly",
    }


def main():
    manual = json.loads(MANUAL_PATH.read_text()) if MANUAL_PATH.exists() else []
    for c in manual:
        c["source"] = "manual"

    try:
        raw_badges = fetch_credly_badges()
        credly_certs = [badge_to_cert(b) for b in raw_badges]
        credly_certs.sort(key=lambda c: c.get("issued_at_date", ""), reverse=True)
        print(f"Fetched {len(credly_certs)} badges from Credly.")
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, KeyError) as e:
        print(f"WARNING: Credly fetch failed ({e}). Leaving certs.json unchanged.", file=sys.stderr)
        if OUTPUT_PATH.exists():
            return 0
        credly_certs = []

    merged = credly_certs + manual
    OUTPUT_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(merged)} total certs ({len(credly_certs)} Credly + {len(manual)} manual) to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
