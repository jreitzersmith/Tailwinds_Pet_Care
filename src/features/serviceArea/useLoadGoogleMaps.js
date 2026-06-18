import { useState, useEffect } from 'react';

const SCRIPT_ID = 'google-maps-js-api';
const CALLBACK_NAME = '__googleMapsReady';

/**
 * Dynamically loads the Google Maps JavaScript API script once per page session.
 * Uses the `callback` URL parameter (not onload) so isLoaded only becomes true
 * after importLibrary is fully available — required with loading=async.
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

    // Already fully loaded (e.g. fast refresh, HMR).
    if (typeof window.google?.maps?.importLibrary === 'function') {
      setIsLoaded(true);
      return;
    }

    // Script already injected — chain behind the existing callback.
    if (document.getElementById(SCRIPT_ID)) {
      const prev = window[CALLBACK_NAME];
      window[CALLBACK_NAME] = () => {
        if (typeof prev === 'function') prev();
        setIsLoaded(true);
      };
      return;
    }

    // First load: define callback before injecting script so Google can call it.
    window[CALLBACK_NAME] = () => {
      setIsLoaded(true);
      delete window[CALLBACK_NAME];
    };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => setHasError(true);
    document.head.appendChild(script);
  }, [apiKey]);

  return { isLoaded, hasError };
}

export default useLoadGoogleMaps;
