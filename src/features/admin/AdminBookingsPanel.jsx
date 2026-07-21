import { useEffect, useState, useCallback } from 'react';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';
import { groupLineItems, fmtMoney } from '../booking/visitModel.js';
import PropTypes from 'prop-types';

// New bookings status set (per contract).
const BOOKING_STATUSES = [
  'pending_company_review',
  'changes_pending_customer',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'declined',
];

const STATUS_STYLE = {
  pending_company_review:   { bg: '#FFF3CD', color: '#856404', label: 'Pending Review' },
  changes_pending_customer: { bg: '#FFE5B4', color: '#8a4e00', label: 'Changes Need Your Approval' },
  confirmed:                { bg: '#D4EDDA', color: '#155724', label: 'Confirmed' },
  in_progress:              { bg: '#CCE5FF', color: '#004085', label: 'In Progress' },
  completed:                { bg: '#E2E3E5', color: '#383d41', label: 'Completed' },
  cancelled:                { bg: '#F8D7DA', color: '#721c24', label: 'Cancelled' },
  declined:                 { bg: '#F8D7DA', color: '#721c24', label: 'Declined' },
};

function statusStyle(status) {
  return STATUS_STYLE[status] || { bg: '#eee', color: '#333', label: (status || '').replace(/_/g, ' ') };
}

const INVOICE_STATUS_STYLE = {
  draft:                   { bg: '#FFF3CD', color: '#856404', label: 'Invoice: Draft' },
  pending_customer_review: { bg: '#CCE5FF', color: '#004085', label: 'Invoice: Pending Customer' },
  awaiting_payment:        { bg: '#FFE5B4', color: '#8a4e00', label: 'Invoice: Awaiting Payment' },
  paid:                    { bg: '#D4EDDA', color: '#155724', label: 'Invoice: Paid' },
  void:                    { bg: '#E2E3E5', color: '#383d41', label: 'Invoice: Void' },
};
function invoiceStatusStyle(status) {
  return INVOICE_STATUS_STYLE[status] || null;
}
function statusLabel(status) {
  return statusStyle(status).label;
}

const FILTER_OPTIONS = [
  { key: 'all',                      label: 'All' },
  { key: 'pending_company_review',   label: 'Pending Review' },
  { key: 'changes_pending_customer', label: 'Changes Pending' },
  { key: 'confirmed',                label: 'Confirmed' },
  { key: 'in_progress',              label: 'In Progress' },
  { key: 'completed',                label: 'Completed' },
  { key: 'cancelled',                label: 'Cancelled' },
  { key: 'declined',                 label: 'Declined' },
];

// ── Schedule helpers ────────────────────────────────────────────────────────
function fmtDateCol(str) {
  const d = new Date(str + 'T12:00:00');
  return (d.getMonth() + 1) + '/' + d.getDate();
}

// Pets from booking_pets (comma-separated).
function petNames(booking) {
  const bp = booking.booking_pets;
  if (Array.isArray(bp) && bp.length > 0) {
    return bp
      .map(p => {
        const name = p.pet_name || p.pets?.name;
        const species = p.pets?.species;
        if (!name) return null;
        return species ? `${name} (${species})` : name;
      })
      .filter(Boolean)
      .join(', ');
  }
  if (booking.pets?.name) {
    return booking.pets.species ? `${booking.pets.name} (${booking.pets.species})` : booking.pets.name;
  }
  return '';
}

