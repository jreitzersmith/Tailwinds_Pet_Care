import { useState } from 'react';
import PropTypes from 'prop-types';
import { COLORS, FONTS } from '../../constants.jsx';
import { PRICING_ZONES } from '../serviceArea/serviceAreaData.js';

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

function fmtShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isWithin24h(dateStr) {
  const bookingStart = new Date(dateStr + 'T00:00:00');
  const hoursUntil = (bookingStart - new Date()) / (1000 * 60 * 60);
  return hoursUntil >= 0 && hoursUntil < 24;
}

function fmt12h(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtMoney(n) {
  return '$' + Number(n).toFixed(2).replace(/\.00$/, '');
}

// Look up per-trip fee for a zone label (e.g. "Zone 5" → 15)
function getZoneFee(zoneLabel) {
  if (!zoneLabel) return null;
  const z = PRICING_ZONES.find(p => p.label === zoneLabel);
  return z && z.fee > 0 ? z.fee : null;
}

export default function BookingCard({ booking, canCancel, canEdit, canCopy, allServices, onCancel, onFullEdit, onCopy }) {
  const [confirming,      setConfirming]      = useState(false);
  const [cancelling,      setCancelling]      = useState(false);
  const [showLateWarning, setShowLateWarning] = useState(false);
  // Upcoming bookings start collapsed; past bookings always expanded
  const [expanded, setExpanded] = useState(!canEdit);

  const statusColor = STATUS_COLORS[booking.status] ?? COLORS.black;
  const endDate     = booking.booking_end_date && booking.booking_end_date !== booking.booking_date
    ? booking.booking_end_date : null;
  const within24h   = isWithin24h(booking.booking_date);
  const time12h     = fmt12h(booking.booking_time);

  // ── Pricing calculations ───────────────────────────────────────────────
  const primarySvc  = (allServices || []).find(s => s.id === booking.service_id);
  const primaryUnit = primarySvc?.base_price != null ? Number(primarySvc.base_price) : null;
  const primaryQty  = primaryUnit > 0
    ? Math.round(Number(booking.base_price || 0) / primaryUnit)
    : null;

  const addonLines = (booking.addon_service_ids || []).map(id => {
    const svc  = (allServices || []).find(s => s.id === id);
    const unit = svc?.base_price != null ? Number(svc.base_price) : null;
    // Addon qty mirrors primary qty (same slot grid assumption)
    const qty  = unit != null && primaryQty != null ? primaryQty : null;
    const total = unit != null && qty != null ? unit * qty : null;
    return { name: svc?.name ?? '(add-on)', unit, qty, total };
  });

  const travelTotal = Number(booking.travel_fee || 0);
  const zoneFee     = getZoneFee(booking.zone);
  const numTrips    = zoneFee && travelTotal > 0 ? Math.round(travelTotal / zoneFee) : null;

  // ── Helpers ────────────────────────────────────────────────────────────
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

  const dateDisplay = endDate
    ? `${fmtShort(booking.booking_date)} – ${fmtShort(endDate)}`
    : formatDate(booking.booking_date);

  return (
    <div style={styles.card}>
      {/* ── Always-visible header row ── */}
      <div style={styles.header} onClick={() => canEdit && setExpanded(v => !v)}>
        <div style={styles.headerLeft}>
          <span style={styles.serviceName}>{booking.services?.name ?? '—'}</span>
          {booking.pets?.name && (
            <span style={styles.petChip}>{booking.pets.name}</span>
          )}
        </div>
        <div style={styles.headerRight}>
          <span style={{ ...styles.status, color: statusColor }}>
            {booking.status.replace(/_/g, ' ')}
          </span>
          <span style={styles.headerTotal}>${Number(booking.total_price).toFixed(2)}</span>
          {canEdit && (
            <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>

      {/* ── Date line (always visible) ── */}
      <div style={styles.dateLine}>
        <span style={styles.dateText}>{dateDisplay}</span>
        {time12h && <span style={styles.timeText}> · {time12h}</span>}
      </div>

      {/* ── Expanded detail section ── */}
      {expanded && (
        <div style={styles.expandedBody}>
          <div style={styles.divider} />

          {/* Itemized breakdown */}
          <div style={styles.itemList}>
            {/* Primary service */}
            <div style={styles.itemRow}>
              <span style={styles.itemName}>{booking.services?.name ?? '—'}</span>
              <span style={styles.itemPrice}>
                {primaryQty != null && primaryUnit != null
                  ? `${primaryQty}× ${fmtMoney(primaryUnit)} = ${fmtMoney(primaryQty * primaryUnit)}`
                  : fmtMoney(booking.base_price ?? 0)
                }
              </span>
            </div>

            {/* Add-ons */}
            {addonLines.map((a, i) => (
              <div key={i} style={styles.itemRow}>
                <span style={styles.addonName}>+ {a.name}</span>
                <span style={styles.itemPrice}>
                  {a.qty != null && a.unit != null
                    ? `${a.qty}× ${fmtMoney(a.unit)} = ${fmtMoney(a.total)}`
                    : a.unit != null
                      ? `${fmtMoney(a.unit)}/visit`
                      : 'included'
                  }
                </span>
              </div>
            ))}

            {/* Travel fee */}
            {travelTotal > 0 && (
              <div style={styles.itemRow}>
                <span style={styles.addonName}>
                  Travel Surcharge{booking.zone ? ` (${booking.zone})` : ''}
                </span>
                <span style={styles.itemPrice}>
                  {numTrips != null && zoneFee != null
                    ? `${numTrips}× ${fmtMoney(zoneFee)}/trip = ${fmtMoney(travelTotal)}`
                    : `+${fmtMoney(travelTotal)}`
                  }
                </span>
              </div>
            )}

            <div style={styles.totalDivider} />

            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Total</span>
              <span style={styles.totalValue}>${Number(booking.total_price).toFixed(2)}</span>
            </div>
          </div>

          {/* Special instructions */}
          {booking.special_instructions && (
            <p style={styles.notes}><em>Notes:</em> {booking.special_instructions}</p>
          )}

          {/* Late-change warning panel */}
          {showLateWarning && (
            <div style={styles.warningPanel}>
              <p style={styles.warningText}>
                {'⚠️'} This booking starts within 24 hours. Changing the schedule at this time
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
                  {'⚠️'} Cancelling within 24 hours of the booking may result in a
                  {' '}<strong>late cancellation fee of $20</strong>.
                </p>
              )}
              <div style={styles.confirmRow}>
                <span style={styles.confirmText}>Cancel this booking?</span>
                <button style={styles.confirmYes} onClick={confirmCancel} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                </button>
                <button style={styles.confirmNo} onClick={() => setConfirming(false)}>Keep it</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past booking actions (outside expanded guard) */}
      {!canEdit && canCopy && (
        <div style={{ ...styles.actionRow, marginTop: '0.5rem' }}>
          <button style={styles.copyBtn} onClick={() => onCopy(booking)}>Copy to New Dates</button>
        </div>
      )}
    </div>
  );
}

BookingCard.propTypes = {
  booking:      PropTypes.object.isRequired,
  canCancel:    PropTypes.bool,
  canEdit:      PropTypes.bool,
  canCopy:      PropTypes.bool,
  allServices:  PropTypes.array,
  onCancel:     PropTypes.func.isRequired,
  onFullEdit:   PropTypes.func.isRequired,
  onCopy:       PropTypes.func.isRequired,
};

const styles = {
  card: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px',
    padding: '0.85rem 1.1rem', background: COLORS.white,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    cursor: 'pointer', userSelect: 'none',
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
  },
  headerRight: {
    display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0,
  },
  serviceName: {
    fontFamily: FONTS.header, color: COLORS.black, fontSize: '0.97rem', fontWeight: '600',
  },
  petChip: {
    fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.lightBlue,
    background: '#eef4fb', borderRadius: '999px', padding: '0.1rem 0.55rem',
  },
  status: {
    fontFamily: FONTS.body, fontSize: '0.75rem', fontWeight: '600',
    textTransform: 'capitalize', whiteSpace: 'nowrap',
  },
  headerTotal: {
    fontFamily: FONTS.body, fontSize: '0.9rem', fontWeight: '700', color: COLORS.blue,
  },
  chevron: {
    fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.lightBlue,
  },
  dateLine: {
    marginTop: '0.3rem',
  },
  dateText: {
    fontFamily: FONTS.body, fontSize: '0.83rem', color: '#666',
  },
  timeText: {
    fontFamily: FONTS.body, fontSize: '0.83rem', color: '#888',
  },
  expandedBody: {
    marginTop: '0.5rem',
  },
  divider: {
    borderTop: `1px solid ${COLORS.lightBlue}`, margin: '0.6rem 0',
  },
  itemList: {
    display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem',
  },
  itemRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem',
  },
  itemName: {
    fontFamily: FONTS.body, fontSize: '0.88rem', color: COLORS.black, fontWeight: '600',
    flexShrink: 0,
  },
  addonName: {
    fontFamily: FONTS.body, fontSize: '0.85rem', color: '#555', paddingLeft: '0.75rem',
  },
  itemPrice: {
    fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.black,
    textAlign: 'right', whiteSpace: 'nowrap',
  },
  totalDivider: {
    borderTop: `1px solid #ddd`, margin: '0.35rem 0',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
  },
  totalLabel: {
    fontFamily: FONTS.body, fontSize: '0.9rem', fontWeight: '700', color: COLORS.black,
  },
  totalValue: {
    fontFamily: FONTS.body, fontSize: '0.95rem', fontWeight: '700', color: COLORS.blue,
  },
  notes: {
    fontFamily: FONTS.body, fontSize: '0.83rem', color: '#555',
    background: '#f9f9f9', borderRadius: '6px',
    padding: '0.4rem 0.65rem', marginBottom: '0.65rem',
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
  actionRow:  { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' },
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
