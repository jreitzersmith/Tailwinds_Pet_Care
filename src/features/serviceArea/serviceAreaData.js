// Service area constants — single source of truth for zone definitions.
// Base location: 2500 South Blvd, Dallas TX 75215

export const BASE_COORDS = { lat: 32.7383, lng: -96.7952 };

export const MILES_TO_METERS = 1609.344;

// Zones are defined outermost-first so inner circles paint on top when rendering.
// travelFee is the add-on cost in USD above the base service rate.
export const PRICING_ZONES = [
  {
    label: '0–5 miles',
    radiusMiles: 5,
    travelFee: 0,
    fillColor: '#4CAF50',
    strokeColor: '#388E3C',
  },
  {
    label: '5–10 miles',
    radiusMiles: 10,
    travelFee: 5,
    fillColor: '#68AFE6',
    strokeColor: '#3A7FC1',
  },
  {
    label: '10–15 miles',
    radiusMiles: 15,
    travelFee: 10,
    fillColor: '#FF9800',
    strokeColor: '#E65100',
  },
  {
    label: '15–20 miles',
    radiusMiles: 20,
    travelFee: 15,
    fillColor: '#E20016',
    strokeColor: '#9B0010',
  },
];
