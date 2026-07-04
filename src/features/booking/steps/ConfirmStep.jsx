import { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../../utils/supabase.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../../constants.jsx';
import { getZoneForPoint } from '../../serviceArea/serviceAreaData.js';

function countChecked(slots) {
  return Object.values(slots || {}).reduce(
    (sum, day) => sum + Object.values(day || {}).filter(Boolean).length, 0
  );
}

function countDays(slots) {
  return Object.keys(slots || {}).filter(date =>
    Object.values(slots[date] || {}).some(Boolean)
  ).length;
}

async function lookupTravelFee(address) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results.length)
    throw new Error('Address not found. Please check the address and try again.');
  const { lat, lng } = data.results[0].geometry.location;
  const zone = getZoneForPoint({ lat, lng });
  if (!zone)
    throw new Error('Address is outside our service area (over 100 miles). Please contact us directly.');
  return { zoneLabel: zone.label, travelFee: zone.fee, feeDisplay: zone.feeDisplay };
}

export default function ConfirmStep({ booking, onSubmitSuccess }) {
  const { form, update, back } = booking;
  const { user } = useAuth();

  const [addrInput, setAddrInput]       = useState(form.address || '');
  const [pricing, setPricing]           = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError]     = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState(null);
  const [usingsSaved, setUsingSaved]    = useState(false);
  const [invoiceOpen, setInvoiceOpen]   = useState(false);
  const [allServices, setAllServices]   = useState([]);

  useEffect(() => {
    supabase.from('services').select('id, name, base_price').then(({ data }) => {
      if (data) setAllServices(data);
    });
  }, []);

  function getNumDays() {
    const dates = new Set();
    Object.entries(form.serviceSlots || {}).forEach(([date, day]) => {
      if (Object.values(day || {}).some(Boolean)) dates.add(date);
    });
    Object.values(form.addonSlots || {}).forEach(addonSlots => {
      Object.entries(addonSlots || {}).forEach(([date, day]) => {
        if (Object.values(day || {}).some(Boolean)) dates.add(date);
      });
    });
    if (dates.size === 0 && form.bookingDate) {
      const start = new Date(form.bookingDate);
      const end   = new Date(form.bookingEndDate || form.bookingDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1))
        dates.add(d.toISOString().split('T')[0]);
    }
    return Math.max(dates.size, 1);
  }

  function getUnitPrice(id) {
    const svc = allServices.find(s => s.id === id);
    return svc ? Number(svc.base_price || 0) : 0;
  }

  const resolvePrice = useCallback(async () => {
    if (!addrInput.trim()) return;
    setPriceError(null);
    setPriceLoading(true);
    try {
      const result      = await lookupTravelFee(addrInput.trim());
      const numDays     = getNumDays();
      const totalTravel = result.travelFee * numDays;
      setPricing(result);
      const total = (form.basePrice || 0) + (form.addonTotal || 0) + (form.extraTotal || 0) + totalTravel;
      update({ address: addrInput.trim(), zone: result.zoneLabel, travelFee: result.travelFee, totalPrice: total });
    } catch (err) {
      setPriceError(err.message);
      setPricing(null);
    } finally {
      setPriceLoading(false);
    }
  }, [addrInput, form.basePrice, form.addonTotal, form.extraTotal, update]);

  useEffect(() => {
    async function prefill() {
      if (form.address) { resolvePrice(); return; }
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

  useEffect(() => {
    if (usingsSaved && addrInput.trim()) resolvePrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingsSaved]);

  async function handleSubmit() {
    if (!pricing) { setPriceError('Please enter your address to calculate the travel fee.'); return; }
    setSubmitting(true);
    setSubmitError(null);
    const isEditMode = !!form.editBookingId;
    try {
      let petId = form.petId;
      if (form.petIsNew && !isEditMode) {
        const petPayload = {
          customer_id:       user.id,
          name:             form.newPet.name,
          species:          form.newPet.species,
          breed:            form.newPet.breed            || null,
          age_years:        form.newPet.age_years        ? parseFloat(form.newPet.age_years)  : null,
          weight_lbs:       form.newPet.weight_lbs       ? parseFloat(form.newPet.weight_lbs) : null,
          notes:            form.newPet.notes            || null,
          diet:             form.newPet.diet?.length     ? form.newPet.diet             : null,
          walking_schedule: form.newPet.walking_schedule?.length ? form.newPet.walking_schedule : null,
        };
        const { data: newPetData, error: petErr } = await supabase
          .from('pets').insert(petPayload).select('id').single();
        if (petErr) throw new Error(petErr.message);
        petId = newPetData.id;
      }
      const numDays     = getNumDays();
      const totalTravel = (form.travelFee || 0) * numDays;
      const totalPrice  = (form.basePrice || 0) + (form.addonTotal || 0) + (form.extraTotal || 0) + totalTravel;
      const bookingPayload = {
        pet_id:               petId,
        service_id:           form.serviceId,
        booking_date:         form.bookingDate,
        booking_end_date:     form.bookingEndDate || form.bookingDate,
        booking_time:         form.bookingTime || null,
        zone:                 form.zone,
        travel_fee:           totalTravel,
        base_price:           form.basePrice,
        total_price:          totalPrice,
        special_instructions: form.specialInstructions || null,
        addon_service_ids:    [...(form.addonIds || []), ...(form.extraServiceIds || [])],
      };
      if (isEditMode) {
        const { error: bookErr } = await supabase
          .from('bookings').update(bookingPayload).eq('id', form.editBookingId);
        if (bookErr) throw new Error(bookErr.message);
      } else {
        const { data: newBooking, error: bookErr } = await supabase
          .from('bookings').insert({ ...bookingPayload, customer_id: user.id }).select('id').single();
        if (bookErr) throw new Error(bookErr.message);

        // Auto-create invoice for new bookings
        const petLabel = form.petIsNew ? (form.newPet?.name || 'New pet') : (form.petName || '');
        await supabase.from('invoices').insert({
          booking_id:      newBooking.id,
          customer_id:     user.id,
          has_custom_items: form.isQuote,
          status:          'pending_company_review',
          service_name:    form.serviceName || null,
          booking_date:    form.bookingDate || null,
          booking_end_date: form.bookingEndDate || form.bookingDate || null,
          pet_name:        petLabel || null,
          zone:            form.zone ? String(form.zone) : null,
          subtotal:        (form.basePrice || 0) + (form.addonTotal || 0) + (form.extraTotal || 0),
          travel_fee:      totalTravel || 0,
          total_amount:    form.isQuote ? null : totalPrice,
        });
        // Invoice failure is non-fatal — booking was created successfully
      }
      onSubmitSuccess();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived pricing values ─────────────────────────────────────────────────
  const petLabel     = form.petIsNew ? form.newPet.name || 'New pet' : (form.petName || '(selected pet)');
  const numDays      = pricing ? getNumDays() : 0;
  const totalTravel  = (form.travelFee || 0) * numDays;
  const grandTotal   = (form.basePrice || 0) + (form.addonTotal || 0) + (form.extraTotal || 0) + totalTravel;
  const primaryCount = countChecked(form.serviceSlots);
  const primaryUnit  = Number(form.baseUnitPrice || 0);

  const addonLines = (form.addonIds || []).map((id, i) => ({
    name:  (form.addonNames || [])[i] || 'Add-On',
    count: countChecked((form.addonSlots || {})[id]),
    unit:  getUnitPrice(id),
  }));

  const extraLines = (form.extraServiceIds || []).map((id, i) => {
    const d     = (form.extraServiceData || {})[id];
    const count = d?.slots ? countChecked(d.slots) : (d?.date ? 1 : 0);
    return { name: (form.extraServiceNames || [])[i] || 'Service', count, unit: getUnitPrice(id) };
  });

  // lineDetail: returns a JS string from a template literal -- \u inside template IS interpreted
  function lineDetail(count, unit) {
    if (unit <= 0) return `${count}\u00d7 (quote)`;
    return `${count}\u00d7 $${unit.toFixed(2)} = $${(count * unit).toFixed(2)}`;
  }

  return (
    <div>
      <p style={styles.subhead}>Review your booking details.</p>

      <div style={styles.summary}>
        <Row label='Service'    value={form.serviceName || '\u2014'} />
        <Row label='Start Date' value={form.bookingDate  || '\u2014'} />
        {form.bookingEndDate && form.bookingEndDate !== form.bookingDate && (
          <Row label='End Date' value={form.bookingEndDate} />
        )}
        <Row label='Time' value={form.bookingTime || '\u2014'} />
        <Row label='Pet'  value={petLabel} />
        {form.transportOrigin && <Row label='Pickup'   value={form.transportOrigin} />}
        {form.transportDest   && <Row label='Drop-off' value={form.transportDest}   />}
        {(form.addonNames || []).length > 0 && (
          <Row label='Add-Ons' value={(form.addonNames || []).join(', ')} />
        )}
        {(form.extraServiceNames || []).length > 0 && (
          <Row label='Additional Services' value={(form.extraServiceNames || []).join(', ')} />
        )}
      </div>

      <div style={styles.addrSection}>
        {usingsSaved && (
          <p style={styles.savedNote}>
            Using your saved service address{'\u2014'}update below to use a different location.
          </p>
        )}
        <label style={styles.label}>Your service address
          <input style={styles.input} type='text'
            placeholder='123 Main St, Dallas, TX 75201'
            value={addrInput}
            onChange={e => setAddrInput(e.target.value)}
            onBlur={resolvePrice}
          />
        </label>
        {priceLoading && <p style={styles.note}>Calculating travel fee{'\u2026'}</p>}
        {priceError   && <p style={styles.errorMsg}>{priceError}</p>}
      </div>

      {pricing && (
        <div style={styles.pricingBox}>
          {!invoiceOpen ? (
            <>
              <PricingRow
                label={form.serviceName || 'Service'}
                value={form.isQuote ? 'Quote required' : `$${(form.basePrice || 0).toFixed(2)}`} />
              {(form.addonTotal > 0) &&
                <PricingRow label='Add-Ons' value={`+$${(form.addonTotal || 0).toFixed(2)}`} />}
              {(form.extraTotal > 0) &&
                <PricingRow label='Additional Services' value={`+$${(form.extraTotal || 0).toFixed(2)}`} />}
              <PricingRow label='Travel Surcharge'
                value={totalTravel === 0 ? 'None' : `+$${totalTravel.toFixed(2)}`} />
              <div style={styles.divider} />
              <PricingRow label='Total'
                value={form.isQuote ? 'Quote pending' : `$${grandTotal.toFixed(2)}`} bold />
            </>
          ) : (
            <>
              <div style={styles.group}>
                <p style={styles.groupLabel}>{form.serviceName || 'Service'}</p>
                {primaryCount > 0 && (
                  <p style={styles.groupLine}>{form.serviceName}: {lineDetail(primaryCount, primaryUnit)}</p>
                )}
              </div>

              {addonLines.filter(l => l.count > 0).length > 0 && (
                <div style={styles.group}>
                  <p style={styles.groupLabel}>Add-Ons:</p>
                  {addonLines.filter(l => l.count > 0).map((l, i) => (
                    <p key={i} style={styles.groupLine}>{l.name}: {lineDetail(l.count, l.unit)}</p>
                  ))}
                </div>
              )}

              {extraLines.filter(l => l.count > 0).length > 0 && (
                <div style={styles.group}>
                  <p style={styles.groupLabel}>Additional Services:</p>
                  {extraLines.filter(l => l.count > 0).map((l, i) => (
                    <p key={i} style={styles.groupLine}>{l.name}: {lineDetail(l.count, l.unit)}</p>
                  ))}
                </div>
              )}

              {totalTravel > 0 && (
                <div style={styles.group}>
                  <p style={styles.groupLabel}>Surcharges:</p>
                  <p style={styles.groupLine}>
                    Travel Surcharge: {numDays}{'\u00d7'} ${(form.travelFee || 0).toFixed(2)} = ${totalTravel.toFixed(2)}
                  </p>
                </div>
              )}

              <div style={styles.divider} />
              <PricingRow label='Total'
                value={form.isQuote ? 'Quote pending' : `$${grandTotal.toFixed(2)}`} bold />
            </>
          )}

          <button style={styles.invoiceToggle} onClick={() => setInvoiceOpen(v => !v)}>
            {invoiceOpen ? '\u25b2 Hide Itemized Invoice' : '\u25bc Itemized Invoice'}
          </button>
        </div>
      )}

      <label style={styles.label}>Special Instructions (optional)
        <textarea style={styles.textarea} rows={3}
          value={form.specialInstructions}
          onChange={e => update({ specialInstructions: e.target.value })}
          placeholder={'Alarm codes, pet quirks, medication schedules\u2026'} />
      </label>

      {submitError && <p style={styles.errorMsg}>{submitError}</p>}

      <div style={styles.footer}>
        <button style={styles.secondaryBtn} onClick={back} disabled={submitting}>Back</button>
        <button style={styles.primaryBtn} onClick={handleSubmit} disabled={submitting || !pricing}>
          {submitting ? 'Submitting\u2026' : (form.editBookingId ? 'Update Booking' : 'Confirm Booking')}
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

function PricingRow({ label, value, bold }) {
  return (
    <div style={styles.pricingRow}>
      <span style={styles.pricingLabel}>{label}</span>
      <span style={{ ...styles.pricingValue, ...(bold ? styles.pricingBold : {}) }}>{value}</span>
    </div>
  );
}

Row.propTypes        = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired, bold: PropTypes.bool };
PricingRow.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired, bold: PropTypes.bool };

ConfirmStep.propTypes = {
  booking: PropTypes.shape({
    form:   PropTypes.object.isRequired,
    update: PropTypes.func.isRequired,
    back:   PropTypes.func.isRequired,
  }).isRequired,
  onSubmitSuccess: PropTypes.func.isRequired,
};

const styles = {
  subhead:     { fontFamily: FONTS.body, color: COLORS.black, marginBottom: '1.25rem' },
  summary:     { background: '#f8fbff', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' },
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
  divider: { borderTop: `1px solid ${COLORS.lightBlue}`, margin: '0.5rem 0' },
  row:       { display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' },
  rowLabel:  { fontFamily: FONTS.body, color: '#555', fontSize: '0.9rem' },
  rowValue:  { fontFamily: FONTS.body, color: COLORS.black, fontSize: '0.9rem' },
  rowBold:   { fontWeight: '700', color: COLORS.blue, fontSize: '1rem' },
  pricingRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.3rem 0' },
  pricingLabel: { fontFamily: FONTS.body, color: COLORS.black, fontSize: '0.95rem' },
  pricingValue: { fontFamily: FONTS.body, color: COLORS.black, fontSize: '0.95rem' },
  pricingBold:  { fontWeight: '700', color: COLORS.blue, fontSize: '1.1rem' },
  group:      { marginBottom: '0.6rem' },
  groupLabel: { fontFamily: FONTS.body, fontWeight: '600', color: COLORS.black, fontSize: '0.9rem', margin: '0 0 0.2rem' },
  groupLine:  { fontFamily: FONTS.body, color: '#555', fontSize: '0.875rem', margin: '0.1rem 0 0.1rem 1rem' },
  invoiceToggle: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: COLORS.blue, fontFamily: FONTS.body, fontSize: '0.85rem',
    padding: '0.5rem 0 0', display: 'block', textDecoration: 'underline',
  },
  footer: { display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem' },
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
