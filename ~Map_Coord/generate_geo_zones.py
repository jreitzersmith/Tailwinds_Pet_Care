#!/usr/bin/env python3
"""
generate_geo_zones.py
=====================
Generates GeoZones_Current.json using drive-time isochrones from the
Mapbox Isochrone API. Run this script whenever zone boundaries need to
be regenerated. The output file is imported directly by the Vite build.

Usage:
    python generate_geo_zones.py [--dry-run]

Requirements:
    - MAPBOX_CLIENT_ID in tailwindspetcare.com/.env  (or set as env var)
    - Python 3.8+ (stdlib only — no pip installs needed)

After running:
    cd tailwindspetcare.com && npm run build
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date

# ── Zone definitions ───────────────────────────────────────────────────────────
# Each entry: (zone_number, upper_bound_minutes)
# The polygon for Zone N contains all points reachable within upper_bound_minutes.
# Zones are checked innermost-first; a point 20 min away is NOT in Zone 1 (15 min)
# but IS in Zone 2 (25 min) — so Zone 2 is returned.

ZONES = [
    (1,  15),
    (2,  25),
    (3,  35),
    (4,  45),
    (5,  55),
    (6,  65),
    (7,  75),
    (8,  85),
    # Zone 9 (85-120 min) is not fetched — no polygon.
    # serviceAreaData.js uses haversine distance fallback for Zone 9.
]

START_ADDRESS = "2500 South Blvd, Dallas, TX 75215"

# Mapbox supports up to 4 contours per request; >60 min may not be supported.
MAPBOX_BATCH_SIZE = 4
MAPBOX_MAX_MINUTES = 60  # API limit; zones above this get skipped gracefully

# ── Token loader ───────────────────────────────────────────────────────────────

def load_env_file(path):
    env = {}
    if not os.path.exists(path):
        return env
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                env[key.strip()] = val.strip().strip('"').strip("'")
    return env

def find_token():
    candidates = ('MAPBOX_CLIENT_ID', 'MAPBOX_ACCESS_TOKEN', 'VITE_MAPBOX_TOKEN',
                  'VITE_MAPBOX_ACCESS_TOKEN', 'MAPBOX_TOKEN')
    # 1. OS environment
    for key in candidates:
        if os.environ.get(key):
            return os.environ[key], key
    # 2. .env files relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_dirs = [
        os.path.join(script_dir, '..', 'tailwindspetcare.com'),
        script_dir,
    ]
    for d in env_dirs:
        for fname in ('.env', '.env.local'):
            env = load_env_file(os.path.join(d, fname))
            for key in candidates:
                if env.get(key):
                    return env[key], f"{os.path.join(d, fname)} → {key}"
    return None, None

# ── HTTP helpers ───────────────────────────────────────────────────────────────

def get_json(url, label=''):
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        raise RuntimeError(f"HTTP {e.code} fetching {label}: {body[:300]}")

# ── Geocoding ─────────────────────────────────────────────────────────────────

def geocode(address, token):
    encoded = urllib.parse.quote(address)
    url = (f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded}.json"
           f"?access_token={token}&limit=1&country=us&types=address")
    data = get_json(url, 'geocoding')
    if not data.get('features'):
        raise ValueError(f"No geocoding result for: {address}")
    feat = data['features'][0]
    lng, lat = feat['geometry']['coordinates']
    print(f"  Geocoded → {feat.get('place_name', address)}")
    print(f"  Coordinates: lat={lat:.6f}, lng={lng:.6f}")
    return lng, lat

# ── Isochrone fetching ────────────────────────────────────────────────────────

def fetch_batch(lng, lat, minutes_batch, token):
    """Fetch one batch of isochrone contours. Returns dict {minutes: polygon_ring}."""
    contours = ','.join(str(m) for m in minutes_batch)
    url = (f"https://api.mapbox.com/isochrone/v1/mapbox/driving/{lng},{lat}"
           f"?contours_minutes={contours}&polygons=true&access_token={token}")
    data = get_json(url, f"isochrone {contours} min")
    results = {}
    for feat in data.get('features', []):
        mins = feat['properties'].get('contour')
        if mins is None:
            continue
        # Polygon geometry: coordinates[0] is the outer ring
        ring = feat['geometry']['coordinates'][0]
        results[mins] = ring
    return results

def fetch_all_isochrones(lng, lat, zones, token):
    """
    Fetch isochrones for all requested zones.
    Skips zones where minutes > MAPBOX_MAX_MINUTES and reports them.
    Returns dict {zone_number: polygon_ring}.
    """
    # Separate fetchable from out-of-range
    fetchable = [(z, m) for z, m in zones if m <= MAPBOX_MAX_MINUTES]
    skipped   = [(z, m) for z, m in zones if m >  MAPBOX_MAX_MINUTES]

    if skipped:
        print(f"\n  Note: Mapbox Isochrone API supports up to {MAPBOX_MAX_MINUTES} min.")
        print(f"  Zones {[z for z,_ in skipped]} ({[m for _,m in skipped]} min) will use")
        print(f"  haversine distance fallback in serviceAreaData.js instead.\n")

    minutes_only = [m for _, m in fetchable]
    minute_to_zone = {m: z for z, m in fetchable}
    polygon_by_zone = {}

    for i in range(0, len(minutes_only), MAPBOX_BATCH_SIZE):
        batch = minutes_only[i:i + MAPBOX_BATCH_SIZE]
        print(f"  Fetching {batch} min ...", end=' ', flush=True)
        try:
            results = fetch_batch(lng, lat, batch, token)
            for mins, ring in results.items():
                zone_num = minute_to_zone.get(mins)
                if zone_num:
                    polygon_by_zone[zone_num] = ring
            print(f"got {len(results)} polygon(s)")
        except RuntimeError as e:
            print(f"FAILED\n  {e}")
        if i + MAPBOX_BATCH_SIZE < len(minutes_only):
            time.sleep(0.25)  # gentle rate limit

    return polygon_by_zone

# ── GeoJSON output ────────────────────────────────────────────────────────────

def build_geojson(polygon_by_zone, zones):
    """Build FeatureCollection. Zones without a polygon are omitted (haversine fallback)."""
    features = []
    # Sort by zone number so innermost zone is feature[0]
    for zone_num, minutes in sorted(zones):
        ring = polygon_by_zone.get(zone_num)
        if ring is None:
            continue  # no polygon — serviceAreaData.js uses haversine for this zone
        features.append({
            "type": "Feature",
            "properties": {
                "zone": zone_num,
                "contour_minutes": minutes
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [ring]
            }
        })
    return {"type": "FeatureCollection", "features": features}

# ── File management ───────────────────────────────────────────────────────────

def archive_and_write(geojson, out_path):
    if os.path.exists(out_path):
        today = date.today().strftime('%Y.%m.%d')
        archive = os.path.join(os.path.dirname(out_path), f"GeoZones_Replaced_{today}.json")
        # Avoid clobbering an existing archive from today
        if os.path.exists(archive):
            n = 2
            while os.path.exists(archive):
                archive = os.path.join(
                    os.path.dirname(out_path),
                    f"GeoZones_Replaced_{today}_{n}.json")
                n += 1
        os.rename(out_path, archive)
        print(f"\n  Archived existing file → {os.path.basename(archive)}")

    with open(out_path, 'w') as f:
        json.dump(geojson, f, indent=2)
    size_kb = os.path.getsize(out_path) / 1024
    print(f"  Written: {out_path} ({size_kb:.1f} KB)")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    dry_run = '--dry-run' in sys.argv

    print("=" * 60)
    print("Tailwinds Pet Care — Zone Generator")
    print("=" * 60)

    # Find token
    token, source = find_token()
    if not token:
        print("\nERROR: Mapbox token not found.")
        print("Expected: MAPBOX_CLIENT_ID in tailwindspetcare.com/.env")
        sys.exit(1)
    print(f"\nToken found via: {source}")

    # Geocode
    print(f"\nGeocoding: {START_ADDRESS}")
    lng, lat = geocode(START_ADDRESS, token)

    # Fetch isochrones
    print(f"\nFetching isochrones ({len(ZONES)} zones):")
    polygon_by_zone = fetch_all_isochrones(lng, lat, ZONES, token)

    fetched_count = len(polygon_by_zone)
    total_count = len(ZONES)
    print(f"\n  Fetched {fetched_count}/{total_count} zone polygons.")
    if fetched_count < total_count:
        missing = [z for z, _ in ZONES if z not in polygon_by_zone]
        print(f"  Zones {missing} will use haversine fallback (no polygon).")

    # Build GeoJSON
    geojson = build_geojson(polygon_by_zone, ZONES)

    if dry_run:
        print("\n[dry-run] Output preview (first feature only):")
        if geojson['features']:
            print(json.dumps(geojson['features'][0], indent=2)[:800])
        print("\n[dry-run] No files written.")
        return

    # Write output
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, 'GeoZones_Current.json')
    archive_and_write(geojson, out_path)

    print("\nNext step:")
    print("  cd tailwindspetcare.com && npm run build")
    print("=" * 60)

if __name__ == '__main__':
    main()
