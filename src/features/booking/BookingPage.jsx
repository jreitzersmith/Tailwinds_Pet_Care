import { useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import TutorialOverlay from './TutorialOverlay.jsx';
import { COLORS, FONTS } from '../../constants.jsx';
import useBookingForm, { STEPS } from './useBookingForm.js';
import ServiceStep from './steps/ServiceStep.jsx';
import ScheduleStep from './steps/ScheduleStep.jsx';
import PetStep from './steps/PetStep.jsx';
import ConfirmStep from './steps/ConfirmStep.jsx';

const DEFAULT_SLOT_ROWS = [
  { id: 'morning', label: 'Morning' },
  { id: 'evening', label: 'Evening' },
];

// Fallback: pre-check morning + evening for each date when no persisted
// visit detail is available (legacy bookings).
function buildDefaultSlots(startDate, endDate) {
  if (!startDate) return {};
  const slots = {};
  const curr  = new Date(startDate + 'T00:00:00');
  const last  = new Date((endDate || startDate) + 'T00:00:00');
  while (curr <= last) {
    const d = curr.toISOString().split('T')[0];
    slots[d] = { morning: true, evening: true };
    curr.setDate(curr.getDate() + 1);
  }
  return slots;
}

// Reconstruct the exact slot grids from persisted booking_visits so an
// edit round-trips faithfully (custom shifts preserved).
function reconstructFromVisits(visits) {
  const out = {
    serviceSlots: {}, serviceSlotRows: [],
    addonIds: [], addonNames: [], addonSlots: {}, addonSlotRows: {},
  };
  const primaryRowMap = new Map();
  const addonRowMap   = {};
  (visits || []).forEach(v => {
    if (!v.is_addon) {
      out.serviceSlots[v.visit_date] = { ...(out.serviceSlots[v.visit_date] || {}), [v.shift_id]: true };
      if (!primaryRowMap.has(v.shift_id)) primaryRowMap.set(v.shift_id, v.shift_label || v.shift_id);
    } else {
      if (!out.addonIds.includes(v.service_id)) {
        out.addonIds.push(v.service_id);
        out.addonNames.push(v.service_name);
        out.addonSlots[v.service_id] = {};
        addonRowMap[v.service_id] = new Map();
      }
      out.addonSlots[v.service_id][v.visit_date] = {
        ...(out.addonSlots[v.service_id][v.visit_date] || {}), [v.shift_id]: true,
      };
      if (!addonRowMap[v.service_id].has(v.shift_id))
        addonRowMap[v.service_id].set(v.shift_id, v.shift_label || v.shift_id);
    }
  });
  out.serviceSlotRows = [...primaryRowMap.entries()].map(([id, label]) => ({ id, label }));
  if (out.serviceSlotRows.length === 0) out.serviceSlotRows = [...DEFAULT_SLOT_ROWS];
  Object.entries(addonRowMap).forEach(([id, m]) => {
    out.addonSlotRows[id] = [...m.entries()].map(([sid, label]) => ({ id: sid, label }));
  });
  return out;
}

export default function BookingPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchParams] = useSearchParams();

  const copyFrom    = location.state?.copyFrom;
  const editBooking = location.state?.editBooking;

  const editPetIds   = editBooking?.petIds   || (editBooking?.petId ? [editBooking.petId] : []);
  const editPetNames = editBooking?.petNames || (editBooking?.petName ? [editBooking.petName] : []);
  const editVisits   = editBooking?.visits || [];
  const reconstructed = editVisits.length
    ? reconstructFromVisits(editVisits)
    : {
        serviceSlots:    buildDefaultSlots(editBooking?.bookingDate, editBooking?.bookingEndDate),
        serviceSlotRows: [...DEFAULT_SLOT_ROWS],
        addonIds:        editBooking?.addonIds || [],
        addonNames:      editBooking?.addonNames || [],
        addonSlots:      Object.fromEntries(
          (editBooking?.addonIds || []).map(id => [id, buildDefaultSlots(editBooking?.bookingDate, editBooking?.bookingEndDate)])),
        addonSlotRows:   Object.fromEntries(
          (editBooking?.addonIds || []).map(id => [id, [...DEFAULT_SLOT_ROWS]])),
      };

  const initialOverride = editBooking ? {
    editBookingId:       editBooking.editBookingId,
    serviceId:           editBooking.serviceId      || null,
    serviceName:         editBooking.serviceName    || '',
    basePrice:           Number(editBooking.basePrice || 0),
    baseUnitPrice:       0,
    isQuote:             false,
    petIds:              editPetIds,
    petNames:            editPetNames,
    petId:               editPetIds[0]   || null,
    petName:             editPetNames[0] || '',
    petIsNew:            false,
    bookingDate:         editBooking.bookingDate    || '',
    bookingEndDate:      editBooking.bookingEndDate || '',
    zone:                editBooking.zone           || null,
    travelFee:           Number(editBooking.travelFee || 0),
    totalPrice:          Number(editBooking.totalPrice || 0),
    specialInstructions: editBooking.specialInstructions || '',
    ...reconstructed,
  } : copyFrom ? {
    serviceId:           copyFrom.service_id   || null,
    serviceName:         copyFrom.serviceName  || '',
    basePrice:           Number(copyFrom.base_price || 0),
    isQuote:             false,
    addonIds:            copyFrom.addon_service_ids || [],
    addonNames:          copyFrom.addonNames        || [],
    petIds:              copyFrom.petIds || (copyFrom.pet_id ? [copyFrom.pet_id] : []),
    petNames:            copyFrom.petNames || [],
    petIsNew:            false,
    zone:                copyFrom.zone         || null,
    travelFee:           Number(copyFrom.travel_fee || 0),
    specialInstructions: copyFrom.special_instructions || '',
    bookingDate:    '',
    bookingEndDate: '',
  } : {};
  const isEditMode = !!editBooking;

  const booking = useBookingForm(initialOverride);
  const [submitted, setSubmitted] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(
    searchParams.get('tutorial') === 'true'
  );

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.heading}>
            {isEditMode ? 'Booking Updated!' : 'Booking Submitted!'}
          </h1>
          <p style={styles.body}>
            {isEditMode
              ? 'Your booking has been updated and sent to Tailwinds for review. We will confirm within 24 hours.'
              : 'Thank you! Your booking has been sent to Tailwinds for review. We will confirm and send your invoice within 24 hours.'}
          </p>
          <div style={styles.btnRow}>
            <button style={styles.primaryBtn} onClick={() => navigate('/portal')}>
              View My Bookings
            </button>
            <button style={styles.secondaryBtn} onClick={() => { booking.reset(); setSubmitted(false); }}>
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepProps = { booking, onSubmitSuccess: () => setSubmitted(true) };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>{isEditMode ? 'Edit Booking' : 'Book a Service'}</h1>

        <div style={styles.progress}>
          {STEPS.map((label, i) => (
            <div key={label} style={styles.progressItem}>
              <div style={{
                ...styles.progressDot,
                background: i <= booking.step ? COLORS.blue : COLORS.lightBlue,
              }}>
                {i < booking.step ? '✓' : i + 1}
              </div>
              <span style={{
                ...styles.progressLabel,
                color: i <= booking.step ? COLORS.blue : COLORS.lightBlue,
              }}>{label}</span>
            </div>
          ))}
        </div>

        {booking.step === 0 && <ScheduleStep {...stepProps} />}
        {booking.step === 1 && <PetStep      {...stepProps} />}
        {booking.step === 2 && <ServiceStep  {...stepProps} />}
        {booking.step === 3 && <ConfirmStep  {...stepProps} />}
      </div>
      {tutorialActive && (
        <TutorialOverlay
          currentStep={booking.step}
          onDismiss={() => setTutorialActive(false)}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', background: COLORS.white, padding: '2rem 1rem',
  },
  card: {
    background: COLORS.white, border: `1px solid ${COLORS.lightBlue}`,
    borderRadius: '12px', padding: '2rem', maxWidth: '640px',
    margin: '0 auto', boxShadow: '0 4px 24px rgba(104,175,230,0.10)',
  },
  heading: {
    fontFamily: FONTS.header, color: COLORS.blue, marginBottom: '1.5rem', textAlign: 'center',
  },
  progress: {
    display: 'flex', justifyContent: 'space-between', marginBottom: '2rem',
  },
  progressItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flex: 1,
  },
  progressDot: {
    width: '2rem', height: '2rem', borderRadius: '50%', color: COLORS.white,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', fontWeight: '700',
  },
  progressLabel: {
    fontSize: '0.75rem', fontFamily: FONTS.body,
  },
  body: {
    fontFamily: FONTS.body, lineHeight: 1.6, color: COLORS.black, textAlign: 'center',
    marginBottom: '1.5rem',
  },
  btnRow: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' },
  primaryBtn: {
    padding: '0.75rem 1.5rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', fontFamily: FONTS.body,
  },
  secondaryBtn: {
    padding: '0.75rem 1.5rem', background: COLORS.white, color: COLORS.blue,
    border: `2px solid ${COLORS.blue}`, borderRadius: '8px', fontSize: '1rem',
    cursor: 'pointer', fontFamily: FONTS.body,
  },
};
