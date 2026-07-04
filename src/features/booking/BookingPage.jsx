import { useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import TutorialOverlay from './TutorialOverlay.jsx';
import { COLORS, FONTS } from '../../constants.jsx';
import useBookingForm, { STEPS } from './useBookingForm.js';
import ServiceStep from './steps/ServiceStep.jsx';
import ScheduleStep from './steps/ScheduleStep.jsx';
import PetStep from './steps/PetStep.jsx';
import ConfirmStep from './steps/ConfirmStep.jsx';

export default function BookingPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchParams] = useSearchParams();

  // "Copy to new dates" pre-populates service/pet but clears dates
  const copyFrom = location.state?.copyFrom;
  // "Edit booking" pre-populates everything including dates and booking ID
  const editBooking = location.state?.editBooking;

  const initialOverride = editBooking ? {
    editBookingId:       editBooking.editBookingId,
    serviceId:           editBooking.serviceId      || null,
    serviceName:         editBooking.serviceName    || '',
    basePrice:           Number(editBooking.basePrice || 0),
    baseUnitPrice:       0,   // resolved from live DB price in ServiceStep
    isQuote:             false,
    addonIds:            editBooking.addonIds       || [],
    petId:               editBooking.petId          || null,
    petName:             editBooking.petName        || '',
    petIsNew:            false,
    bookingDate:         editBooking.bookingDate    || '',
    bookingEndDate:      editBooking.bookingEndDate || '',
    zone:                editBooking.zone           || null,
    travelFee:           Number(editBooking.travelFee || 0),
    totalPrice:          Number(editBooking.totalPrice || 0),
    specialInstructions: editBooking.specialInstructions || '',
  } : copyFrom ? {
    serviceId:           copyFrom.service_id   || null,
    serviceName:         copyFrom.serviceName  || '',
    basePrice:           Number(copyFrom.base_price || 0),
    isQuote:             false,
    addonIds:            copyFrom.addon_service_ids || [],
    petId:               copyFrom.pet_id       || null,
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
            {isEditMode ? 'Booking Updated!' : 'Booking Confirmed!'}
          </h1>
          <p style={styles.body}>
            {isEditMode
              ? 'Your booking has been updated. We will confirm any changes within 24 hours.'
              : 'Thank you! We will reach out to confirm the details within 24 hours.'}
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

        {/* Progress indicator */}
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
