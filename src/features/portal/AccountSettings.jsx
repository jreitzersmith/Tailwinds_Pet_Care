import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../utils/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../constants.jsx';
import useLoadGoogleMaps from '../serviceArea/useLoadGoogleMaps.js';

const DFW_BOUNDS = { north: 33.35, south: 32.35, east: -96.45, west: -97.65 };

const BLANK = {
  phone: '',
  airline: '',
  address: '',
  preferred_vet_name: '',
  preferred_vet_clinic: '',
  preferred_vet_phone: '',
  preferred_vet_address: '',
};

export default function AccountSettings() {
  const { user } = useAuth();
  const { isLoaded: mapsLoaded } = useLoadGoogleMaps(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  );

  const [profile, setProfile]   = useState(BLANK);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [fetchErr, setFetchErr] = useState(null);
  const [saveErr, setSaveErr]   = useState(null);

  const addrInputRef = useRef(null);
  const acRef        = useRef(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('customers')
        .select('phone, airline, address, preferred_vet_name, preferred_vet_clinic, preferred_vet_phone, preferred_vet_address')
        .eq('id', user.id)
        .single();
      if (error) { setFetchErr(error.message); }
      else {
        setProfile({
          phone:                 data.phone                 ?? '',
          airline:               data.airline               ?? '',
          address:               data.address               ?? '',
          preferred_vet_name:    data.preferred_vet_name    ?? '',
          preferred_vet_clinic:  data.preferred_vet_clinic  ?? '',
          preferred_vet_phone:   data.preferred_vet_phone   ?? '',
          preferred_vet_address: data.preferred_vet_address ?? '',
        });
      }
      setLoading(false);
    }
    load();
  }, [user.id]);

  useEffect(() => {
    if (!mapsLoaded || !addrInputRef.current || acRef.current) return;
    (async () => {
      const { Autocomplete } = await window.google.maps.importLibrary('places');
      const ac = new Autocomplete(addrInputRef.current, {
        componentRestrictions: { country: 'us' },
        bounds: new window.google.maps.LatLngBounds(
          { lat: DFW_BOUNDS.south, lng: DFW_BOUNDS.west },
          { lat: DFW_BOUNDS.north, lng: DFW_BOUNDS.east }
        ),
        strictBounds: false,
        fields: ['formatted_address'],
        types: ['geocode'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        const addr  = place.formatted_address || addrInputRef.current.value;
        setProfile(prev => ({ ...prev, address: addr }));
      });
      acRef.current = ac;
    })();
  }, [mapsLoaded]);

  function update(field, val) {
    setProfile(prev => ({ ...prev, [field]: val }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true); setSaveErr(null);
    const { error } = await supabase.from('customers').update({
      phone:                 profile.phone                 || null,
      airline:               profile.airline               || null,
      address:               profile.address               || null,
      preferred_vet_name:    profile.preferred_vet_name    || null,
      preferred_vet_clinic:  profile.preferred_vet_clinic  || null,
      preferred_vet_phone:   profile.preferred_vet_phone   || null,
      preferred_vet_address: profile.preferred_vet_address || null,
    }).eq('id', user.id);
    setSaving(false);
    if (error) { setSaveErr(error.message); }
    else { setSaved(true); }
  }

  if (loading)  return <p style={s.msg}>Loading account info…</p>;
  if (fetchErr) return <p style={s.errMsg}>{fetchErr}</p>;

  return (
    <div style={s.wrap}>

      {/* Contact Information */}
      <section style={s.section}>
        <h2 style={s.sectionHead}>Contact Information</h2>
        <p style={s.hint}>Your phone number and airline — helps us reach you during your trips.</p>
        <div style={s.grid}>
          <label style={s.label}>Phone Number
            <input
              style={s.input}
              type='tel'
              value={profile.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder='(214) 555-0100'
            />
          </label>
          <label style={s.label}>Affiliated Airline
            <select
              style={s.select}
              value={profile.airline}
              onChange={e => update('airline', e.target.value)}
            >
              <option value=''>None / Not Affiliated</option>
              <option value='Southwest'>Southwest Airlines</option>
              <option value='American'>American Airlines</option>
              <option value='United'>United Airlines</option>
              <option value='Delta'>Delta Air Lines</option>
              <option value='Other'>Other</option>
            </select>
          </label>
        </div>
      </section>

      {/* Service Address */}
      <section style={s.section}>
        <h2 style={s.sectionHead}>Service Address</h2>
        <p style={s.hint}>Your primary address for pet care visits — used to calculate travel fees.</p>
        <label style={s.label}>Address
          <input
            ref={addrInputRef}
            style={s.input}
            type='text'
            value={profile.address}
            onChange={e => update('address', e.target.value)}
            placeholder='123 Main St, Dallas, TX 75201'
          />
        </label>
        {!mapsLoaded && <p style={s.hint}>Loading address autocomplete…</p>}
      </section>

      {/* Preferred Vet */}
      <section style={s.section}>
        <h2 style={s.sectionHead}>Preferred Veterinarian</h2>
        <p style={s.hint}>Optional — we&apos;ll contact your vet if there&apos;s a medical concern during a visit.</p>
        <div style={s.grid}>
          {[
            { field: 'preferred_vet_name',    label: 'Vet Name',    placeholder: 'Dr. Smith' },
            { field: 'preferred_vet_clinic',  label: 'Clinic Name', placeholder: 'Dallas Animal Clinic' },
            { field: 'preferred_vet_phone',   label: 'Phone',       placeholder: '(214) 555-0100', type: 'tel' },
            { field: 'preferred_vet_address', label: 'Address',     placeholder: '456 Oak Ave, Dallas, TX 75202' },
          ].map(({ field, label, placeholder, type }) => (
            <label key={field} style={s.label}>{label}
              <input style={s.input} type={type || 'text'}
                value={profile[field]}
                onChange={e => update(field, e.target.value)}
                placeholder={placeholder}
              />
            </label>
          ))}
        </div>
      </section>

      {saveErr && <p style={s.errMsg}>{saveErr}</p>}
      {saved   && <p style={s.okMsg}>Saved!</p>}
      <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>

      {/* Payment Methods — Phase 3 */}
      <section style={{ ...s.section, marginTop: '2rem', borderBottom: 'none' }}>
        <h2 style={s.sectionHead}>Payment Methods</h2>
        <p style={s.hint}>Securely save a credit card or PayPal account for faster checkout.</p>
        <div style={s.paymentPlaceholder}>
          <span style={s.paymentIcon}>💳</span>
          <p style={s.paymentMsg}>
            Payment method management will be available once online payments are activated.
            You will be notified when this feature is ready.
          </p>
        </div>
      </section>
    </div>
  );
}

AccountSettings.propTypes = {};

const s = {
  wrap:        { paddingTop: '0.5rem' },
  section:     { marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #dde8f4' },
  sectionHead: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1.05rem', marginBottom: '0.4rem' },
  hint:        { fontFamily: FONTS.body, fontSize: '0.85rem', color: '#777', marginBottom: '0.75rem' },
  label: {
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
    fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black, marginBottom: '0.5rem',
  },
  input: {
    padding: '0.55rem 0.75rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '0.95rem',
    outline: 'none', fontFamily: FONTS.body,
  },
  select: {
    padding: '0.55rem 0.75rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '0.95rem',
    outline: 'none', fontFamily: FONTS.body, background: COLORS.white,
    color: COLORS.black, cursor: 'pointer',
  },
  grid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem' },
  errMsg: { fontFamily: FONTS.body, color: COLORS.red, marginBottom: '0.75rem' },
  okMsg:  { fontFamily: FONTS.body, color: '#2a7a3b', marginBottom: '0.75rem' },
  msg:    { fontFamily: FONTS.body, color: COLORS.lightBlue, padding: '2rem', textAlign: 'center' },
  paymentPlaceholder: {
    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
    background: '#f8fbff', border: '1px dashed #c2d8ee', borderRadius: '8px',
    padding: '1rem 1.25rem', marginTop: '0.5rem',
  },
  paymentIcon: { fontSize: '1.8rem', flexShrink: 0 },
  paymentMsg:  { fontFamily: FONTS.body, fontSize: '0.875rem', color: '#777', margin: 0, lineHeight: 1.5 },
  saveBtn: {
    padding: '0.65rem 2rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer',
    fontFamily: FONTS.body,
  },
};
