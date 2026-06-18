import { useState, useEffect } from 'react';

const SCRIPT_ID = 'google-maps-js-api';

/**
 * Dynamically loads the Google Maps JavaScript API script once per page session.
 * Subsequent calls reuse the already-loaded API without re-injecting the script.
 *
 * @param {string} apiKey - VITE_GOOGLE_MAPS_API_KEY from import.meta.env
 * @returns {{ isLoaded: boolean, hasError: boolean }}
 */
function useLoadGoogleMaps(apiKey) {
  const [isLoaded, setIsLoaded] = useState(
    () => typeof window !== 'undefined' && typeof window.google?.maps?.importLibrary === 'function',
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!apiKey) {
      setHasError(true);
      return;
    }
    // Already loaded by a previous render or call.
    if (typeof window.google?.maps?.importLibrary === 'function') {
      setIsLoaded(true);
      return;
    }
    // Script tag injected but not yet finished loading — attach listeners.
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => setIsLoaded(true));
      existing.addEventListener('error', () => setHasError(true));
      return;
    }
    // First load: inject the script tag.
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setHasError(true);
    document.head.appendChild(script);
  }, [apiKey]);

  return { isLoaded, hasError };
}

export default useLoadGoogleMaps;
