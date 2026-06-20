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
  // dateStr is 'YYYY-MM-DD'; display as 'Mon DD, YYYY'
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export default function BookingCard({ booking, canCancel, onCancel }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const statusColor = STATUS_COLORS[booking.status] ?? COLORS.black;
  const time = formatTime(booking.booking_time);

  async function confirmCancel() {
    setCancelling(true);
    await onCancel(booking.id);
    setCancelling(false);
    setConfirming(false);
  }

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div>
          <p style={styles.serviceName}>{booking.services?.name ?? '—'}</p>
          <p style={styles.meta}>
            {booking.pets?.name && <span>{booking.pets.name} ({booking.pets.species})</span>}
          </p>
        </div>
        <span style={{ ...styles.status, color: statusColor }}>
          {booking.status.replace('_', ' ')}
        </span>
      </div>

      <div style={styles.details}>
        <Detail label='Date' value={formatDate(booking.booking_date)} />
        {time && <Detail label='Time' value={time} />}
        {booking.zone && <Detail label='Zone' value={booking.zone} />}
        <Detail label='Base' value={`$${Number(booking.base_price).toFixed(2)}`} />
        {booking.travel_fee > 0 &&
          <Detail label='Travel Fee' value={`+$${Number(booking.travel_fee).toFixed(2)}`} />}
        <Detail label='Total' value={`$${Number(booking.total_price).toFixed(2)}`} bold />
      </div>

      {booking.special_instructions && (
        <p style={styles.notes}><em>Notes:</em> {booking.special_instructions}</p>
      )}

      {canCancel && !confirming && (
        <button style={styles.cancelBtn} onClick={() => setConfirming(true)}>
          Cancel Booking
        </button>
      )}

      {confirming && (
        <div style={styles.confirmRow}>
          <span style={styles.confirmText}>Cancel this booking?</span>
          <button style={styles.confirmYes} onClick={confirmCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Yes, cancel'}
          </button>
          <button style={styles.confirmNo} onClick={() => setConfirming(false)}>
            Keep it
          </button>
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
  booking:   PropTypes.object.isRequired,
  canCancel: PropTypes.bool,
  onCancel:  PropTypes.func.isRequired,
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
  meta: { fontFamily: FONTS.body, color: COLORS.lightBlue, fontSize: '0.85rem' },
  status: {
    fontFamily: FONTS.body, fontSize: '0.8rem', fontWeight: '600',
    textTransform: 'capitalize', whiteSpace: 'nowrap',
  },
  details: {
    display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', marginBottom: '0.75rem',
  },
  detail:      { display: 'flex', gap: '0.2rem' },
  detailLabel: { fontFamily: FONTS.body, fontSize: '0.85rem', color: '#777' },
  detailValue: { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.black },
  bold:        { fontWeight: '700', color: COLORS.blue },
  notes: {
    fontFamily: FONTS.body, fontSize: '0.85rem', color: '#555',
    borderTop: `1px solid ${COLORS.lightBlue}`, paddingTop: '0.5rem', marginBottom: '0.75rem',
  },
  cancelBtn: {
    background: 'none', border: `1px solid ${COLORS.red}`, color: COLORS.red,
    borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  confirmRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
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
