// Service area constants — single source of truth for zone definitions.
// Base location: South Dallas. Update CLAUDE.md when fees change.
//
// Zone polygons are loaded from Map_Coord/GeoZones_Current.json at build time.
// To update zones: replace GeoZones_Current.json (archive the old file as
// GeoZones_Replaced_YYYY.MM.DD.json), then rebuild.

import geoZonesData from '../../../../Map_Coord/GeoZones_Current.json';

export const BASE_COORDS = { lat: 32.7383, lng: -96.7952 };

// Convert GeoJSON [lng, lat] coordinate pairs to Google Maps {lat, lng} objects.
// Each feature is a LineString — Google Maps Polygon auto-closes the ring.
const ZONE_POLYGONS = geoZonesData.features.map((feat) =>
  feat.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
);

// Zones ordered innermost-first (Zone 1 → Zone 9).
// Polygon overlays draw outermost-first so inner zones render on top.
// Zone 9 has no polygon; matched by haversine distance fallback.
export const PRICING_ZONES = [
  {
    label: 'Zone 1',
    feeDisplay: 'None',
    fillColor: '#4CAF50',
    strokeColor: '#388E3C',
    drawOnMap: true,
    polygonPath: ZONE_POLYGONS[0],
  },
  {
    label: 'Zone 2',
    feeDisplay: '+$5',
    fillColor: '#26A69A',
    strokeColor: '#00796B',
    drawOnMap: true,
    polygonPath: ZONE_POLYGONS[1],
  },
  {
    label: 'Zone 3',
    feeDisplay: '+$10',
    fillColor: '#29B6F6',
    strokeColor: '#0277BD',
    drawOnMap: true,
    polygonPath: ZONE_POLYGONS[2],
  },
  {
    label: 'Zone 4',
    feeDisplay: '+$12',
    fillColor: '#FFD54F',
    strokeColor: '#F57F17',
    drawOnMap: true,
    polygonPath: ZONE_POLYGONS[3],
  },
  {
    label: 'Zone 5',
    feeDisplay: '+$15',
    fillColor: '#FFA726',
    strokeColor: '#E65100',
    drawOnMap: true,
    polygonPath: ZONE_POLYGONS[4],
  },
  {
    label: 'Zone 6',
    feeDisplay: '+$17.50',
    fillColor: '#FF7043',
    strokeColor: '#BF360C',
    drawOnMap: true,
    polygonPath: ZONE_POLYGONS[5],
  },
  {
    label: 'Zone 7',
    feeDisplay: '+$20',
    fillColor: '#EF5350',
    strokeColor: '#C62828',
    drawOnMap: true,
    polygonPath: ZONE_POLYGONS[6],
  },
  {
    label: 'Zone 8',
    feeDisplay: '+$25',
    fillColor: '#B71C1C',
    strokeColor: '#7F0000',
    drawOnMap: true,
    polygonPath: ZONE_POLYGONS[7],
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
 * Checks polygon containment for zones 1-8 (innermost first),
 * then falls back to haversine distance for zone 9 (40-100 mi).
 * Returns null if the point is beyond Zone 9's range (>100 miles).
 *
 * @param {{ lat: number, lng: number }} latLng
 * @returns {object|null} Matching zone object, or null if out of range
 */
export function getZoneForPoint(latLng) {
  const { lat, lng } = latLng;
  for (const zone of PRICING_ZONES) {
    if (zone.polygonPath && pointInPolygon(lat, lng, zone.polygonPath)) {
      return zone;
    }
  }
  const zone9 = PRICING_ZONES.find((z) => z.label === 'Zone 9');
  const dist = haversineDistanceMiles(BASE_COORDS, latLng);
  return dist < zone9.maxMiles ? zone9 : null;
}

/**
 * Legacy distance-based zone lookup. Prefer getZoneForPoint().
 */
export function getZoneForDistance(miles) {
  return PRICING_ZONES.find((zone) => zone.maxMiles && miles < zone.maxMiles) ?? null;
}
