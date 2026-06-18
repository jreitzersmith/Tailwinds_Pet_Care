import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { COLORS, FONTS } from '../../constants.jsx';
import useZoneLookup from './useZoneLookup.js';

// Bias autocomplete suggestions toward DFW without hard-restricting them.
const DFW_BOUNDS = { north: 33.3, south: 32.2, east: -96.3, west: -97.8 };

function AddressSearch({ onResult }) {
  const [inputValue, setInputValue] = useState('');
  const { lookup, lookupByCoords, result, isSearching, error, reset } = useZoneLookup();
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  // Tracks whether the current inputValue came from an autocomplete selection.
  const selectedPlaceRef = useRef(null);

  // Initialize Places Autocomplete once on mount.
  // AddressSearch only renders after Maps API is loaded, so importLibrary is safe.
  useEffect(() => {
    if (!inputRef.current || autocompleteRef.current) return;

    async function initAutocomplete() {
      try {
        const { Autocomplete } = await window.google.maps.importLibrary('places');
        const ac = new Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'us' },
          bounds: DFW_BOUNDS,
          strictBounds: false,
          fields: ['geometry', 'formatted_address'],
          types: ['geocode'],
        });
        autocompleteRef.current = ac;

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.geometry?.location) return;
          const latLng = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          const formattedAddress = place.formatted_address || inputRef.current.value;
          selectedPlaceRef.current = formattedAddress;
          setInputValue(formattedAddress);
          lookupByCoords(latLng, formattedAddress, onResult);
        });
      } catch (e) {
        // Places API unavailable — geocoding fallback still works on form submit.
        console.warn('Places Autocomplete unavailable:', e.message);
      }
    }

    initAutocomplete();
  }, [lookupByCoords, onResult]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // If the current value was already resolved via autocomplete, don't re-geocode.
    if (selectedPlaceRef.current === inputValue) return;
    selectedPlaceRef.current = null;
    lookup(inputValue, onResult);
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
    selectedPlaceRef.current = null;
    if (result || error) reset();
  };

  const containerStyle = {
    margin: '1.75rem 0',
    padding: '1.25rem 1.5rem',
    border: `1px solid ${COLORS.lightBlue}`,
    borderRadius: '6px',
    backgroundColor: '#f6faff',
  };

  const labelStyle = {
    display: 'block',
    fontFamily: FONTS.header,
    fontWeight: '700',
    fontSize: '1rem',
    color: COLORS.black,
    marginBottom: '0.6rem',
  };

  const inputStyle = {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: '1rem',
    padding: '0.6rem 0.85rem',
    border: `1px solid ${COLORS.lightBlue}`,
    borderRadius: '4px',
    outline: 'none',
    minWidth: 0,
  };

  const btnStyle = {
    fontFamily: FONTS.body,
    fontWeight: '700',
    fontSize: '0.95rem',
    padding: '0.6rem 1.25rem',
    backgroundColor: COLORS.blue,
    color: COLORS.white,
    border: 'none',
    borderRadius: '4px',
    cursor: isSearching ? 'wait' : 'pointer',
    flexShrink: 0,
    opacity: isSearching ? 0.7 : 1,
    transition: 'opacity 0.2s',
  };

  return (
    <div style={containerStyle}>
      <label htmlFor='address-search' style={labelStyle}>
        Check your address
      </label>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}
        autoComplete='off'
      >
        <input
          ref={inputRef}
          id='address-search'
          type='text'
          value={inputValue}
          onChange={handleChange}
          placeholder='Start typing an address, city, or zip…'
          style={inputStyle}
          disabled={isSearching}
          aria-label='Enter address to look up service zone'
          aria-autocomplete='list'
        />
        <button
          type='submit'
          style={btnStyle}
          disabled={isSearching || !inputValue.trim()}
        >
          {isSearching ? 'Searching…' : 'Check coverage'}
        </button>
      </form>

      {error && (
        <p
          role='alert'
          style={{
            marginTop: '0.85rem',
            fontFamily: FONTS.body,
            fontSize: '0.9rem',
            color: COLORS.red,
          }}
        >
          {error}
        </p>
      )}

      {result && <SearchResult result={result} />}
    </div>
  );
}

AddressSearch.propTypes = {
  onResult: PropTypes.func.isRequired,
};

// ── SearchResult ──────────────────────────────────────────────────────────────

function SearchResult({ result }) {
  const { zone, distanceMiles, formattedAddress } = result;
  const isOutOfRange = !zone;

  const cardStyle = {
    marginTop: '1rem',
    padding: '1rem 1.25rem',
    borderRadius: '4px',
    backgroundColor: isOutOfRange ? '#fff5f5' : '#f0fff4',
    border: `1px solid ${isOutOfRange ? COLORS.red : '#68C78A'}`,
    fontFamily: FONTS.body,
  };

  return (
    <div style={cardStyle} role='region' aria-label='Zone lookup result'>
      <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.35rem' }}>
        {formattedAddress}
      </p>

      {isOutOfRange ? (
        <p style={{ color: COLORS.red, fontWeight: '700' }}>
          This address is outside our current service area (&gt;100 miles).{' '}
          <a href='/contact' style={{ color: COLORS.red, textDecoration: 'underline' }}>
            Contact us
          </a>{' '}
          to discuss options.
        </p>
      ) : (
        <p style={{ fontSize: '1rem', color: COLORS.black }}>
          <strong style={{ color: COLORS.blue }}>{zone.label}</strong>
          {'  ·  '}
          {distanceMiles.toFixed(1)} miles from base
          {'  ·  '}
          Travel fee: <strong>{zone.feeDisplay}</strong>
        </p>
      )}
    </div>
  );
}

SearchResult.propTypes = {
  result: PropTypes.shape({
    zone: PropTypes.object,
    distanceMiles: PropTypes.number.isRequired,
    formattedAddress: PropTypes.string.isRequired,
  }).isRequired,
};

export default AddressSearch;
