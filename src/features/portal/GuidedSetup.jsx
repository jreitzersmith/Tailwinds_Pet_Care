import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import supabase from '../../utils/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../constants.jsx';
import useLoadGoogleMaps from '../serviceArea/useLoadGoogleMaps.js';

const SPECIES = ['Dog', 'Cat', 'Bird', 'Reptile', 'Fish', 'Small Mammal', 'Other'];
const DFW_BOUNDS = { north: 33.35, south: 32.35, east: -96.45, west: -97.65 };
const TOTAL_STEPS = 3;

export default function GuidedSetup({ onComplete }) {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { isLoaded: mapsLoaded } = useLoadGoogleMaps(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  );

  const [step, setStep]       = useState(0);
  const [address, setAddress] = useState('');
  const [pet, setPet]         = useState({ name: '', species: 'Dog', breed: '', weight_lbs: '' });
  const [petErr, setPetErr]   = useState('');
  const [busy, setBusy]       = useState(false);

  const addrRef = useRef(null);
  const acRef   = useRef(null);

  // Init Places Autocomplete when on step 0 and Maps is ready
  useEffect(() => {
    if (step !== 0 || !mapsLoaded || !addrRef.current || acRef.current) return;
    (async () => {
      const { Autocomplete } = await window.google.maps.importLibrary('places');
      const ac = new Autocomplete(addrRef.current, {
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
        setAddress(place.formatted_address || addrRef.current.value);
      });
      acRef.current = ac;
    })();
  }, [step, mapsLoaded]);

  async function markComplete() {
    await supabase.from('customers').update({ setup_completed: true }).eq('id', user.id);
    onComplete();
  }

  async function handleAddressNext() {
    if (address.trim()) {
      await supabase.from('customers').update({ address: address.trim() }).eq('id', user.id);
    }
    setStep(1);
  }

  async function handlePetNext() {
    if (!pet.name.trim()) { setPetErr('Please enter your pet\'s name.'); return; }
    setBusy(true);
    const { error } = await supabase.from('pets').insert({
      customer_id: user.id,
      name:        pet.name.trim(),
      species:     pet.species,
      breed:       pet.breed || null,
      weight_lbs:  pet.weight_lbs ? parseFloat(pet.weight_lbs) : null,
    });
    setBusy(false);
    if (error) { setPetErr(error.message); return; }
    setStep(2);
  }

  async function handleTutorial() {
    await markComplete();
    navigate('/book?tutorial=true');
  }

  async function handleOnMyOwn() {
    await markComplete();
    navigate('/book');
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>

        {/* Step progress dots */}
        <div style={s.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={{ ...s.dot, ...(i <= step ? s.dotActive : {}) }} />
          ))}
        </div>

        {/* Step 0: Service address */}
        {step === 0 && (
          <div>
            <h2 style={s.heading}>Welcome to Tailwinds!</h2>
            <p style={s.sub}>Let&apos;s set up your account. What&apos;s your primary service address?</p>
            <label style={s.label}>Service Address
              <input ref={addrRef} style={s.input} type='text'
                value={address} onChange={e => setAddress(e.target.value)}
                placeholder='123 Main St, Dallas, TX 75201'
              />
            </label>
            <div style={s.btnRow}>
              <button style={s.primaryBtn} onClick={handleAddressNext}>Continue</button>
              <button style={s.skipBtn} onClick={() => setStep(1)}>Skip for now</button>
            </div>
          </div>
        )}

        {/* Step 1: First pet */}
        {step === 1 && (
          <div>
            <h2 style={s.heading}>Add Your First Pet</h2>
            <p style={s.sub}>Tell us who we&apos;ll be caring for.</p>
            {petErr && <p style={s.errMsg}>{petErr}</p>}
            <label style={s.label}>Pet Name *
              <input style={s.input} type='text' value={pet.name}
                onChange={e => { setPet(p => ({ ...p, name: e.target.value })); setPetErr(''); }}
                placeholder='Buddy'
              />
            </label>
            <div style={s.row2} className='guided-row2'>
              <label style={s.label}>Species
                <select style={s.input} value={pet.species}
                  onChange={e => setPet(p => ({ ...p, species: e.target.value }))}>
                  {SPECIES.map(sp => <option key={sp}>{sp}</option>)}
                </select>
              </label>
              <label style={s.label}>Breed
                <input style={s.input} type='text' value={pet.breed}
                  onChange={e => setPet(p => ({ ...p, breed: e.target.value }))}
                  placeholder='Golden Retriever'
                />
              </label>
            </div>
            <label style={s.label}>Weight (lbs)
              <input style={s.input} type='number' min='0' value={pet.weight_lbs}
                onChange={e => setPet(p => ({ ...p, weight_lbs: e.target.value }))} />
            </label>
            <div style={s.btnRow}>
              <button style={s.primaryBtn} onClick={handlePetNext} disabled={busy}>
                {busy ? 'Saving…' : 'Save & Continue'}
              </button>
              <button style={s.skipBtn} onClick={() => setStep(2)}>Skip for now</button>
            </div>
          </div>
        )}

        {/* Step 2: Booking choice */}
        {step === 2 && (
          <div>
            <h2 style={s.heading}>Ready to Book?</h2>
            <p style={s.sub}>How would you like to explore the booking process?</p>
            <div style={s.choiceRow}>
              <button style={s.choiceCard} onClick={handleTutorial}>
                <span style={s.choiceIcon}>🗺️</span>
                <span style={s.choiceLabel}>Walk Me Through It</span>
                <span style={s.choiceDesc}>Step-by-step tutorial guides you through your first booking.</span>
              </button>
              <button style={s.choiceCard} onClick={handleOnMyOwn}>
                <span style={s.choiceIcon}>✈️</span>
                <span style={s.choiceLabel}>On My Own</span>
                <span style={s.choiceDesc}>Skip the tutorial and go straight to booking.</span>
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button style={s.skipBtn} onClick={markComplete}>Maybe later</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

GuidedSetup.propTypes = {
  onComplete: PropTypes.func.isRequired,
};

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
  },
  modal: {
    background: COLORS.white, borderRadius: '16px', padding: '2rem',
    maxWidth: '480px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  dots:     { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center' },
  dot:      { width: '10px', height: '10px', borderRadius: '50%', background: '#dde8f4' },
  dotActive: { background: COLORS.blue },
  heading:  { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1.3rem', marginBottom: '0.5rem' },
  sub:      { fontFamily: FONTS.body, color: '#555', fontSize: '0.95rem', marginBottom: '1.25rem' },
  label: {
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
    fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black, marginBottom: '0.75rem',
    minWidth: 0,
  },
  input: {
    padding: '0.55rem 0.75rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '0.95rem',
    outline: 'none', fontFamily: FONTS.body, width: '100%', minWidth: 0, boxSizing: 'border-box',
  },
  // minWidth: 0 above overrides the browser default (min-width: auto) that grid items get —
  // without it, a <select>/<input> refuses to shrink below its content's intrinsic width and
  // overflows a narrow grid column on phone screens instead of scrolling/wrapping inside it.
  row2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' },
  btnRow:  { display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' },
  primaryBtn: {
    padding: '0.65rem 1.75rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', fontFamily: FONTS.body,
  },
  skipBtn: {
    background: 'none', border: 'none', color: COLORS.lightBlue,
    fontFamily: FONTS.body, fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 0',
  },
  errMsg: { fontFamily: FONTS.body, color: COLORS.red, fontSize: '0.9rem', marginBottom: '0.5rem' },
  choiceRow: { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  choiceCard: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
    padding: '1.25rem 0.75rem', border: `2px solid ${COLORS.lightBlue}`, borderRadius: '12px',
    background: COLORS.white, cursor: 'pointer', textAlign: 'center',
    fontFamily: FONTS.body, fontWeight: 'normal',
  },
  choiceIcon:  { fontSize: '1.75rem' },
  choiceLabel: { fontFamily: FONTS.header, fontSize: '0.9rem', color: COLORS.blue, fontWeight: '600' },
  choiceDesc:  { fontSize: '0.8rem', color: '#666', lineHeight: '1.4' },
};
