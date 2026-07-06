import { useEffect, useState, useCallback } from 'react';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';
import PropTypes from 'prop-types';

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
function BookingRow({ booking, onStatusChange, onNotesChange, serviceMap }) {
  const [saving,      setSaving]      = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [expanded,    setExpanded]    = useState(false);
  const [adminNotes,  setAdminNotes]  = useState(booking.admin_notes || '');
  const [notesSaved,  setNotesSaved]  = useState(false);
  const [emailSent,   setEmailSent]   = useState(false);

  const ss = statusStyle(booking.status);

  const dateRange = booking.booking_end_date && booking.booking_end_date !== booking.booking_date
    ? `${booking.booking_date} – ${booking.booking_end_date}`
    : booking.booking_date;

  const addonNames = (booking.addon_service_ids || [])
    .map(id => serviceMap[id] || id)
    .filter(Boolean);

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

    // Fire confirmation email when status changes to confirmed
    if (newStatus === 'confirmed') {
      supabase.functions
        .invoke('send-booking-email', { body: { bookingId: booking.id } })
        .then(() => { setEmailSent(true); setTimeout(() => setEmailSent(false), 4000); })
        .catch(err => console.warn('Email notification failed:', err));
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    const { error } = await supabase
      .from('bookings')
      .update({ admin_notes: adminNotes || null, updated_at: new Date().toISOString() })
      .eq('id', booking.id);
    setSavingNotes(false);
    if (error) { alert(`Failed to save notes: ${error.message}`); return; }
    onNotesChange(booking.id, adminNotes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  return (
    <div style={styles.row}>
      <div style={styles.rowMain} onClick={() => setExpanded(x => !x)}>
        <div style={styles.rowLeft}>
          <span style={styles.customerName}>{booking.customers?.full_name || '—'}</span>
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
          <span style={styles.price}>${Number(booking.total_price || 0).toFixed(2)}</span>
          <span style={styles.expandCaret}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={styles.rowDetail}>
          {/* Details grid */}
          <div style={styles.detailGrid}>
            <span style={styles.detailLabel}>Booking ID</span>
            <span style={styles.detailValue} title={booking.id}>{booking.id.slice(0, 8)}…</span>

            <span style={styles.detailLabel}>Airline</span>
            <span style={styles.detailValue}>{booking.customers?.airline || '—'}</span>

            <span style={styles.detailLabel}>Phone</span>
            <span style={styles.detailValue}>{booking.customers?.phone || '—'}</span>

            <span style={styles.detailLabel}>Start Date</span>
            <span style={styles.detailValue}>{booking.booking_date || '—'}</span>

            {booking.booking_end_date && booking.booking_end_date !== booking.booking_date && (
              <>
                <span style={styles.detailLabel}>End Date</span>
                <span style={styles.detailValue}>{booking.booking_end_date}</span>
              </>
            )}

            <span style={styles.detailLabel}>Time</span>
            <span style={styles.detailValue}>{booking.booking_time || '—'}</span>

            <span style={styles.detailLabel}>Primary Service</span>
            <span style={styles.detailValue}>{booking.services?.name || '—'}</span>

            {addonNames.length > 0 && (
              <>
                <span style={styles.detailLabel}>Add-On Services</span>
                <span style={styles.detailValue}>{addonNames.join(', ')}</span>
              </>
            )}

            <span style={styles.detailLabel}>Zone</span>
            <span style={styles.detailValue}>{booking.zone || '—'}</span>

            <span style={styles.detailLabel}>Travel Fee</span>
            <span style={styles.detailValue}>${Number(booking.travel_fee || 0).toFixed(2)}</span>

            <span style={styles.detailLabel}>Base Price</span>
            <span style={styles.detailValue}>${Number(booking.base_price || 0).toFixed(2)}</span>

            <span style={styles.detailLabel}>Total</span>
            <span style={{ ...styles.detailValue, fontWeight: '700', color: COLORS.blue }}>
              ${Number(booking.total_price || 0).toFixed(2)}
            </span>

            <span style={styles.detailLabel}>Created</span>
            <span style={styles.detailValue}>
              {booking.created_at
                ? new Date(booking.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : '—'}
            </span>
          </div>

          {/* Customer notes — always visible */}
          <div style={styles.customerNotesSection}>
            <span style={styles.customerNotesLabel}>Customer Notes</span>
            <p style={styles.customerNotesValue}>
              {booking.special_instructions || <em style={{ color: COLORS.lightBlue }}>No notes provided.</em>}
            </p>
          </div>

          {/* Status change */}
          <div style={styles.statusRow}>
            <label style={styles.statusLabel}>Update status:</label>
            <select
              style={styles.statusSelect}
              value={booking.status}
              onChange={handleStatusChange}
              disabled={saving}
              onClick={e => e.stopPropagation()}
            >
              {BOOKING_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {saving && <span style={styles.savingNote}>Saving…</span>}
            {emailSent && <span style={styles.emailSentNote}>✉ Confirmation email sent</span>}
          </div>

          {/* Admin notes */}
          <div style={styles.notesSection}>
            <label style={styles.notesLabel}>Admin Notes / Suggested Changes</label>
            <textarea
              style={styles.notesTextarea}
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Add internal notes or suggested changes (not visible to customer)…"
              onClick={e => e.stopPropagation()}
              rows={3}
            />
            <div style={styles.notesFooter}>
              <button
                style={styles.saveNotesBtn}
                onClick={e => { e.stopPropagation(); handleSaveNotes(); }}
                disabled={savingNotes}
              >
                {savingNotes ? 'Saving…' : 'Save Notes'}
              </button>
              {notesSaved && <span style={styles.savedConfirm}>✓ Saved</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

BookingRow.propTypes = {
  booking:        PropTypes.object.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  onNotesChange:  PropTypes.func.isRequired,
  serviceMap:     PropTypes.object.isRequired,
};

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AdminBookingsPanel() {
  const [bookings,       setBookings]       = useState([]);
  const [filter,         setFilter]         = useState('all');
  const [hideCancelled,  setHideCancelled]  = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [serviceMap,     setServiceMap]     = useState({});

  useEffect(() => {
    supabase.from('services').select('id, name').then(({ data }) => {
      if (data) {
        const map = {};
        data.forEach(svc => { map[svc.id] = svc.name; });
        setServiceMap(map);
      }
    });
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('bookings')
      .select(`
        id, booking_date, booking_end_date, booking_time, status,
        base_price, travel_fee, total_price, zone, special_instructions,
        admin_notes, addon_service_ids, created_at, updated_at,
        customers ( email, full_name, airline, phone ),
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

  function handleNotesChange(bookingId, notes) {
    setBookings(prev =>
      prev.map(b => b.id === bookingId ? { ...b, admin_notes: notes } : b)
    );
  }

  const displayedBookings = bookings.filter(b => {
    if (hideCancelled && filter === 'all' && b.status === 'cancelled') return false;
    return true;
  });

  return (
    <div>
      <div style={styles.filterBar}>
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
        <label style={styles.hideToggle}>
          <input
            type='checkbox'
            checked={hideCancelled}
            onChange={e => setHideCancelled(e.target.checked)}
            style={{ marginRight: '0.4rem' }}
          />
          Hide Cancelled
        </label>
      </div>

      {loading && <p style={styles.msg}>Loading bookings…</p>}
      {error   && <p style={styles.err}>{error}</p>}
      {!loading && !error && displayedBookings.length === 0 && (
        <p style={styles.empty}>No bookings found.</p>
      )}
      {!loading && !error && displayedBookings.length > 0 && (
        <div style={styles.list}>
          {displayedBookings.map(b => (
            <BookingRow
              key={b.id}
              booking={b}
              onStatusChange={handleStatusChange}
              onNotesChange={handleNotesChange}
              serviceMap={serviceMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  filterBar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' },
  filterRow:      { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  filterBtn: {
    padding: '0.4rem 1rem', borderRadius: '20px', border: `1px solid ${COLORS.lightBlue}`,
    background: 'none', fontFamily: FONTS.body, fontSize: '0.85rem',
    color: COLORS.lightBlue, cursor: 'pointer',
  },
  filterBtnActive: { background: COLORS.blue, color: COLORS.white, borderColor: COLORS.blue, fontWeight: '600' },
  hideToggle: {
    display: 'flex', alignItems: 'center', fontFamily: FONTS.body,
    fontSize: '0.85rem', color: COLORS.lightBlue, cursor: 'pointer', userSelect: 'none',
  },
  list:  { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  msg:   { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  err:   { fontFamily: FONTS.body, color: COLORS.red, padding: '1rem' },
  empty: { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },

  row: { border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px', overflow: 'hidden', background: '#fff' },
  rowMain: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
    padding: '0.85rem 1.1rem', cursor: 'pointer',
  },
  rowLeft:       { flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: '2px' },
  customerName:  { fontFamily: FONTS.body, fontWeight: '600', fontSize: '0.9rem', color: COLORS.black },
  customerEmail: { fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.lightBlue },

  rowMid:  { flex: '2 1 240px', display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1.25rem' },
  service: { fontFamily: FONTS.body, fontSize: '0.88rem', color: COLORS.black },
  pet:     { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.lightBlue },
  dates:   { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.black },

  rowRight:    { display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' },
  badge: {
    padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem',
    fontWeight: '600', fontFamily: FONTS.body, textTransform: 'capitalize',
  },
  price:       { fontFamily: FONTS.body, fontWeight: '700', color: COLORS.blue, fontSize: '0.9rem' },
  expandCaret: { fontFamily: FONTS.body, color: COLORS.lightBlue, fontSize: '0.75rem' },

  rowDetail: { borderTop: `1px solid ${COLORS.lightBlue}`, padding: '0.9rem 1.1rem', background: '#fafcff' },
  detailGrid: {
    display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.3rem 1rem',
    marginBottom: '0.9rem', fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  detailLabel: { color: COLORS.lightBlue, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em', alignSelf: 'center' },
  detailValue: { color: COLORS.black },

  customerNotesSection: { borderTop: `1px solid ${COLORS.lightBlue}`, paddingTop: '0.75rem', marginBottom: '0.9rem' },
  customerNotesLabel: {
    display: 'block', fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px',
  },
  customerNotesValue: {
    fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black,
    margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5,
  },

  statusRow:    { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' },
  statusLabel:  { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue },
  statusSelect: {
    padding: '0.35rem 0.75rem', borderRadius: '6px', border: `1px solid ${COLORS.lightBlue}`,
    fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.black, cursor: 'pointer',
  },
  savingNote:   { fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.lightBlue, fontStyle: 'italic' },
  emailSentNote: { fontFamily: FONTS.body, fontSize: '0.8rem', color: '#155724', fontWeight: '600' },

  notesSection: { borderTop: `1px dashed ${COLORS.lightBlue}`, paddingTop: '0.85rem' },
  notesLabel: {
    display: 'block', fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
  },
  notesTextarea: {
    width: '100%', padding: '0.5rem 0.7rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontFamily: FONTS.body, fontSize: '0.875rem',
    color: COLORS.black, resize: 'vertical', boxSizing: 'border-box', outline: 'none',
  },
  notesFooter:   { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' },
  saveNotesBtn: {
    padding: '0.35rem 1rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '6px', fontFamily: FONTS.body, fontSize: '0.85rem',
    fontWeight: '600', cursor: 'pointer',
  },
  savedConfirm: { fontFamily: FONTS.body, fontSize: '0.82rem', color: '#155724', fontWeight: '600' },
};
