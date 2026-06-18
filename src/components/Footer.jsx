import { COLORS, FONTS, SOCIAL_LINKS, CONTACT, BUSINESS } from '../constants.jsx';

function Footer() {
  const year = new Date().getFullYear();

  const footerStyle = {
    backgroundColor: COLORS.black,
    color: COLORS.white,
    fontFamily: FONTS.body,
    padding: '2.5rem 1rem 1.5rem',
  };

  const headingStyle = {
    fontFamily: FONTS.header,
    color: COLORS.blue,
    fontSize: '1rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const linkStyle = {
    color: COLORS.lightBlue,
    display: 'block',
    marginBottom: '0.4rem',
    fontSize: '0.95rem',
    transition: 'color 0.2s',
  };

  return (
    <footer style={footerStyle}>
      <div className='footer-grid'>
        <div>
          <h3 style={headingStyle}>{BUSINESS.name}</h3>
          <a href={`tel:${CONTACT.phone}`} style={linkStyle}>{CONTACT.phone}</a>
          <a href={`mailto:${CONTACT.email}`} style={linkStyle}>{CONTACT.email}</a>
        </div>

        <div>
          <h3 style={headingStyle}>Navigate</h3>
          <a href='/services' style={linkStyle}>Services</a>
          <a href='/about' style={linkStyle}>About</a>
          <a href='/service-area' style={linkStyle}>Service Area</a>
          <a href='/contact' style={linkStyle}>Contact</a>
        </div>

        <div>
          <h3 style={headingStyle}>Follow Us</h3>
          <a
            href={SOCIAL_LINKS.facebook}
            target='_blank'
            rel='noopener noreferrer'
            style={linkStyle}
          >
            Facebook
          </a>
          <a
            href={SOCIAL_LINKS.instagram}
            target='_blank'
            rel='noopener noreferrer'
            style={linkStyle}
          >
            Instagram
          </a>
        </div>
      </div>

      <p style={{
        textAlign: 'center',
        marginTop: '2rem',
        paddingTop: '1rem',
        borderTop: `1px solid ${COLORS.lightBlue}`,
        fontSize: '0.8rem',
        color: COLORS.lightBlue,
      }}>
        © {year} {BUSINESS.name}, LLC. All rights reserved.
      </p>
    </footer>
  );
}

export default Footer;
