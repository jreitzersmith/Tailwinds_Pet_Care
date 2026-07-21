import { Link } from 'react-router-dom';
import { SERVICE_CATEGORIES } from './servicesData.js';
import ServiceCard from './ServiceCard.jsx';
import { COLORS, FONTS } from '../../constants.jsx';

function ServicesPage() {
  const heroStyle = {
    backgroundColor: COLORS.blue,
    color: COLORS.white,
    textAlign: 'center',
    padding: '3.5rem 1.5rem',
  };

  const h1Style = {
    fontFamily: FONTS.header,
    fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
    marginBottom: '0.75rem',
  };

  const subtitleStyle = {
    fontFamily: FONTS.body,
    fontSize: '1.05rem',
    opacity: 0.9,
    maxWidth: '540px',
    margin: '0 auto',
    lineHeight: 1.6,
  };

  const categoryHeadingStyle = {
    fontFamily: FONTS.header,
    fontSize: '1.3rem',
    color: COLORS.blue,
    borderBottom: '2px solid #dde8f4',
    paddingBottom: '0.5rem',
    marginBottom: '1.25rem',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.1rem',
    marginBottom: '3rem',
  };

  const ctaStyle = {
    backgroundColor: COLORS.red,
    color: COLORS.white,
    fontFamily: FONTS.body,
    fontWeight: '700',
    fontSize: '1rem',
    padding: '0.9rem 2.25rem',
    borderRadius: '4px',
    textDecoration: 'none',
    display: 'inline-block',
  };

  return (
    <>
      <section style={heroStyle}>
        <h1 style={h1Style}>Our Services</h1>
        <p style={subtitleStyle}>
          Comprehensive pet care for DFW airline crew — from quick drop-ins to
          extended stays, aquarium upkeep, and custom builds.
        </p>
      </section>

      <div className='page-container'>
        {SERVICE_CATEGORIES.map(({ category, services }) => (
          <section key={category}>
            <h2 style={categoryHeadingStyle}>{category}</h2>
            <div style={gridStyle}>
              {services.map((service) => (
                <ServiceCard
                  key={service.name}
                  name={service.name}
                  description={service.description}
                  gallery={service.gallery}
                />
              ))}
            </div>
          </section>
        ))}

        <div style={{ textAlign: 'center', padding: '1rem 0 3rem' }}>
          <p style={{ fontFamily: FONTS.body, color: '#555', marginBottom: '1.25rem' }}>
            Ready to get started? Reach out to schedule a service or ask any questions.
          </p>
          <Link to='/contact' style={ctaStyle}>Book a Service</Link>
        </div>
      </div>
    </>
  );
}

export default ServicesPage;
