import { useState, useCallback } from 'react';
import { BASE_COORDS, getZoneForDistance } from './serviceAreaData.js';

/**
 * Haversine formula — straight-line distance between two lat/lng coords in miles.
 * Accurate enough for zone lookup; does not account for road distance.
 */
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
 * Geocodes an address, calculates its distance from the service base,
 * and returns the matching pricing zone.
 *
 * Requires the Google Maps Geocoding API to be enabled in GCP.
 * Calls onResult({ latLng, zone, distanceMiles, formattedAddress }) on success.
 *
 * @returns {{ lookup, result, isSearching, error, reset }}
 */
function useZoneLookup() {
  const [result, setResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const lookup = useCallback(async (address, onResult) => {
    const trimmed = address.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const { Geocoder } = await window.google.maps.importLibrary('geocoding');
      const geocoder = new Geocoder();

      geocoder.geocode({ address: trimmed, region: 'us' }, (results, status) => {
        setIsSearching(false);
        if (status !== 'OK' || !results.length) {
          setError('Address not found. Please try a more specific address including city and state.');
          return;
        }

        const loc = results[0].geometry.location;
        const latLng = { lat: loc.lat(), lng: loc.lng() };
        const distanceMiles = haversineDistanceMiles(BASE_COORDS, latLng);
        const zone = getZoneForDistance(distanceMiles);
        const found = {
          zone,
          distanceMiles,
          formattedAddress: results[0].formatted_address,
          latLng,
        };

        setResult(found);
        if (onResult) onResult(found);
      });
    } catch {
      setIsSearching(false);
      setError('Could not connect to the address lookup service. Please try again.');
    }
  }, []);

  return { lookup, result, isSearching, error, reset };
}

export default useZoneLookup;
