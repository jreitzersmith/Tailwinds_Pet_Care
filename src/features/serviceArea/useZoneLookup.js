import { useState, useCallback } from 'react';
import { BASE_COORDS, getZoneForDistance } from './serviceAreaData.js';

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

function useZoneLookup() {
  const [result, setResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  // Fast path: coords already known (e.g. from Places Autocomplete).
  // No geocoding API call needed.
  const lookupByCoords = useCallback((latLng, formattedAddress, onResult) => {
    const distanceMiles = haversineDistanceMiles(BASE_COORDS, latLng);
    const zone = getZoneForDistance(distanceMiles);
    const found = { zone, distanceMiles, formattedAddress, latLng };
    setResult(found);
    setError(null);
    if (onResult) onResult(found);
  }, []);

  // Fallback path: geocode a free-text address when no autocomplete place was selected.
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
        const found = { zone, distanceMiles, formattedAddress: results[0].formatted_address, latLng };
        setResult(found);
        if (onResult) onResult(found);
      });
    } catch {
      setIsSearching(false);
      setError('Could not connect to the address lookup service. Please try again.');
    }
  }, []);

  return { lookup, lookupByCoords, result, isSearching, error, reset };
}

export default useZoneLookup;
