import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { COLORS, FONTS } from '../../constants.jsx';
import useLoadGoogleMaps from './useLoadGoogleMaps.js';
import { BASE_COORDS, PRICING_ZONES, MILES_TO_METERS } from './serviceAreaData.js';

// ── ZoneLegend ────────────────────────────────────────────────────────────────

const thStyle = {
  backgroundColor: COLORS.blue,
  color: COLORS.white,
  padding: '0.65rem 1rem',
  textAlign: 'left',
  fontFamily: FONTS.header,
  fontWeight: '700',
};

const tdStyle = {
  padding: '0.6rem 1rem',
  borderBottom: `1px solid ${COLORS.lightBlue}`,
  fontFamily: FONTS.body,
  fontSize: '0.95rem',
};

function ZoneLegend() {
  return (
    <table
      style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1.75rem' }}
      aria-label='Service area pricing zones'
    >
      <thead>
        <tr>
          <th style={thStyle}>Zone</th>
          <th style={thStyle}>Travel fee</th>
        </tr>
      </thead>
      <tbody>
        {PRICING_ZONES.map((zone) => (
          <tr key={zone.label}>
            <td style={tdStyle}>
              <span
                style={{
                  display: 'inline-block',
                  width: '13px',
                  height: '13px',
                  borderRadius: '50%',
                  backgroundColor: zone.fillColor,
                  marginRight: '8px',
                  verticalAlign: 'middle',
                  border: `2px solid ${zone.strokeColor}`,
                }}
                aria-hidden='true'
              />
              {zone.label}
            </td>
            <td style={tdStyle}>{zone.feeDisplay}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── ServiceAreaMap ────────────────────────────────────────────────────────────

function ServiceAreaMap({ isLoaded }) {
  const mapDivRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !mapDivRef.current || mapInstanceRef.current) return;

    const map = new window.google.maps.Map(mapDivRef.current, {
      center: BASE_COORDS,
      zoom: 9,
      mapTypeId: 'roadmap',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapInstanceRef.current = map;

    // Draw only zones with drawOnMap:true, outermost-first so inner rings paint on top.
    [...PRICING_ZONES]
      .filter((zone) => zone.drawOnMap)
      .reverse()
      .forEach((zone) => {
        new window.google.maps.Circle({
          map,
          center: BASE_COORDS,
          radius: zone.radiusMiles * MILES_TO_METERS,
          fillColor: zone.fillColor,
          fillOpacity: 0.18,
          strokeColor: zone.strokeColor,
          strokeOpacity: 0.8,
          strokeWeight: 2,
        });
      });

    // Center marker at the business base.
    new window.google.maps.Marker({
      position: BASE_COORDS,
      map,
      title: 'Tailwinds Pet Care base location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: COLORS.red,
        fillOpacity: 1,
        strokeColor: COLORS.white,
        strokeWeight: 2,
      },
    });
  }, [isLoaded]);

  return (
    <div
      ref={mapDivRef}
      style={{
        width: '100%',
        height: '480px',
        borderRadius: '6px',
        overflow: 'hidden',
        border: `2px solid ${COLORS.lightBlue}`,
      }}
      aria-label='Service area map'
    />
  );
}

ServiceAreaMap.propTypes = {
  isLoaded: PropTypes.bool.isRequired,
};

// ── ServiceAreaPage ───────────────────────────────────────────────────────────

function ServiceAreaPage() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, hasError } = useLoadGoogleMaps(apiKey);

  return (
    <div className='page-container'>
      <h1
        style={{
          fontFamily: FONTS.header,
          fontSize: 'clamp(1.6rem, 4vw, 2.5rem)',
          color: COLORS.black,
          marginBottom: '0.5rem',
        }}
      >
        Service Area
      </h1>

      <p
        style={{
          fontFamily: FONTS.body,
          color: '#555',
          fontSize: '1.05rem',
          marginBottom: '2rem',
          lineHeight: 1.75,
          maxWidth: '640px',
        }}
      >
        We serve the greater DFW area within a 40-mile radius of South Dallas.
        A travel fee applies for visits beyond 5 miles. Zone 9 (40–100 miles)
        is available by arrangement — contact us for a quote.
      </p>

      {hasError && (
        <p
          role='alert'
          style={{
            color: COLORS.red,
            fontFamily: FONTS.body,
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            border: `1px solid ${COLORS.red}`,
            borderRadius: '4px',
            backgroundColor: '#fff5f5',
          }}
        >
          The map could not be loaded. Please check your connection, or{' '}
          <a href='/contact' style={{ color: COLORS.red, textDecoration: 'underline' }}>
            contact us
          </a>{' '}
          to confirm coverage at your address.
        </p>
      )}

      {!hasError && isLoaded && <ServiceAreaMap isLoaded={isLoaded} />}

      {!hasError && !isLoaded && (
        <div
          style={{
            height: '480px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f4f8',
            borderRadius: '6px',
            border: `2px solid ${COLORS.lightBlue}`,
            fontFamily: FONTS.body,
            color: '#666',
            fontSize: '1rem',
          }}
          aria-live='polite'
        >
          Loading map…
        </div>
      )}

      <ZoneLegend />

      <p
        style={{
          fontFamily: FONTS.body,
          fontSize: '0.9rem',
          color: '#666',
          marginTop: '1.25rem',
          lineHeight: 1.65,
        }}
      >
        Travel fees are added to the base service rate. Zone 1 has no travel fee.{' '}
        <a href='/contact' style={{ color: COLORS.blue }}>
          Contact us
        </a>{' '}
        if you&apos;re unsure which zone your address falls in.
      </p>
    </div>
  );
}

export default ServiceAreaPage;
