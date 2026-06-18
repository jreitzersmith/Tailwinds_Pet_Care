// Service area constants — single source of truth for zone definitions.
// Base location: South Dallas. Update CLAUDE.md when fees change.
// Polygon paths sourced from Map_Coord/GeoZones.json (GeoJSON [lng,lat] → {lat,lng}).

export const BASE_COORDS = { lat: 32.7383, lng: -96.7952 };

// ---------------------------------------------------------------------------
// Polygon paths for Zones 1-8 (innermost → outermost).
// Coordinates converted from GeoJSON [lng, lat] to Google Maps {lat, lng}.
// Each path is an open ring — Google Maps Polygon auto-closes it.
// ---------------------------------------------------------------------------

const ZONE_POLYGONS = [
  // Zone 1 (25 vertices)
  [
    { lat: 32.8660762, lng: -96.812614 },
    { lat: 32.8805817, lng: -96.8390285 },
    { lat: 32.880795, lng: -96.8844918 },
    { lat: 32.8586093, lng: -96.8801741 },
    { lat: 32.8487946, lng: -96.8799201 },
    { lat: 32.8157154, lng: -96.8687448 },
    { lat: 32.7923536, lng: -96.8567764 },
    { lat: 32.7669423, lng: -96.8570303 },
    { lat: 32.7203717, lng: -96.8567764 },
    { lat: 32.7197306, lng: -96.8034394 },
    { lat: 32.7128925, lng: -96.7567062 },
    { lat: 32.7008212, lng: -96.7535719 },
    { lat: 32.7031722, lng: -96.7484922 },
    { lat: 32.7057368, lng: -96.7401107 },
    { lat: 32.7121481, lng: -96.7225857 },
    { lat: 32.7341567, lng: -96.7136962 },
    { lat: 32.7335158, lng: -96.700743 },
    { lat: 32.762354, lng: -96.700743 },
    { lat: 32.7929942, lng: -96.7282598 },
    { lat: 32.8071269, lng: -96.7325376 },
    { lat: 32.8142212, lng: -96.726005 },
    { lat: 32.8511417, lng: -96.7315927 },
    { lat: 32.8571158, lng: -96.7491177 },
    { lat: 32.8656496, lng: -96.7709604 },
    { lat: 32.8660762, lng: -96.811852 }
  ],
  // Zone 2 (31 vertices)
  [
    { lat: 32.8951679, lng: -96.9736893 },
    { lat: 32.8831296, lng: -96.9466462 },
    { lat: 32.8571321, lng: -96.9349167 },
    { lat: 32.8450886, lng: -96.9111318 },
    { lat: 32.8380819, lng: -96.9157951 },
    { lat: 32.7680737, lng: -96.9149803 },
    { lat: 32.7214573, lng: -96.9184176 },
    { lat: 32.693289, lng: -96.8928181 },
    { lat: 32.6539844, lng: -96.8785666 },
    { lat: 32.6441113, lng: -96.8481832 },
    { lat: 32.6396895, lng: -96.8035482 },
    { lat: 32.662457, lng: -96.7249068 },
    { lat: 32.6756886, lng: -96.6998325 },
    { lat: 32.6794687, lng: -96.6695188 },
    { lat: 32.6918003, lng: -96.632097 },
    { lat: 32.7140277, lng: -96.6182499 },
    { lat: 32.7401589, lng: -96.6111393 },
    { lat: 32.7691147, lng: -96.6238635 },
    { lat: 32.7968033, lng: -96.6270442 },
    { lat: 32.8238538, lng: -96.6292897 },
    { lat: 32.8425911, lng: -96.6327408 },
    { lat: 32.8565048, lng: -96.6475894 },
    { lat: 32.8864215, lng: -96.7031196 },
    { lat: 32.9183858, lng: -96.7438162 },
    { lat: 32.9227938, lng: -96.7654772 },
    { lat: 32.9255486, lng: -96.8219273 },
    { lat: 32.9260771, lng: -96.8368448 },
    { lat: 32.9126753, lng: -96.8739883 },
    { lat: 32.9068139, lng: -96.8974129 },
    { lat: 32.9121282, lng: -96.9430622 },
    { lat: 32.8951679, lng: -96.9730377 }
  ],
  // Zone 3 (55 vertices)
  [
    { lat: 32.954738, lng: -96.9116992 },
    { lat: 32.9519116, lng: -96.9197879 },
    { lat: 32.9505917, lng: -96.9396217 },
    { lat: 32.9559421, lng: -96.9725815 },
    { lat: 32.9481432, lng: -96.9930621 },
    { lat: 32.9559437, lng: -97.0480796 },
    { lat: 32.9234196, lng: -97.0612836 },
    { lat: 32.9227915, lng: -97.077441 },
    { lat: 32.9259674, lng: -97.0910447 },
    { lat: 32.9205021, lng: -97.0906827 },
    { lat: 32.9125622, lng: -97.099697 },
    { lat: 32.9048975, lng: -97.0997532 },
    { lat: 32.8955069, lng: -97.0857388 },
    { lat: 32.8797495, lng: -97.0741608 },
    { lat: 32.8663691, lng: -97.0646672 },
    { lat: 32.8379716, lng: -97.0617662 },
    { lat: 32.7791938, lng: -97.0261252 },
    { lat: 32.7587578, lng: -97.029675 },
    { lat: 32.7590747, lng: -96.9952971 },
    { lat: 32.6703266, lng: -96.9868117 },
    { lat: 32.5978479, lng: -96.9423906 },
    { lat: 32.5861523, lng: -96.7582284 },
    { lat: 32.5915469, lng: -96.6790499 },
    { lat: 32.6180292, lng: -96.6247846 },
    { lat: 32.5972523, lng: -96.5830246 },
    { lat: 32.6236923, lng: -96.5540652 },
    { lat: 32.6397414, lng: -96.5391185 },
    { lat: 32.6470618, lng: -96.534128 },
    { lat: 32.6531889, lng: -96.5268083 },
    { lat: 32.6623378, lng: -96.5275579 },
    { lat: 32.6675105, lng: -96.5210485 },
    { lat: 32.6886013, lng: -96.5220612 },
    { lat: 32.6997958, lng: -96.533267 },
    { lat: 32.7032617, lng: -96.5696979 },
    { lat: 32.7343406, lng: -96.5263367 },
    { lat: 32.7412724, lng: -96.521199 },
    { lat: 32.7513789, lng: -96.5191037 },
    { lat: 32.7772682, lng: -96.5188858 },
    { lat: 32.8406381, lng: -96.5956477 },
    { lat: 32.8465471, lng: -96.5953265 },
    { lat: 32.863087, lng: -96.60372 },
    { lat: 32.8866551, lng: -96.6305966 },
    { lat: 32.9168142, lng: -96.630748 },
    { lat: 32.9307226, lng: -96.6308314 },
    { lat: 32.9350258, lng: -96.6304091 },
    { lat: 32.9395651, lng: -96.6358104 },
    { lat: 32.9446838, lng: -96.6441301 },
    { lat: 32.9453895, lng: -96.6488816 },
    { lat: 32.944416, lng: -96.6916942 },
    { lat: 32.9507785, lng: -96.7358848 },
    { lat: 32.9506602, lng: -96.7878483 },
    { lat: 32.949222, lng: -96.7992117 },
    { lat: 32.9547116, lng: -96.8048604 },
    { lat: 32.9547252, lng: -96.8252786 },
    { lat: 32.9545547, lng: -96.9112264 }
  ],
  // Zone 4 (28 vertices)
  [
    { lat: 33.0054545, lng: -96.7110311 },
    { lat: 32.9534411, lng: -96.6175618 },
    { lat: 32.9456753, lng: -96.516689 },
    { lat: 32.9099438, lng: -96.5009566 },
    { lat: 32.9060591, lng: -96.4528338 },
    { lat: 32.7458601, lng: -96.4417285 },
    { lat: 32.6204551, lng: -96.4352505 },
    { lat: 32.5315527, lng: -96.5185399 },
    { lat: 32.5214091, lng: -96.66661 },
    { lat: 32.5572966, lng: -96.9784827 },
    { lat: 32.6781166, lng: -97.0663994 },
    { lat: 32.7583131, lng: -97.0969388 },
    { lat: 32.7844349, lng: -97.0954905 },
    { lat: 32.7968195, lng: -97.0974503 },
    { lat: 32.8065771, lng: -97.0997813 },
    { lat: 32.8199759, lng: -97.0995843 },
    { lat: 32.8384171, lng: -97.1006126 },
    { lat: 32.8367017, lng: -97.1462883 },
    { lat: 32.8533183, lng: -97.1559826 },
    { lat: 32.874292, lng: -97.1632757 },
    { lat: 32.9104588, lng: -97.1354464 },
    { lat: 32.937426, lng: -97.1858857 },
    { lat: 32.9897203, lng: -97.1833907 },
    { lat: 32.9883788, lng: -97.1237765 },
    { lat: 32.9534411, lng: -97.0691757 },
    { lat: 32.982945, lng: -97.0478906 },
    { lat: 33.0108869, lng: -97.0673248 },
    { lat: 33.0070066, lng: -96.7138074 }
  ],
  // Zone 5 (19 vertices)
  [
    { lat: 33.0231931, lng: -96.4703514 },
    { lat: 33.0522506, lng: -96.569202 },
    { lat: 33.0834498, lng: -96.6911605 },
    { lat: 33.0694653, lng: -96.9286586 },
    { lat: 33.0597825, lng: -97.0210904 },
    { lat: 33.0102756, lng: -97.2239266 },
    { lat: 32.9381181, lng: -97.2534534 },
    { lat: 32.8971668, lng: -97.2585885 },
    { lat: 32.8303107, lng: -97.2072376 },
    { lat: 32.7634043, lng: -97.2187915 },
    { lat: 32.6726767, lng: -97.1340625 },
    { lat: 32.5905103, lng: -97.1456164 },
    { lat: 32.5515631, lng: -97.0904142 },
    { lat: 32.4757719, lng: -96.9709516 },
    { lat: 32.4970017, lng: -96.8248005 },
    { lat: 32.4714518, lng: -96.4754865 },
    { lat: 32.588347, lng: -96.3111634 },
    { lat: 32.7353318, lng: -96.2816366 },
    { lat: 33.0231931, lng: -96.4716351 }
  ],
  // Zone 6 (14 vertices)
  [
    { lat: 33.1314851, lng: -97.0470079 },
    { lat: 33.1489474, lng: -96.9107583 },
    { lat: 33.1512754, lng: -96.6466008 },
    { lat: 33.0697574, lng: -96.3880045 },
    { lat: 32.8504495, lng: -96.2281197 },
    { lat: 32.6891222, lng: -96.1683367 },
    { lat: 32.5169524, lng: -96.2058749 },
    { lat: 32.3972933, lng: -96.4380554 },
    { lat: 32.3949455, lng: -96.8454141 },
    { lat: 32.51578, lng: -97.2166249 },
    { lat: 32.6703987, lng: -97.3306297 },
    { lat: 32.9450052, lng: -97.318117 },
    { lat: 33.0883967, lng: -97.2764079 },
    { lat: 33.1303209, lng: -97.0511789 }
  ],
  // Zone 7 (15 vertices)
  [
    { lat: 33.2289299, lng: -97.1790861 },
    { lat: 33.2231149, lng: -96.6160136 },
    { lat: 33.1777442, lng: -96.3727106 },
    { lat: 32.8513172, lng: -96.1029919 },
    { lat: 32.4838191, lng: -96.0404283 },
    { lat: 32.4133731, lng: -96.2294955 },
    { lat: 32.3253029, lng: -96.3921609 },
    { lat: 32.3182535, lng: -96.6632699 },
    { lat: 32.3323516, lng: -96.870425 },
    { lat: 32.4168941, lng: -97.2374649 },
    { lat: 32.6875997, lng: -97.4265461 },
    { lat: 32.8103774, lng: -97.4362782 },
    { lat: 33.0181438, lng: -97.4348874 },
    { lat: 33.1567607, lng: -97.3528596 },
    { lat: 33.2288945, lng: -97.1776808 }
  ],
  // Zone 8 (15 vertices)
  [
    { lat: 33.3371957, lng: -97.1970133 },
    { lat: 33.1996999, lng: -97.4889534 },
    { lat: 32.9581744, lng: -97.585035 },
    { lat: 32.6242185, lng: -97.5628623 },
    { lat: 32.3545921, lng: -97.4002628 },
    { lat: 32.2687036, lng: -97.2007088 },
    { lat: 32.214005, lng: -96.6814988 },
    { lat: 32.2796394, lng: -96.08838 },
    { lat: 32.5479323, lng: -95.8278511 },
    { lat: 32.8426152, lng: -95.882197 },
    { lat: 32.9184549, lng: -95.9618434 },
    { lat: 33.0621612, lng: -96.000613 },
    { lat: 33.1691367, lng: -96.0651701 },
    { lat: 33.3680639, lng: -96.5059652 },
    { lat: 33.335652, lng: -97.1951656 }
  ]
];

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
