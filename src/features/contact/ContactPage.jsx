import { Link } from 'react-router-dom';
import useContactForm from './useContactForm.js';
import { COLORS, FONTS, CONTACT } from '../../constants.jsx';

const SERVICE_OPTIONS = [
  'Pet Sitting (In-Home)',
  'Drop-In Visits',
  'Overnight Stays',
  'Extended Care Package',
  'Dog Walking',
  'Outdoor Fecal Collection',
  'Exotic Pet Care',
  'Aquarium Maintenance',
  'Senior Pet Care',
  'Puppy & Kitten Visits',
  'Medication Administration',
  'Custom Pet Food',
  'Pet Transport (Within DFW)',
  'Mail & Package Retrieval',
  'Plant Watering',
  'Outdoor Dog Run',
  'Custom Dog House',
  'Custom Cat Tree & Cat Walk',
  'Other / Not Sure',
];

function ContactPage() {
  const { fields, errors, submitted, handleChange, handleSubmit } = useContactForm();

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

  const heroSubStyle = {
    fontFamily: FONTS.body,
    fontSize: '1.05rem',
    opacity: 0.9,
    maxWidth: '500px',
    margin: '0 auto',
    lineHeight: 1.6,
  };

  const layoutStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1.6fr',
    gap: '3rem',
    alignItems: 'start',
  };

  const infoCardStyle = {
    backgroundColor: '#f4f8fb',
    border: '1px solid #dde8f4',
    borderRadius: '6px',
    padding: '1.75rem',
  };

  const infoHeadingStyle = {
    fontFamily: FONTS.header,
    fontSize: '1.2rem',
    color: COLORS.blue,
    marginBottom: '1.25rem',
  };

  const infoItemStyle = {
    fontFamily: FONTS.body,
    fontSize: '0.95rem',
    color: '#444',
    marginBottom: '1rem',
    lineHeight: 1.5,
  };

  const infoLabelStyle = {
    fontWeight: '700',
    color: COLORS.black,
    display: 'block',
    marginBottom: '0.2rem',
  };

  const infoLinkStyle = {
    color: COLORS.blue,
    textDecoration: 'none',
    fontWeight: '600',
  };

  const formHeadingStyle = {
    fontFamily: FONTS.header,
    fontSize: '1.2rem',
    color: COLORS.black,
    marginBottom: '1.25rem',
  };

  const fieldGroupStyle = { marginBottom: '1.1rem' };

  const labelStyle = {
    display: 'block',
    fontFamily: FONTS.body,
    fontSize: '0.9rem',
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: '0.35rem',
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '0.6rem 0.85rem',
    fontFamily: FONTS.body,
    fontSize: '0.95rem',
    border: `1px solid ${hasError ? COLORS.red : '#ccd9e8'}`,
    borderRadius: '4px',
    outline: 'none',
    boxSizing: 'border-box',
  });

  const errorStyle = {
    fontFamily: FONTS.body,
    fontSize: '0.8rem',
    color: COLORS.red,
    marginTop: '0.3rem',
  };

  const submitBtnStyle = {
    backgroundColor: COLORS.blue,
    color: COLORS.white,
    fontFamily: FONTS.body,
    fontWeight: '700',
    fontSize: '1rem',
    padding: '0.85rem 2rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '0.5rem',
  };

  const successStyle = {
    backgroundColor: '#e6f4ea',
    border: '1px solid #a8d5b5',
    borderRadius: '4px',
    padding: '1rem 1.25rem',
    fontFamily: FONTS.body,
    fontSize: '0.95rem',
    color: '#2d6a3f',
    marginBottom: '1rem',
  };

  const quoteNoteStyle = {
    backgroundColor: '#eef5fc',
    border: `1px solid ${COLORS.blue}`,
    borderRadius: '6px',
    padding: '1rem 1.25rem',
    fontFamily: FONTS.body,
    fontSize: '0.92rem',
    color: '#333',
    lineHeight: 1.55,
    marginBottom: '1.5rem',
  };

  return (
    <>
      <section style={heroStyle}>
        <h1 style={h1Style}>Contact Us</h1>
        <p style={heroSubStyle}>
          Have a question or ready to book? Reach out and we will get back to you promptly.
        </p>
      </section>

      <div className='page-container'>
        <div style={layoutStyle} className='contact-layout'>

          <div style={infoCardStyle}>
            <h2 style={infoHeadingStyle}>Get in Touch</h2>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Phone</span>
              <a href={`tel:${CONTACT.phone}`} style={infoLinkStyle}>{CONTACT.phone}</a>
            </div>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Email</span>
              <a href={`mailto:${CONTACT.email}`} style={infoLinkStyle}>{CONTACT.email}</a>
            </div>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Service Area</span>
              Dallas&ndash;Fort Worth Metroplex
            </div>
          </div>

          <div>
            <h2 style={formHeadingStyle}>Send an Inquiry</h2>

            <p style={quoteNoteStyle}>
              <strong>Prefer a quote without filling out this form?</strong>{' '}
              <Link to='/signup' style={infoLinkStyle}>Create a free account</Link> to get a
              detailed, itemized quote online — no need to submit an inquiry and wait to hear back.
            </p>

            {submitted && (
              <div style={successStyle}>
                Thanks! Your email client should have opened with your message pre-filled.
                If it did not open, email us directly at{' '}
                <a href={`mailto:${CONTACT.email}`} style={{ color: COLORS.blue }}>
                  {CONTACT.email}
                </a>.
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate>
              <div style={fieldGroupStyle}>
                <label htmlFor='name' style={labelStyle}>
                  Full Name <span style={{ color: COLORS.red }}>*</span>
                </label>
                <input id='name' name='name' type='text' value={fields.name} onChange={handleChange} style={inputStyle(!!errors.name)} />
                {errors.name && <p style={errorStyle}>{errors.name}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={fieldGroupStyle}>
                  <label htmlFor='email' style={labelStyle}>
                    Email <span style={{ color: COLORS.red }}>*</span>
                  </label>
                  <input id='email' name='email' type='email' value={fields.email} onChange={handleChange} style={inputStyle(!!errors.email)} />
                  {errors.email && <p style={errorStyle}>{errors.email}</p>}
                </div>
                <div style={fieldGroupStyle}>
                  <label htmlFor='phone' style={labelStyle}>Phone</label>
                  <input id='phone' name='phone' type='tel' value={fields.phone} onChange={handleChange} style={inputStyle(false)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={fieldGroupStyle}>
                  <label htmlFor='petType' style={labelStyle}>Pet Type</label>
                  <input id='petType' name='petType' type='text' placeholder='e.g. Dog, Cat, Parrot' value={fields.petType} onChange={handleChange} style={inputStyle(false)} />
                </div>
                <div style={fieldGroupStyle}>
                  <label htmlFor='service' style={labelStyle}>Service Interest</label>
                  <select id='service' name='service' value={fields.service} onChange={handleChange} style={{ ...inputStyle(false), backgroundColor: '#fff' }}>
                    <option value=''>— Select a service —</option>
                    {SERVICE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={fieldGroupStyle}>
                <label htmlFor='message' style={labelStyle}>
                  Message <span style={{ color: COLORS.red }}>*</span>
                </label>
                <textarea
                  id='message'
                  name='message'
                  rows={5}
                  value={fields.message}
                  onChange={handleChange}
                  style={{ ...inputStyle(!!errors.message), resize: 'vertical' }}
                />
                {errors.message && <p style={errorStyle}>{errors.message}</p>}
              </div>

              <button type='submit' style={submitBtnStyle}>Send Message</button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}

export default ContactPage;
