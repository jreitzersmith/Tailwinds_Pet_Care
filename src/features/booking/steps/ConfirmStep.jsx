import { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../../utils/supabase.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../../constants.jsx';
import { getZoneForPoint } from '../../serviceArea/serviceAreaData.js';
import {
  buildVisitRows, summarizeVisits, groupLineItems, buildInvoiceSnapshot, fmtMoney,
} from '../visitModel.js';

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
  const [usingSaved, setUsingSaved]     = useState(false);
  const [invoiceOpen, setInvoiceOpen]   = useState(false);
  const [allServices, setAllServices]   = useState([]);

  useEffect(() => {
    supabase.from('services').select('id, name, base_price, price_per_pet').then(({ data }) => {
      if (data) setAllServices(data);
    });
  }, []);

  // ── Single source of truth: derive visits + totals from the form ──
  const servicesById = Object.fromEntries(allServices.map(s => [s.id, s]));
  const visitRows    = buildVisitRows(form, servicesById);
  const lineItems    = groupLineItems(visitRows);
  const perDayTravel = Number(form.travelFee || 0);
  const totals       = summarizeVisits(visitRows, perDayTravel);

  const resolvePrice = useCallback(async () => {
    if (!addrInput.trim()) return;
    setPriceError(null);
    setPriceLoading(true);
    try {
      const result = await lookupTravelFee(addrInput.trim());
      setPricing(result);
      update({ address: addrInput.trim(), zone: result.zoneLabel, travelFee: result.travelFee });
    } catch (err) {
      setPriceError(err.message);
      setPricing(null);
    } finally {
      setPriceLoading(false);
    }
  }, [addrInput, update]);

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
    if (usingSaved && addrInput.trim()) resolvePrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingSaved]);

  async function handleSubmit() {
    if (!pricing) { setPriceError('Please enter your address to calculate the travel fee.'); return; }
    setSubmitting(true);
    setSubmitError(null);
    const isEditMode = !!form.editBookingId;
    try {
      // 1. Create the new inline pet, if any.
      const petIds   = [...(form.petIds   || [])];
      const petNames = [...(form.petNames || [])];
      if (form.petIsNew && (form.newPet?.name || '').trim() && !isEditMode) {
        const petPayload = {
          customer_id:      user.id,
          name:             form.newPet.name,
          species:          form.newPet.species,
          breed:            form.newPet.breed            || null,
          age_years:        form.newPet.age_years        ? parseFloat(form.newPet.age_years)  : null,
          weight_lbs:       form.newPet.weight_lbs       ? parseFloat(form.newPet.weight_lbs) : null,
          notes:            form.newPet.notes            || null,
          diet:             form.newPet.diet?.length     ? form.newPet.diet             : null,
          walking_schedule: form.newPet.walking_schedule?.length ? form.newPet.walking_schedule : null,
          medications:      form.newPet.medications?.length ? form.newPet.medications : [],
        };
        const { data: newPetData, error: petErr } = await supabase
          .from('pets').insert(petPayload).select('id').single();
        if (petErr) throw new Error(petErr.message);
        petIds.push(newPetData.id);
        petNames.push(form.newPet.name);
      }
      if (petIds.length === 0) throw new Error('Please select at least one pet.');

      // 2. Derive visits + invoice snapshot from the form (single source of truth).
      const rows = buildVisitRows(form, servicesById);
      if (rows.length === 0) throw new Error('Please select at least one visit.');
      const snap = buildInvoiceSnapshot(rows, perDayTravel);
      const totalPrice = snap.total_amount != null ? snap.total_amount : snap.subtotal;

      const bookingCore = {
        pet_id:               petIds[0],
        service_id:           form.serviceId,
        booking_date:         form.bookingDate,
        booking_end_date:     form.bookingEndDate || form.bookingDate,
        booking_time:         form.bookingTime || null,
        zone:                 form.zone,
        travel_fee:           snap.travel_fee,
        base_price:           snap.subtotal,
        total_price:          totalPrice,
        special_instructions: form.specialInstructions || null,
        addon_service_ids:    [...(form.addonIds || []), ...(form.extraServiceIds || [])],
      };

      let bookingId = form.editBookingId;
      if (isEditMode) {
        const { error: bookErr } = await supabase.from('bookings').update({
          ...bookingCore,
          status:         'pending_company_review',  // edited → needs re-review
          admin_modified: false,
          change_note:    null,
        }).eq('id', bookingId);
        if (bookErr) throw new Error(bookErr.message);

        // Replace child rows.
        await supabase.from('booking_visits').delete().eq('booking_id', bookingId);
        await supabase.from('booking_pets').delete().eq('booking_id', bookingId);
      } else {
        const { data: newBooking, error: bookErr } = await supabase
          .from('bookings').insert({ ...bookingCore, customer_id: user.id, status: 'pending_company_review' })
          .select('id').single();
        if (bookErr) throw new Error(bookErr.message);
        bookingId = newBooking.id;
      }

      // 3. Persist pets + visits.
      const petRows = petIds.map((id, i) => ({
        booking_id: bookingId, pet_id: id, pet_name: petNames[i] || null,
      }));
      const { error: bpErr } = await supabase.from('booking_pets').insert(petRows);
      if (bpErr) throw new Error(bpErr.message);

      const visitRowsToInsert = rows.map(r => ({ ...r, booking_id: bookingId }));
      const { error: bvErr } = await supabase.from('booking_visits').insert(visitRowsToInsert);
      if (bvErr) throw new Error(bvErr.message);

      // 4. Sync the invoice snapshot.
      const invoiceFields = {
        service_name:     form.serviceName || null,
        booking_date:     form.bookingDate || null,
        booking_end_date: form.bookingEndDate || form.bookingDate || null,
        pet_name:         petNames.join(', ') || null,
        zone:             form.zone ? String(form.zone) : null,
        line_items:       snap.line_items,
        subtotal:         snap.subtotal,
        travel_fee:       snap.travel_fee,
        total_amount:     snap.total_amount,
        has_custom_items: false,
        updated_at:       new Date().toISOString(),
      };
      if (isEditMode) {
        await supabase.from('invoices')
          .update({ ...invoiceFields, status: 'draft' })
          .eq('booking_id', bookingId);
      } else {
        await supabase.from('invoices').insert({
          booking_id: bookingId, customer_id: user.id, status: 'draft', ...invoiceFields,
        });
        // Notify Tailwinds admin of the new booking (best-effort).
        supabase.functions.invoke('send-booking-email', { body: { bookingId } }).catch(() => {});
      }

      onSubmitSuccess();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const petLabel = (form.petNames || []).length
    ? form.petNames.join(', ')
    : (form.petIsNew ? (form.newPet?.name || 'New pet') : '(selected pet)');

  return (
    <div>
      <p style={styles.subhead}>Review your booking details.</p>

      <div style={styles.summary}>
        <Row label='Service'    value={form.serviceName || '—'} />
        <Row label='Start Date' value={form.bookingDate  || '—'} />
        {form.bookingEndDate && form.bookingEndDate !== form.bookingDate && (
          <Row label='End Date' value={form.bookingEndDate} />
        )}
        <Row label={ (form.petNames || []).length > 1 ? 'Pets' : 'Pet' } value={petLabel} />
        {form.transportOrigin && <Row label='Pickup'   value={form.transportOrigin} />}
        {form.transportDest   && <Row label='Drop-off' value={form.transportDest}   />}
        {(form.addonNames || []).length > 0 && (
          <Row label='Add-Ons' value={(form.addonNames || []).join(', ')} />
        )}
        {(form.extraServiceNames || []).length > 0 && (
          <Row label='Additional Services' value={(form.extraServiceNames || []).join(', ')} />
        )}
        <Row label='Total Visits' value={String(visitRows.length)} />
      </div>

      <div style={styles.addrSection}>
        {usingSaved && (
          <p style={styles.savedNote}>
            Using your saved service address{'—'}update below to use a different location.
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
        {priceLoading && <p style={styles.note}>Calculating travel fee{'…'}</p>}
        {priceError   && <p style={styles.errorMsg}>{priceError}</p>}
      </div>

      {pricing && (
        <div style={styles.pricingBox}>
          {!invoiceOpen ? (
            <>
              <PricingRow label='Subtotal'
                value={totals.hasQuote ? 'Quote required' : fmtMoney(totals.subtotal)} />
              <PricingRow label='Travel Surcharge'
                value={totals.travelFee === 0 ? 'None' : '+' + fmtMoney(totals.travelFee)} />
              <div style={styles.divider} />
              <PricingRow label='Total'
                value={totals.hasQuote ? 'Quote pending' : fmtMoney(totals.total)} bold />
            </>
          ) : (
            <>
              {lineItems.map((li, i) => (
                <div key={i} style={styles.group}>
                  <p style={styles.groupLine}>
                    {li.description}: {li.qty}{'×'} {li.is_quote ? '(quote)' : fmtMoney(li.unit_price)}
                    {!li.is_quote && ` = ${fmtMoney(li.total)}`}
                  </p>
                </div>
              ))}
              {totals.travelFee > 0 && (
                <div style={styles.group}>
                  <p style={styles.groupLine}>
                    Travel Surcharge: {totals.distinctDates}{'×'} {fmtMoney(perDayTravel)} = {fmtMoney(totals.travelFee)}
                  </p>
                </div>
              )}
              <div style={styles.divider} />
              <PricingRow label='Total'
                value={totals.hasQuote ? 'Quote pending' : fmtMoney(totals.total)} bold />
            </>
          )}

          <button style={styles.invoiceToggle} onClick={() => setInvoiceOpen(v => !v)}>
            {invoiceOpen ? '▲ Hide Itemized Invoice' : '▼ Itemized Invoice'}
          </button>
        </div>
      )}

      <label style={styles.label}>Special Instructions (optional)
        <textarea style={styles.textarea} rows={3}
          value={form.specialInstructions}
          onChange={e => update({ specialInstructions: e.target.value })}
          placeholder={'Alarm codes, pet quirks, medication schedules…'} />
      </label>

      {submitError && <p style={styles.errorMsg}>{submitError}</p>}

      <div style={styles.footer}>
        <button style={styles.secondaryBtn} onClick={back} disabled={submitting}>Back</button>
        <button style={styles.primaryBtn} onClick={handleSubmit} disabled={submitting || !pricing}>
          {submitting ? 'Submitting…' : (form.editBookingId ? 'Update Booking' : 'Confirm Booking')}
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
    border: '1px solid ' + COLORS.lightBlue, fontSize: '1rem', outline: 'none',
  },
  textarea: {
    padding: '0.6rem 0.8rem', borderRadius: '6px',
    border: '1px solid ' + COLORS.lightBlue, fontSize: '1rem', outline: 'none',
    resize: 'vertical', fontFamily: FONTS.body,
  },
  savedNote:  { fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.lightBlue, marginBottom: '0.4rem', fontStyle: 'italic' },
  note:       { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue },
  errorMsg:   { fontFamily: FONTS.body, color: COLORS.red, fontSize: '0.9rem', marginBottom: '0.75rem' },
  pricingBox: {
    background: '#f8fbff', border: '1px solid ' + COLORS.lightBlue,
    borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem',
  },
  divider: { borderTop: '1px solid ' + COLORS.lightBlue, margin: '0.5rem 0' },
  row:       { display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' },
  rowLabel:  { fontFamily: FONTS.body, color: '#555', fontSize: '0.9rem' },
  rowValue:  { fontFamily: FONTS.body, color: COLORS.black, fontSize: '0.9rem' },
  rowBold:   { fontWeight: '700', color: COLORS.blue, fontSize: '1rem' },
  pricingRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.3rem 0' },
  pricingLabel: { fontFamily: FONTS.body, color: COLORS.black, fontSize: '0.95rem' },
  pricingValue: { fontFamily: FONTS.body, color: COLORS.black, fontSize: '0.95rem' },
  pricingBold:  { fontWeight: '700', color: COLORS.blue, fontSize: '1.1rem' },
  group:      { marginBottom: '0.3rem' },
  groupLine:  { fontFamily: FONTS.body, color: '#555', fontSize: '0.875rem', margin: '0.1rem 0' },
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
    border: '2px solid ' + COLORS.blue, borderRadius: '8px', fontSize: '1rem',
    cursor: 'pointer', fontFamily: FONTS.body,
  },
};
