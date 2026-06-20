// Service area constants — single source of truth for zone definitions.
// Base location: 2500 South Blvd, Dallas TX. Update CLAUDE.md when fees change.
//
// Zone polygons are loaded from ~Map_Coord/GeoZones_Current.json at build time.
// To regenerate zones from drive-time isochrones:
//   1. python ~Map_Coord/generate_geo_zones.py
//   2. npm run build

import geoZonesData from '../../../~Map_Coord/GeoZones_Current.json';

export const BASE_COORDS = { lat: 32.7383, lng: -96.7952 };

// ---------------------------------------------------------------------------
// Convert GeoJSON features to zone polygon paths.
// Supports two formats:
//   New (generate_geo_zones.py output): Polygon features with properties.zone
//   Legacy (hand-drawn): LineString features matched by index order
// ---------------------------------------------------------------------------

function ringToLatLng(coords) {
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

function buildZonePolygonMap(geojson) {
  const map = {};
  const features = geojson.features;
  const hasZoneProperty = features.length > 0 && features[0].properties?.zone != null;

  if (hasZoneProperty) {
    // New format — match by zone number in properties
    for (const feat of features) {
      const zoneNum = feat.properties.zone;
      const coords = feat.geometry.type === 'Polygon'
        ? feat.geometry.coordinates[0]  // Polygon outer ring
        : feat.geometry.coordinates;    // LineString
      map[zoneNum] = ringToLatLng(coords);
    }
  } else {
    // Legacy format — features are ordered Zone 1 → Zone N by index
    features.forEach((feat, i) => {
      const coords = feat.geometry.type === 'Polygon'
        ? feat.geometry.coordinates[0]
        : feat.geometry.coordinates;
      map[i + 1] = ringToLatLng(coords);
    });
  }
  return map;
}

const ZONE_POLYGON_MAP = buildZonePolygonMap(geoZonesData);

// Zones ordered innermost-first (Zone 1 → Zone 9).
// Zones with no polygon entry fall back to haversine in getZoneForPoint().
export const PRICING_ZONES = [
  {
    label: 'Zone 1',
    feeDisplay: 'None',
    fillColor: '#4CAF50',
    strokeColor: '#388E3C',
    drawOnMap: true,
    polygonPath: ZONE_POLYGON_MAP[1] ?? null,
  },
  {
    label: 'Zone 2',
    feeDisplay: '+$5',
    fillColor: '#26A69A',
    strokeColor: '#00796B',
    drawOnMap: true,
    polygonPath: ZONE_POLYGON_MAP[2] ?? null,
  },
  {
    label: 'Zone 3',
    feeDisplay: '+$10',
    fillColor: '#29B6F6',
    strokeColor: '#0277BD',
    drawOnMap: true,
    polygonPath: ZONE_POLYGON_MAP[3] ?? null,
  },
  {
    label: 'Zone 4',
    feeDisplay: '+$12',
    fillColor: '#FFD54F',
    strokeColor: '#F57F17',
    drawOnMap: true,
    polygonPath: ZONE_POLYGON_MAP[4] ?? null,
  },
  {
    label: 'Zone 5',
    feeDisplay: '+$15',
    fillColor: '#FFA726',
    strokeColor: '#E65100',
    drawOnMap: true,
    polygonPath: ZONE_POLYGON_MAP[5] ?? null,
  },
  {
    label: 'Zone 6',
    // maxMiles used as distance fallback when no Mapbox polygon is available (>60 min limit).
    // ~65-min drive at 25–30 mph city speed ≈ 28 miles as-the-crow-flies.
    maxMiles: 28,
    feeDisplay: '+$17.50',
    fillColor: '#FF7043',
    strokeColor: '#BF360C',
    drawOnMap: true,
    polygonPath: ZONE_POLYGON_MAP[6] ?? null,
  },
  {
    label: 'Zone 7',
    maxMiles: 32, // ~75-min drive fallback
    feeDisplay: '+$20',
    fillColor: '#EF5350',
    strokeColor: '#C62828',
    drawOnMap: true,
    polygonPath: ZONE_POLYGON_MAP[7] ?? null,
  },
  {
    label: 'Zone 8',
    maxMiles: 36, // ~85-min drive fallback
    feeDisplay: '+$25',
    fillColor: '#B71C1C',
    strokeColor: '#7F0000',
    drawOnMap: true,
    polygonPath: ZONE_POLYGON_MAP[8] ?? null,
  },
  {
    label: 'Zone 9',
    maxMiles: 100,
    feeDisplay: 'Location dependent',
    fillColor: '#9E9E9E',
    strokeColor: '#424242',
    drawOnMap: false,
    polygonPath: null,
  },
];

// ---------------------------------------------------------------------------
// Ray-casting point-in-polygon (no external dependencies).
// path: Array of {lat, lng} objects forming a polygon ring.
// ---------------------------------------------------------------------------

function pointInPolygon(lat, lng, path) {
  let inside = false;
  const n = path.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = path[i].lng, yi = path[i].lat;
    const xj = path[j].lng, yj = path[j].lat;
    if (((yi > lat) !== (yj > lat)) &&
        (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

function haversineDistanceMiles(a, b) {
  const R = 3958.8;
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const chord =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(chord));
}

/**
 * Returns the pricing zone for a given {lat, lng} point.
 * Checks polygon containment for zones 1-8 (innermost first).
 * Zones without a polygon are skipped and fall through.
 * Falls back to haversine distance for zone 9 (out-of-polygon, ≤100 mi).
 * Returns null if out of range.
 *
 * @param {{ lat: number, lng: number }} latLng
 * @returns {object|null}
 */
export function getZoneForPoint(latLng) {
  const { lat, lng } = latLng;
  const dist = haversineDistanceMiles(BASE_COORDS, latLng);

  // Pass 1: polygon containment for zones that have isochrone polygon data.
  for (const zone of PRICING_ZONES) {
    if (zone.polygonPath && pointInPolygon(lat, lng, zone.polygonPath)) {
      return zone;
    }
  }

  // Pass 2: maxMiles fallback for zones without polygons (e.g. zones > Mapbox 60-min limit).
  // Checked innermost-first (PRICING_ZONES order) so the tightest matching zone wins.
  for (const zone of PRICING_ZONES) {
    if (!zone.polygonPath && zone.maxMiles && dist < zone.maxMiles) {
      return zone;
    }
  }

  return null;
}

/**
 * Legacy distance-based zone lookup. Prefer getZoneForPoint().
 */
export function getZoneForDistance(miles) {
  return PRICING_ZONES.find((zone) => zone.maxMiles && miles < zone.maxMiles) ?? null;
}
