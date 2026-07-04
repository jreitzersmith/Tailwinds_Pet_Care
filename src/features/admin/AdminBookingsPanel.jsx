import { useEffect, useState, useCallback } from 'react';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';

const BOOKING_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

const STATUS_STYLE = {
  pending:     { bg: '#FFF3CD', color: '#856404' },
  confirmed:   { bg: '#D4EDDA', color: '#155724' },
  in_progress: { bg: '#CCE5FF', color: '#004085' },
  completed:   { bg: '#E2E3E5', color: '#383d41' },
  cancelled:   { bg: '#F8D7DA', color: '#721c24' },
};

function statusStyle(status) {
  return STATUS_STYLE[status] || { bg: '#eee', color: '#333' };
}

const FILTER_OPTIONS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'confirmed',   label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'cancelled',   label: 'Cancelled' },
];

// ── Booking row ───────────────────────────────────────────────────────────────
function BookingRow({ booking, onStatusChange }) {
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ss = statusStyle(booking.status);

  const dateRange = booking.booking_end_date && booking.booking_end_date !== booking.booking_date
    ? `${booking.booking_date} – ${booking.booking_end_date}`
    : booking.booking_date;

  async function handleStatusChange(e) {
    const newStatus = e.target.value;
    setSaving(true);
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', booking.id);
    setSaving(false);
    if (error) { alert(`Update failed: ${error.message}`); return; }
    onStatusChange(booking.id, newStatus);
  }

  return (
    <div style={styles.row}>
      <div style={styles.rowMain} onClick={() => setExpanded(x => !x)}>
        <div style={styles.rowLeft}>
          <span style={styles.customerName}>
            {booking.customers?.full_name || '—'}
          </span>
          <span style={styles.customerEmail}>{booking.customers?.email || '—'}</span>
        </div>
        <div style={styles.rowMid}>
          <span style={styles.service}>{booking.services?.name || '—'}</span>
          <span style={styles.pet}>
            {booking.pets?.name ? `${booking.pets.name} (${booking.pets.species})` : '—'}
          </span>
          <span style={styles.dates}>{dateRange}</span>
        </div>
        <div style={styles.rowRight}>
          <span style={{ ...styles.badge, background: ss.bg, color: ss.color }}>
            {booking.status.replace(/_/g, ' ')}
          </span>
          <span style={styles.price}>
            ${Number(booking.total_price || 0).toFixed(2)}
          </span>
          <span style={styles.expandCaret}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={styles.rowDetail}>
          <div style={styles.detailGrid}>
            <span style={styles.detailLabel}>Zone</span>
            <span style={styles.detailValue}>{booking.zone || '—'}</span>
            <span style={styles.detailLabel}>Travel Fee</span>
            <span style={styles.detailValue}>${Number(booking.travel_fee || 0).toFixed(2)}</span>
            <span style={styles.detailLabel}>Base Price</span>
            <span style={styles.detailValue}>${Number(booking.base_price || 0).toFixed(2)}</span>
            <span style={styles.detailLabel}>Airline</span>
            <span style={styles.detailValue}>{booking.customers?.airline || '—'}</span>
            {booking.special_instructions && (
              <>
                <span style={styles.detailLabel}>Instructions</span>
                <span style={styles.detailValue}>{booking.special_instructions}</span>
              </>
            )}
          </div>
          <div style={styles.statusRow}>
            <label style={styles.statusLabel}>Update status:</label>
            <select
              style={styles.statusSelect}
              value={booking.status}
              onChange={handleStatusChange}
              disabled={saving}
            >
              {BOOKING_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {saving && <span style={styles.savingNote}>Saving…</span>}
          </div>
        </div>
      )}
    </div>
  );
}

import PropTypes from 'prop-types';

BookingRow.propTypes = {
  booking:        PropTypes.object.isRequired,
  onStatusChange: PropTypes.func.isRequired,
};

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AdminBookingsPanel() {
  const [bookings, setBookings] = useState([]);
  const [filter,   setFilter]   = useState('all');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('bookings')
      .select(`
        id, booking_date, booking_end_date, booking_time, status,
        base_price, travel_fee, total_price, zone, special_instructions,
        created_at, updated_at,
        customers ( email, full_name, airline ),
        services  ( name ),
        pets      ( name, species )
      `)
      .order('booking_date', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setBookings(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  function handleStatusChange(bookingId, newStatus) {
    setBookings(prev =>
      prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b)
    );
  }

  return (
    <div>
      <div style={styles.filterRow}>
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.key}
            style={{ ...styles.filterBtn, ...(filter === opt.key ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && <p style={styles.msg}>Loading bookings…</p>}
      {error   && <p style={styles.err}>{error}</p>}
      {!loading && !error && bookings.length === 0 && (
        <p style={styles.empty}>No bookings found.</p>
      )}
      {!loading && !error && bookings.length > 0 && (
        <div style={styles.list}>
          {bookings.map(b => (
            <BookingRow key={b.id} booking={b} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  filterRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  filterBtn: {
    padding: '0.4rem 1rem', borderRadius: '20px', border: `1px solid ${COLORS.lightBlue}`,
    background: 'none', fontFamily: FONTS.body, fontSize: '0.85rem',
    color: COLORS.lightBlue, cursor: 'pointer',
  },
  filterBtnActive: {
    background: COLORS.blue, color: COLORS.white, borderColor: COLORS.blue, fontWeight: '600',
  },
  list:  { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  msg:   { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  err:   { fontFamily: FONTS.body, color: COLORS.red, padding: '1rem' },
  empty: { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },

  row: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px',
    overflow: 'hidden', background: '#fff',
  },
  rowMain: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
    padding: '0.85rem 1.1rem', cursor: 'pointer',
  },
  rowLeft: { flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: '2px' },
  customerName: { fontFamily: FONTS.body, fontWeight: '600', fontSize: '0.9rem', color: COLORS.black },
  customerEmail: { fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.lightBlue },

  rowMid: { flex: '2 1 240px', display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1.25rem' },
  service: { fontFamily: FONTS.body, fontSize: '0.88rem', color: COLORS.black },
  pet:     { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.lightBlue },
  dates:   { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.black },

  rowRight: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' },
  badge: {
    padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem',
    fontWeight: '600', fontFamily: FONTS.body, textTransform: 'capitalize',
  },
  price: { fontFamily: FONTS.body, fontWeight: '700', color: COLORS.blue, fontSize: '0.9rem' },
  expandCaret: { fontFamily: FONTS.body, color: COLORS.lightBlue, fontSize: '0.75rem' },

  rowDetail: { borderTop: `1px solid ${COLORS.lightBlue}`, padding: '0.9rem 1.1rem', background: '#fafcff' },
  detailGrid: {
    display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.3rem 1rem',
    marginBottom: '0.9rem', fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  detailLabel: { color: COLORS.lightBlue, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em', alignSelf: 'center' },
  detailValue: { color: COLORS.black },

  statusRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  statusLabel: { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue },
  statusSelect: {
    padding: '0.35rem 0.75rem', borderRadius: '6px', border: `1px solid ${COLORS.lightBlue}`,
    fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.black, cursor: 'pointer',
  },
  savingNote: { fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.lightBlue, fontStyle: 'italic' },
};