// ── Visit schedule table (rows = shifts, columns = dates) ──────────────────────
function VisitScheduleTable({ visits }) {
  if (!Array.isArray(visits) || visits.length === 0) return null;

  // Distinct sorted dates.
  const dates = [...new Set(visits.map(v => v.visit_date))].filter(Boolean).sort();
  // Distinct shift rows (id -> label), preserving service context per cell.
  const shiftMap = new Map();
  visits.forEach(v => {
    const key = v.shift_id || 'scheduled';
    if (!shiftMap.has(key)) shiftMap.set(key, v.shift_label || key);
  });
  const shifts = [...shiftMap.entries()]; // [ [id, label], ... ]

  // Lookup: `${shiftId}|${date}` -> array of service names on that cell.
  const cell = {};
  visits.forEach(v => {
    const k = `${v.shift_id || 'scheduled'}|${v.visit_date}`;
    if (!cell[k]) cell[k] = [];
    cell[k].push(v.service_name || 'Visit');
  });

  const MAX_COLS     = 10;
  const displayDates = dates.slice(0, MAX_COLS);
  const truncated    = dates.length > MAX_COLS;
  // Add-on visits happen during an existing visit, so they are not counted
  // as separate visits in the header total.
  const primaryVisitCount = visits.filter(v => !v.is_addon).length || visits.length;

  return (
    <div style={schedStyles.wrap}>
      <div style={schedStyles.header}>
        <span style={schedStyles.title}>Visit Schedule</span>
        <span style={schedStyles.dayCount}>
          {dates.length} day{dates.length !== 1 ? 's' : ''} · {primaryVisitCount} visit{primaryVisitCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={schedStyles.table}>
          <thead>
            <tr>
              <th style={{ ...schedStyles.th, textAlign: 'left', minWidth: '120px' }}>Shift</th>
              {displayDates.map(d => (
                <th key={d} style={{ ...schedStyles.th, textAlign: 'center', minWidth: '44px' }}>
                  {fmtDateCol(d)}
                </th>
              ))}
              {truncated && (
                <th style={{ ...schedStyles.th, textAlign: 'center', color: COLORS.lightBlue }}>
                  +{dates.length - MAX_COLS}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {shifts.map(([sid, label]) => (
              <tr key={sid}>
                <td style={{ ...schedStyles.td, fontWeight: '600' }}>{label}</td>
                {displayDates.map(d => {
                  const names = cell[`${sid}|${d}`];
                  return (
                    <td key={d} style={{ ...schedStyles.td, textAlign: 'center' }}>
                      {names
                        ? <span title={names.join(', ')} style={{ color: '#28A745', fontWeight: '700' }}>✓</span>
                        : <span style={{ color: '#dfe6ee' }}>·</span>}
                    </td>
                  );
                })}
                {truncated && <td style={{ ...schedStyles.td, textAlign: 'center', color: COLORS.lightBlue }}>…</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

VisitScheduleTable.propTypes = { visits: PropTypes.array };

// ── Line items table (groupLineItems over booking_visits) ─────────────────────
function LineItemsTable({ visits }) {
  const items = groupLineItems(visits || []);
  if (items.length === 0) return null;

  return (
    <table style={liStyles.table}>
      <thead>
        <tr>
          <th style={{ ...liStyles.th, textAlign: 'left' }}>Service / Add-On</th>
          <th style={{ ...liStyles.th, textAlign: 'center' }}>Qty</th>
          <th style={{ ...liStyles.th, textAlign: 'right' }}>Unit</th>
          <th style={{ ...liStyles.th, textAlign: 'right' }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((li, idx) => (
          <tr key={idx}>
            <td style={{ ...liStyles.td, fontWeight: li.is_addon ? '400' : '600', color: li.is_addon ? '#555' : COLORS.black }}>
              {li.is_addon && <span style={{ color: COLORS.lightBlue, marginRight: '4px' }}>+</span>}
              {li.description || li.service_name}
            </td>
            <td style={{ ...liStyles.td, textAlign: 'center' }}>{li.qty}</td>
            <td style={{ ...liStyles.td, textAlign: 'right' }}>{fmtMoney(li.unit_price)}</td>
            <td style={{ ...liStyles.td, textAlign: 'right', fontWeight: '600' }}>
              {li.is_quote ? 'Quote' : fmtMoney(li.total)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

LineItemsTable.propTypes = { visits: PropTypes.array };

const schedStyles = {
  wrap:     { border: '1px solid ' + COLORS.lightBlue, borderRadius: '8px', overflow: 'hidden', background: '#fff', marginBottom: '1rem' },
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.85rem', background: '#f0f6fd', borderBottom: '1px solid ' + COLORS.lightBlue },
  title:    { fontFamily: FONTS.body, fontSize: '0.78rem', fontWeight: '700', color: COLORS.blue, textTransform: 'uppercase', letterSpacing: '0.05em' },
  dayCount: { fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.lightBlue },
  table:    { width: '100%', borderCollapse: 'collapse' },
  th:       { fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #eef1f5', padding: '0.4rem 0.6rem', background: '#fafcff' },
  td:       { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.black, padding: '0.35rem 0.6rem', borderBottom: '1px solid #f0f4f8' },
};

const liStyles = {
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' },
  th:    { fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid ' + COLORS.blue, paddingBottom: '4px', paddingRight: '8px' },
  td:    { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.black, padding: '4px 8px 4px 0', borderBottom: '1px solid #eef1f5' },
};

// ── Booking row ───────────────────────────────────────────────────────────────
function BookingRow({ booking, onStatusChange, onNotesChange, onApproved, serviceMap }) {
  const [saving,      setSaving]      = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [expanded,    setExpanded]    = useState(false);
  const [adminNotes,  setAdminNotes]  = useState(booking.admin_notes || '');
  const [notesSaved,  setNotesSaved]  = useState(false);
  const [emailSent,   setEmailSent]   = useState(false);
  const [approving,   setApproving]   = useState(false);
  const [approveMsg,  setApproveMsg]  = useState(null);

  const ss = statusStyle(booking.status);

  const dateRange = booking.booking_end_date && booking.booking_end_date !== booking.booking_date
    ? `${booking.booking_date} – ${booking.booking_end_date}`
    : booking.booking_date;

  const visits   = booking.booking_visits || [];
  const petsStr  = petNames(booking);

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

  // Approve the booking as-is and issue its invoice to the customer.
  async function handleApproveAndSend() {
    setApproving(true);
    setApproveMsg(null);
    const nowIso = new Date().toISOString();

    // 1) Booking -> confirmed
    const { error: bErr } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', updated_at: nowIso })
      .eq('id', booking.id);
    if (bErr) { setApproving(false); setApproveMsg({ ok: false, text: bErr.message }); return; }

    // 2) Find the linked invoice, mark awaiting_payment + issued_at
    const { data: inv, error: invLookupErr } = await supabase
      .from('invoices')
      .select('id')
      .eq('booking_id', booking.id)
      .single();

    if (invLookupErr || !inv) {
      // Booking is confirmed even if no invoice exists.
      setApproving(false);
      onApproved(booking.id, 'confirmed');
      setApproveMsg({ ok: true, text: 'Booking confirmed (no linked invoice found to issue).' });
      return;
    }

    const { error: invErr } = await supabase
      .from('invoices')
      .update({ status: 'awaiting_payment', issued_at: nowIso, updated_at: nowIso })
      .eq('id', inv.id);
    if (invErr) { setApproving(false); setApproveMsg({ ok: false, text: invErr.message }); return; }

    // 3) Invoke send-invoice-email (best-effort, with auth token).
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('send-invoice-email', {
        body:    { invoiceId: inv.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    } catch (err) {
      console.warn('send-invoice-email failed:', err);
    }

    setApproving(false);
    onApproved(booking.id, 'confirmed');
    setApproveMsg({ ok: true, text: 'Approved — invoice issued and emailed.' });
    setTimeout(() => setApproveMsg(null), 5000);
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
          <span style={styles.pet}>{petsStr || '—'}</span>
          <span style={styles.dates}>{dateRange}</span>
        </div>
        <div style={styles.rowRight}>
          <span style={{ ...styles.badge, background: ss.bg, color: ss.color }}>
            {ss.label}
          </span>
          {(() => {
            const inv = (booking.invoices || [])[0];
            const is  = inv ? invoiceStatusStyle(inv.status) : null;
            return is ? (
              <span style={{ ...styles.badge, background: is.bg, color: is.color }} title={inv.invoice_number || ''}>
                {is.label}
              </span>
            ) : null;
          })()}
          <span style={styles.price}>${Number(booking.total_price || 0).toFixed(2)}</span>
          <span style={styles.expandCaret}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={styles.rowDetail}>
          {/* Visit schedule (from booking_visits) */}
          <VisitScheduleTable visits={visits} />

          {/* Line items (groupLineItems) */}
          {visits.length > 0 && (
            <>
              <span style={styles.sectionLabel}>Line Items</span>
              <LineItemsTable visits={visits} />
            </>
          )}

          {/* Details grid */}
          <div style={styles.detailGrid}>
            <span style={styles.detailLabel}>Booking ID</span>
            <span style={styles.detailValue} title={booking.id}>{booking.id.slice(0, 8)}…</span>

            <span style={styles.detailLabel}>Pets</span>
            <span style={styles.detailValue}>{petsStr || '—'}</span>

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

            {booking.admin_modified && (
              <>
                <span style={styles.detailLabel}>Admin Modified</span>
                <span style={styles.detailValue}>Yes</span>
              </>
            )}

            {booking.change_note && (
              <>
                <span style={styles.detailLabel}>Change Note</span>
                <span style={styles.detailValue}>{booking.change_note}</span>
              </>
            )}

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

          {/* Approve & Send Invoice (only for pending_company_review) */}
          {booking.status === 'pending_company_review' && (
            <div style={styles.approveRow}>
              <button
                style={styles.approveBtn}
                onClick={e => { e.stopPropagation(); handleApproveAndSend(); }}
                disabled={approving}
              >
                {approving ? 'Approving…' : 'Approve & Send Invoice'}
              </button>
              {approveMsg && (
                <span style={{ ...styles.approveMsg, color: approveMsg.ok ? '#155724' : COLORS.red }}>
                  {approveMsg.text}
                </span>
              )}
            </div>
          )}

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
                <option key={s} value={s}>{statusLabel(s)}</option>
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
  onApproved:     PropTypes.func.isRequired,
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
        admin_notes, admin_modified, change_note, addon_service_ids, created_at, updated_at,
        customers ( email, full_name, airline, phone ),
        services  ( name ),
        pets      ( name, species ),
        booking_pets ( pet_name, pets ( name, species ) ),
        booking_visits ( service_id, service_name, visit_date, shift_id, shift_label, shift_time, is_addon, unit_price, pet_count, is_quote, line_total ),
        invoices ( status, invoice_number )
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

  function handleApproved(bookingId, newStatus) {
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
    if (hideCancelled && filter === 'all' && (b.status === 'cancelled' || b.status === 'declined')) return false;
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
          Hide Cancelled / Declined
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
              onApproved={handleApproved}
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
    fontWeight: '600', fontFamily: FONTS.body,
  },
  price:       { fontFamily: FONTS.body, fontWeight: '700', color: COLORS.blue, fontSize: '0.9rem' },
  expandCaret: { fontFamily: FONTS.body, color: COLORS.lightBlue, fontSize: '0.75rem' },

  rowDetail: { borderTop: `1px solid ${COLORS.lightBlue}`, padding: '0.9rem 1.1rem', background: '#fafcff' },
  sectionLabel: {
    display: 'block', fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
  },
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

  approveRow:  { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' },
  approveBtn: {
    padding: '0.45rem 1.1rem', background: '#28A745', color: COLORS.white,
    border: 'none', borderRadius: '6px', fontFamily: FONTS.body, fontSize: '0.85rem',
    fontWeight: '600', cursor: 'pointer',
  },
  approveMsg:  { fontFamily: FONTS.body, fontSize: '0.82rem', fontWeight: '600' },

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
