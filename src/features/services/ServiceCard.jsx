import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { COLORS, FONTS } from '../../constants.jsx';

function ServiceCard({ name, description, gallery }) {
  const [hovered, setHovered] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const hasGallery = Boolean(gallery && gallery.length > 0);

  useEffect(() => {
    if (lightboxIndex === null || !hasGallery) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((i) => (i + 1) % gallery.length);
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((i) => (i - 1 + gallery.length) % gallery.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, gallery, hasGallery]);

  const cardStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #dde8f4',
    borderRadius: '6px',
    padding: '1.4rem 1.6rem',
    boxShadow: '0 2px 8px rgba(104,175,230,0.10)',
    position: 'relative',
    cursor: hasGallery ? 'pointer' : 'default',
  };

  const nameStyle = {
    fontFamily: FONTS.header,
    fontSize: '1.05rem',
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: '0.5rem',
    paddingRight: hasGallery ? '5.75rem' : 0,
  };

  const descStyle = {
    fontFamily: FONTS.body,
    fontSize: '0.93rem',
    color: '#555',
    lineHeight: 1.65,
  };

  const badgeStyle = {
    position: 'absolute',
    top: '1.1rem',
    right: '1.2rem',
    fontFamily: FONTS.body,
    fontSize: '0.72rem',
    fontWeight: '700',
    color: COLORS.blue,
    backgroundColor: '#eef5fc',
    border: '1px solid #dde8f4',
    borderRadius: '999px',
    padding: '0.2rem 0.6rem',
    whiteSpace: 'nowrap',
  };

  const overlayStyle = {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: '6px',
    padding: '1rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: '0.5rem',
    overflowY: 'auto',
    zIndex: 2,
  };

  const thumbStyle = {
    width: '68px',
    height: '68px',
    objectFit: 'cover',
    borderRadius: '4px',
    cursor: 'zoom-in',
    border: '1px solid #dde8f4',
  };

  const closeBtnStyle = {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    background: COLORS.white,
    border: '1px solid #dde8f4',
    borderRadius: '999px',
    width: '1.6rem',
    height: '1.6rem',
    lineHeight: 1,
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: '#555',
  };

  const lightboxOverlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const navBtnStyle = {
    background: 'transparent',
    border: 'none',
    color: COLORS.white,
    fontSize: '2.5rem',
    cursor: 'pointer',
    lineHeight: 1,
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => hasGallery && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => hasGallery && setHovered(true)}
    >
      <h3 style={nameStyle}>{name}</h3>
      {hasGallery && (
        <span style={badgeStyle}>📷 {gallery.length} photos</span>
      )}
      <p style={descStyle}>{description}</p>

      {hasGallery && hovered && (
        <div style={overlayStyle}>
          <button
            type='button'
            style={closeBtnStyle}
            onClick={(e) => {
              e.stopPropagation();
              setHovered(false);
            }}
            aria-label='Close photo preview'
          >
            ✕
          </button>
          {gallery.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`${name} example ${i + 1}`}
              style={thumbStyle}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(i);
              }}
            />
          ))}
        </div>
      )}

      {hasGallery && lightboxIndex !== null && (
        <div style={lightboxOverlayStyle} onClick={() => setLightboxIndex(null)}>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '2rem',
              background: 'transparent',
              border: 'none',
              color: COLORS.white,
              fontSize: '2rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label='Close'
          >
            ✕
          </button>

          {gallery.length > 1 && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i - 1 + gallery.length) % gallery.length);
              }}
              style={{ ...navBtnStyle, position: 'absolute', left: '1rem' }}
              aria-label='Previous photo'
            >
              ‹
            </button>
          )}

          <img
            src={gallery[lightboxIndex]}
            alt={`${name} example ${lightboxIndex + 1}`}
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: '4px',
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {gallery.length > 1 && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i + 1) % gallery.length);
              }}
              style={{ ...navBtnStyle, position: 'absolute', right: '1rem' }}
              aria-label='Next photo'
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}

ServiceCard.propTypes = {
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  gallery: PropTypes.arrayOf(PropTypes.string),
};

ServiceCard.defaultProps = {
  gallery: undefined,
};

export default ServiceCard;
