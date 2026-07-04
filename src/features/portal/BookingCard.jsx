import { useState } from 'react';
import PropTypes from 'prop-types';
import { COLORS, FONTS } from '../../constants.jsx';

const STATUS_COLORS = {
  pending:     COLORS.lightBlue,
  confirmed:   '#22a722',
  in_progress: COLORS.blue,
  completed:   '#888',
  cancelled:   COLORS.red,
};

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function isWithin24h(dateStr) {
  const bookingStart = new Date(dateStr + 'T00:00:00');
  const hoursUntil = (bookingStart - new Date()) / (1000 * 60 * 60);
  return hoursUntil >= 0 && hoursUntil < 24;
}

export default function BookingCard({ booking, canCancel, canEdit, canCopy, onCancel, onFullEdit, onCopy }) {
  const [confirming,       setConfirming]       = useState(false);
  const [cancelling,       setCancelling]       = useState(false);
  const [showLateWarning,  setShowLateWarning]  = useState(false);

  const statusColor = STATUS_COLORS[booking.status] ?? COLORS.black;
  const endDate     = booking.booking_end_date && booking.booking_end_date !== booking.booking_date
    ? booking.booking_end_date : null;
  const within24h   = isWithin24h(booking.booking_date);

  async function confirmCancel() {
    setCancelling(true);
    await onCancel(booking.id);
    setCancelling(false);
    setConfirming(false);
  }

  function handleEditClick() {
    if (within24h) {
      setShowLateWarning(true);
    } else {
      onFullEdit(booking);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div>
          <p style={styles.serviceName}>{booking.services?.name ?? '\u2014'}</p>
          <p style={styles.meta}>
            {booking.pets?.name && <span>{booking.pets.name} ({booking.pets.species})</span>}
          </p>
        </div>
        <span style={{ ...styles.status, color: statusColor }}>
          {booking.status.replace('_', ' ')}
        </span>
      </div>

      <div style={styles.details}>
        <Detail label='Start' value={formatDate(booking.booking_date)} />
        {endDate && <Detail label='End' value={formatDate(endDate)} />}
        <Detail label='Total' value={`$${Number(booking.total_price).toFixed(2)}`} bold />
      </div>

      {booking.special_instructions && (
        <p style={styles.notes}><em>Notes:</em> {booking.special_instructions}</p>
      )}

      {/* Late-change warning panel */}
      {showLateWarning && (
        <div style={styles.warningPanel}>
          <p style={styles.warningText}>
            {'\u26a0\ufe0f'} This booking starts within 24 hours. Changing the schedule at this time
            may result in a <strong>late change fee of $20</strong>.
          </p>
          <div style={styles.warningBtns}>
            <button style={styles.warningProceedBtn} onClick={() => { setShowLateWarning(false); onFullEdit(booking); }}>
              Continue to Edit
            </button>
            <button style={styles.confirmNo} onClick={() => setShowLateWarning(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!confirming && !showLateWarning && (
        <div style={styles.actionRow}>
          {canEdit && (
            <button style={styles.editBtn} onClick={handleEditClick}>Edit</button>
          )}
          {canCancel && (
            <button style={styles.cancelBtn} onClick={() => setConfirming(true)}>Cancel Booking</button>
          )}
          {canCopy && (
            <button style={styles.copyBtn} onClick={() => onCopy(booking)}>Copy to New Dates</button>
          )}
        </div>
      )}

      {confirming && (
        <div style={styles.confirmWrap}>
          {within24h && (
            <p style={styles.cancelFeeNote}>
              {'\u26a0\ufe0f'} Cancelling within 24 hours of the booking may result in a
              {' '}<strong>late cancellation fee of $20</strong>.
            </p>
          )}
          <div style={styles.confirmRow}>
            <span style={styles.confirmText}>Cancel this booking?</span>
            <button style={styles.confirmYes} onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling\u2026' : 'Yes, cancel'}
            </button>
            <button style={styles.confirmNo} onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, bold }) {
  return (
    <span style={styles.detail}>
      <span style={styles.detailLabel}>{label}: </span>
      <span style={{ ...styles.detailValue, ...(bold ? styles.bold : {}) }}>{value}</span>
    </span>
  );
}

Detail.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  bold:  PropTypes.bool,
};

BookingCard.propTypes = {
  booking:      PropTypes.object.isRequired,
  canCancel:    PropTypes.bool,
  canEdit:      PropTypes.bool,
  canCopy:      PropTypes.bool,
  onCancel:     PropTypes.func.isRequired,
  onFullEdit:   PropTypes.func.isRequired,
  onCopy:       PropTypes.func.isRequired,
};

const styles = {
  card: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px',
    padding: '1rem 1.25rem', background: COLORS.white,
  },
  top: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '0.75rem',
  },
  serviceName: {
    fontFamily: FONTS.header, color: COLORS.black,
    fontSize: '1rem', fontWeight: '600', marginBottom: '0.2rem',
  },
  meta:   { fontFamily: FONTS.body, color: COLORS.lightBlue, fontSize: '0.85rem' },
  status: {
    fontFamily: FONTS.body, fontSize: '0.8rem', fontWeight: '600',
    textTransform: 'capitalize', whiteSpace: 'nowrap',
  },
  details:     { display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', marginBottom: '0.75rem' },
  detail:      { display: 'flex', gap: '0.2rem' },
  detailLabel: { fontFamily: FONTS.body, fontSize: '0.85rem', color: '#777' },
  detailValue: { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.black },
  bold:        { fontWeight: '700', color: COLORS.blue },
  notes: {
    fontFamily: FONTS.body, fontSize: '0.85rem', color: '#555',
    borderTop: `1px solid ${COLORS.lightBlue}`, paddingTop: '0.5rem', marginBottom: '0.75rem',
  },
  warningPanel: {
    background: '#fff8e1', border: '1px solid #f5c518', borderRadius: '8px',
    padding: '0.85rem 1rem', marginBottom: '0.75rem',
  },
  warningText: {
    fontFamily: FONTS.body, fontSize: '0.88rem', color: '#7a5800', margin: '0 0 0.65rem',
    lineHeight: 1.5,
  },
  warningBtns:       { display: 'flex', gap: '0.6rem', alignItems: 'center' },
  warningProceedBtn: {
    padding: '0.4rem 1rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '6px', cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  actionRow:  { display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.25rem' },
  editBtn: {
    background: 'none', border: `1px solid ${COLORS.blue}`, color: COLORS.blue,
    borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  cancelBtn: {
    background: 'none', border: `1px solid ${COLORS.red}`, color: COLORS.red,
    borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  copyBtn: {
    background: 'none', border: `1px solid ${COLORS.blue}`, color: COLORS.blue,
    borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  confirmWrap: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  cancelFeeNote: {
    fontFamily: FONTS.body, fontSize: '0.85rem', color: '#7a5800',
    background: '#fff8e1', border: '1px solid #f5c518', borderRadius: '6px',
    padding: '0.5rem 0.75rem', margin: 0, lineHeight: 1.5,
  },
  confirmRow:  { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  confirmText: { fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.black },
  confirmYes: {
    padding: '0.4rem 1rem', background: COLORS.red, color: COLORS.white,
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  confirmNo: {
    padding: '0.4rem 1rem', background: COLORS.white, color: COLORS.black,
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '6px', cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: '0.85rem',
  },
};
