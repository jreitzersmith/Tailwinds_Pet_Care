import { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../../utils/supabase.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../../constants.jsx';
import { getZoneForPoint } from '../../serviceArea/serviceAreaData.js';

// FR#13: Resolve address → zone → travel fee.
// Geocodes the address via Google Maps API, then uses the same polygon-based
// zone lookup as the Service Area map (getZoneForPoint) for consistency.
async function lookupTravelFee(address) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res  = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.results.length) {
    throw new Error('Address not found. Please check the address and try again.');
  }

  const { lat, lng } = data.results[0].geometry.location;
  const zone = getZoneForPoint({ lat, lng });

  if (!zone) {
    throw new Error('Address is outside our service area (over 100 miles). Please contact us directly.');
  }

  return {
    zoneLabel: zone.label,
    travelFee: zone.fee,
    feeDisplay: zone.feeDisplay,
  };
}

export default function ConfirmStep({ booking, onSubmitSuccess }) {
  const { form, update, back } = booking;
  const { user } = useAuth();

  const [addrInput, setAddrInput]   = useState(form.address || '');
  const [pricing, setPricing]       = useState(null);  // { zone, travelFee, miles }
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [usingsSaved, setUsingSaved] = useState(false); // true when address came from profile

  // Auto-lookup whenever the user finishes typing the address (on blur)
  const resolvePrice = useCallback(async () => {
    if (!addrInput.trim()) return;
    setPriceError(null);
    setPriceLoading(true);
    try {
      const result = await lookupTravelFee(addrInput.trim());
      setPricing(result);
      const total = form.basePrice + result.travelFee;
      update({ address: addrInput.trim(), zone: result.zoneLabel, travelFee: result.travelFee, totalPrice: total });
    } catch (err) {
      setPriceError(err.message);
      setPricing(null);
    } finally {
      setPriceLoading(false);
    }
  }, [addrInput, form.basePrice, update]);

  // Pre-fill address from saved customer profile, then auto-resolve price
  useEffect(() => {
    async function prefill() {
      if (form.address) {
        resolvePrice();
        return;
      }
      const { data } = await supabase
        .from('customers').select('address').eq('id', user.id).single();
      if (data?.address) {
        setAddrInput(data.address);
        update({ address: data.address });
        setUsingSaved(true);
      }
    }
    prefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-resolve price after prefill sets addrInput
  useEffect(() => {
    if (usingsSaved && addrInput.trim()) resolvePrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingsSaved]);

  async function handleSubmit() {
    if (!pricing) { setPriceError('Please enter your address to calculate the travel fee.'); return; }
    setSubmitting(true);
    setSubmitError(null);

    try {
      // If pet is new, insert it first
      let petId = form.petId;
      if (form.petIsNew) {
        const petPayload = {
          customer_id: user.id,
          name:        form.newPet.name,
          species:     form.newPet.species,
          breed:       form.newPet.breed   || null,
          age_years:   form.newPet.age_years  ? parseFloat(form.newPet.age_years)  : null,
          weight_lbs:  form.newPet.weight_lbs ? parseFloat(form.newPet.weight_lbs) : null,
          notes:       form.newPet.notes   || null,
        };
        const { data: newPetData, error: petErr } = await supabase
          .from('pets').insert(petPayload).select('id').single();
        if (petErr) throw new Error(petErr.message);
        petId = newPetData.id;
      }

      const bookingPayload = {
        customer_id:          user.id,
        pet_id:               petId,
        service_id:           form.serviceId,
        booking_date:         form.bookingDate,
        booking_time:         form.bookingTime || null,
        zone:                 form.zone,
        travel_fee:           form.travelFee,
        base_price:           form.basePrice,
        total_price:          form.totalPrice,
        special_instructions: form.specialInstructions || null,
      };
      const { error: bookErr } = await supabase.from('bookings').insert(bookingPayload);
      if (bookErr) throw new Error(bookErr.message);
      onSubmitSuccess();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const petLabel = form.petIsNew ? form.newPet.name || 'New pet' : '(selected pet)';

  return (
    <div>
      <p style={styles.subhead}>Review your booking details.</p>

      <div style={styles.summary}>
        <Row label='Service'  value={form.serviceName} />
        <Row label='Date'     value={form.bookingDate} />
        <Row label='Time'     value={form.bookingTime || '—'} />
        <Row label='Pet'      value={petLabel} />
      </div>

      <div style={styles.addrSection}>
        {usingsSaved && (
          <p style={styles.savedNote}>Using your saved service address — update below to use a different location.</p>
        )}
        <label style={styles.label}>Your service address
          <input style={styles.input} type='text'
            placeholder='123 Main St, Dallas, TX 75201'
            value={addrInput}
            onChange={e => setAddrInput(e.target.value)}
            onBlur={resolvePrice}
          />
        </label>
        {priceLoading && <p style={styles.note}>Calculating travel fee…</p>}
        {priceError   && <p style={styles.errorMsg}>{priceError}</p>}
      </div>

      {pricing && (
        <div style={styles.pricingBox}>
          <Row label={pricing.zoneLabel} value={pricing.feeDisplay === 'None' ? 'No travel fee' : pricing.feeDisplay} />
          <Row label='Base Price'  value={`$${form.basePrice.toFixed(2)}`} />
          <Row label='Travel Fee'  value={pricing.travelFee === 0 ? 'None' : `+$${pricing.travelFee.toFixed(2)}`} />
          <div style={styles.divider} />
          <Row label='Total' value={`$${(form.basePrice + pricing.travelFee).toFixed(2)}`} bold />
        </div>
      )}

      <label style={styles.label}>Special Instructions (optional)
        <textarea style={styles.textarea} rows={3}
          value={form.specialInstructions}
          onChange={e => update({ specialInstructions: e.target.value })}
          placeholder='Alarm codes, pet quirks, medication schedules…' />
      </label>

      {submitError && <p style={styles.errorMsg}>{submitError}</p>}

      <div style={styles.footer}>
        <button style={styles.secondaryBtn} onClick={back} disabled={submitting}>Back</button>
        <button style={styles.primaryBtn} onClick={handleSubmit} disabled={submitting || !pricing}>
          {submitting ? 'Submitting…' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={{ ...styles.rowValue, ...(bold ? styles.rowBold : {}) }}>{value}</span>
    </div>
  );
}

Row.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  bold:  PropTypes.bool,
};

ConfirmStep.propTypes = {
  booking: PropTypes.shape({
    form:   PropTypes.object.isRequired,
    update: PropTypes.func.isRequired,
    back:   PropTypes.func.isRequired,
  }).isRequired,
  onSubmitSuccess: PropTypes.func.isRequired,
};

const styles = {
  subhead:    { fontFamily: FONTS.body, color: COLORS.black, marginBottom: '1.25rem' },
  summary:    { background: '#f8fbff', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' },
  addrSection: { marginBottom: '1rem' },
  label: {
    display: 'flex', flexDirection: 'column', gap: '0.35rem',
    fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.black, marginBottom: '0.75rem',
  },
  input: {
    padding: '0.6rem 0.8rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '1rem', outline: 'none',
  },
  textarea: {
    padding: '0.6rem 0.8rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '1rem', outline: 'none',
    resize: 'vertical', fontFamily: FONTS.body,
  },
  savedNote:  { fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.lightBlue, marginBottom: '0.4rem', fontStyle: 'italic' },
  note:       { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue },
  errorMsg:   { fontFamily: FONTS.body, color: COLORS.red, fontSize: '0.9rem', marginBottom: '0.75rem' },
  pricingBox: {
    background: '#f8fbff', border: `1px solid ${COLORS.lightBlue}`,
    borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem',
  },
  divider:    { borderTop: `1px solid ${COLORS.lightBlue}`, margin: '0.5rem 0' },
  row:        { display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' },
  rowLabel:   { fontFamily: FONTS.body, color: '#555', fontSize: '0.9rem' },
  rowValue:   { fontFamily: FONTS.body, color: COLORS.black, fontSize: '0.9rem' },
  rowBold:    { fontWeight: '700', color: COLORS.blue, fontSize: '1rem' },
  footer:     { display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem' },
  primaryBtn: {
    padding: '0.75rem 2rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', fontFamily: FONTS.body,
  },
  secondaryBtn: {
    padding: '0.75rem 1.5rem', background: COLORS.white, color: COLORS.blue,
    border: `2px solid ${COLORS.blue}`, borderRadius: '8px', fontSize: '1rem',
    cursor: 'pointer', fontFamily: FONTS.body,
  },
};
