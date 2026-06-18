// Service area constants — single source of truth for zone definitions.
// Base location: South Dallas. Update CLAUDE.md when fees change.

export const BASE_COORDS = { lat: 32.7383, lng: -96.7952 };

export const MILES_TO_METERS = 1609.344;

// Zones are defined outermost-first so inner circles paint on top when rendering.
// drawOnMap: false for Zone 9 — too large for a circle; appears in legend only.
export const PRICING_ZONES = [
  {
    label: 'Zone 1',
    radiusMiles: 5,
    feeDisplay: 'None',
    fillColor: '#4CAF50',
    strokeColor: '#388E3C',
    drawOnMap: true,
  },
  {
    label: 'Zone 2',
    radiusMiles: 10,
    feeDisplay: '+$5',
    fillColor: '#26A69A',
    strokeColor: '#00796B',
    drawOnMap: true,
  },
  {
    label: 'Zone 3',
    radiusMiles: 15,
    feeDisplay: '+$10',
    fillColor: '#29B6F6',
    strokeColor: '#0277BD',
    drawOnMap: true,
  },
  {
    label: 'Zone 4',
    radiusMiles: 20,
    feeDisplay: '+$12',
    fillColor: '#FFD54F',
    strokeColor: '#F57F17',
    drawOnMap: true,
  },
  {
    label: 'Zone 5',
    radiusMiles: 25,
    feeDisplay: '+$15',
    fillColor: '#FFA726',
    strokeColor: '#E65100',
    drawOnMap: true,
  },
  {
    label: 'Zone 6',
    radiusMiles: 30,
    feeDisplay: '+$17.50',
    fillColor: '#FF7043',
    strokeColor: '#BF360C',
    drawOnMap: true,
  },
  {
    label: 'Zone 7',
    radiusMiles: 35,
    feeDisplay: '+$20',
    fillColor: '#EF5350',
    strokeColor: '#C62828',
    drawOnMap: true,
  },
  {
    label: 'Zone 8',
    radiusMiles: 40,
    feeDisplay: '+$25',
    fillColor: '#B71C1C',
    strokeColor: '#7F0000',
    drawOnMap: true,
  },
  {
    label: 'Zone 9',
    radiusMiles: null,
    feeDisplay: 'Location dependent',
    fillColor: '#9E9E9E',
    strokeColor: '#424242',
    drawOnMap: false,
  },
];
