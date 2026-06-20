import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../../utils/supabase.js';
import { COLORS, FONTS } from '../../../constants.jsx';

export default function ServiceStep({ booking }) {
  const { form, update, next } = booking;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('services')
        .select('id, category, name, description, base_price')
        .eq('is_active', true)
        .order('category')
        .order('name');

      if (err) { setError(err.message); setLoading(false); return; }

      // Group by category
      const grouped = data.reduce((acc, svc) => {
        if (!acc[svc.category]) acc[svc.category] = [];
        acc[svc.category].push(svc);
        return acc;
      }, {});
      setCategories(Object.entries(grouped));
      setLoading(false);
    }
    fetchServices();
  }, []);

  function selectService(svc) {
    update({ serviceId: svc.id, serviceName: svc.name, basePrice: svc.base_price });
  }

  if (loading) return <p style={styles.msg}>Loading services…</p>;
  if (error)   return <p style={styles.error}>Could not load services: {error}</p>;

  return (
    <div>
      <p style={styles.subhead}>Choose the service you need.</p>
      {categories.map(([cat, svcs]) => (
        <div key={cat} style={styles.category}>
          <h3 style={styles.catName}>{cat}</h3>
          {svcs.map(svc => {
            const selected = form.serviceId === svc.id;
            return (
              <button key={svc.id}
                style={{ ...styles.serviceBtn, ...(selected ? styles.serviceBtnSelected : {}) }}
                onClick={() => selectService(svc)}>
                <span style={styles.svcName}>{svc.name}</span>
                <span style={styles.svcPrice}>${svc.base_price}</span>
                <span style={styles.svcDesc}>{svc.description}</span>
              </button>
            );
          })}
        </div>
      ))}

      <div style={styles.footer}>
        <button style={styles.primaryBtn} onClick={next} disabled={!form.serviceId}>
          Continue
        </button>
      </div>
    </div>
  );
}

ServiceStep.propTypes = {
  booking: PropTypes.shape({
    form: PropTypes.object.isRequired,
    update: PropTypes.func.isRequired,
    next: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = {
  subhead: { fontFamily: FONTS.body, color: COLORS.black, marginBottom: '1.25rem' },
  msg:     { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  error:   { fontFamily: FONTS.body, color: COLORS.red, textAlign: 'center', padding: '1rem' },
  category: { marginBottom: '1.5rem' },
  catName: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1rem', marginBottom: '0.75rem' },
  serviceBtn: {
    display: 'grid', gridTemplateColumns: '1fr auto', gridTemplateRows: 'auto auto',
    gap: '0.2rem 0.5rem', width: '100%', textAlign: 'left',
    padding: '0.75rem 1rem', marginBottom: '0.5rem',
    background: COLORS.white, border: `1px solid ${COLORS.lightBlue}`,
    borderRadius: '8px', cursor: 'pointer',
  },
  serviceBtnSelected: {
    borderColor: COLORS.blue, background: '#f0f8ff', boxShadow: `0 0 0 2px ${COLORS.blue}`,
  },
  svcName:  { fontFamily: FONTS.body, fontWeight: '600', color: COLORS.black, gridColumn: 1 },
  svcPrice: { fontFamily: FONTS.body, fontWeight: '700', color: COLORS.blue, gridColumn: 2, gridRow: '1 / 3' },
  svcDesc:  { fontFamily: FONTS.body, fontSize: '0.85rem', color: '#555', gridColumn: 1 },
  footer:   { marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' },
  primaryBtn: {
    padding: '0.75rem 2rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer',
    fontFamily: FONTS.body, opacity: 1,
  },
};
