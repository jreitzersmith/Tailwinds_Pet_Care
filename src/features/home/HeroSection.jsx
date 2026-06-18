import { Link } from 'react-router-dom';
import { COLORS, FONTS, SOCIAL_LINKS, CONTACT, BUSINESS } from '../../constants.jsx';

function HeroSection() {
  const sectionStyle = {
    minHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '3rem 1.5rem',
    background: `linear-gradient(160deg, ${COLORS.white} 0%, #e8f4fc 100%)`,
  };

  const logoStyle = {
    height: '140px',
    width: 'auto',
    marginBottom: '1.75rem',
    filter: 'drop-shadow(0 4px 12px rgba(104,175,230,0.35))',
  };

  const h1Style = {
    fontFamily: FONTS.header,
    fontSize: 'clamp(2rem, 5vw, 3.25rem)',
    color: COLORS.black,
    marginBottom: '0.5rem',
    lineHeight: 1.2,
  };

  const taglineStyle = {
    fontFamily: FONTS.accent,
    fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
    color: COLORS.blue,
    marginBottom: '1.25rem',
    fontStyle: 'italic',
  };

  const descStyle = {
    fontFamily: FONTS.body,
    fontSize: '1.05rem',
    color: '#444',
    maxWidth: '560px',
    lineHeight: 1.75,
    marginBottom: '2.25rem',
  };

  const ctaRowStyle = {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '2.5rem',
  };

  const primaryBtnStyle = {
    backgroundColor: COLORS.blue,
    color: COLORS.white,
    fontFamily: FONTS.body,
    fontWeight: '700',
    fontSize: '1rem',
    padding: '0.85rem 2rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'opacity 0.2s',
  };

  const secondaryBtnStyle = {
    backgroundColor: 'transparent',
    color: COLORS.red,
    fontFamily: FONTS.body,
    fontWeight: '700',
    fontSize: '1rem',
    padding: '0.85rem 2rem',
    borderRadius: '4px',
    border: `2px solid ${COLORS.red}`,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'background-color 0.2s, color 0.2s',
  };

  const socialRowStyle = {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
  };

  const socialLinkStyle = {
    color: COLORS.lightBlue,
    fontFamily: FONTS.body,
    fontSize: '0.95rem',
    fontWeight: '600',
    textDecoration: 'none',
    borderBottom: `2px solid ${COLORS.lightBlue}`,
    paddingBottom: '2px',
    transition: 'color 0.2s, border-color 0.2s',
  };

  return (
    <section style={sectionStyle} aria-label='Hero'>
      <img
        src='/assets/Tailwinds_Logo.png'
        alt={`${BUSINESS.name} logo`}
        style={logoStyle}
      />

      <h1 style={h1Style}>{BUSINESS.name}</h1>

      <p style={taglineStyle}>
        Trusted pet care for DFW&apos;s airline community
      </p>

      <p style={descStyle}>
        Based in Dallas and proudly serving Southwest and American Airlines crew members.
        We care for dogs, cats, birds, reptiles, fish, and small mammals — so you can
        fly with confidence knowing your pet is in great hands.
      </p>

      <div style={ctaRowStyle}>
        <Link to='/contact' style={primaryBtnStyle}>
          Book a Service
        </Link>
        <Link to='/services' style={secondaryBtnStyle}>
          Our Services
        </Link>
      </div>

      <div style={socialRowStyle}>
        <a
          href={SOCIAL_LINKS.facebook}
          target='_blank'
          rel='noopener noreferrer'
          style={socialLinkStyle}
          aria-label='Tailwinds Pet Care on Facebook'
        >
          Facebook
        </a>
        <a
          href={SOCIAL_LINKS.instagram}
          target='_blank'
          rel='noopener noreferrer'
          style={socialLinkStyle}
          aria-label='Tailwinds Pet Care on Instagram'
        >
          Instagram
        </a>
      </div>
    </section>
  );
}

export default HeroSection;
