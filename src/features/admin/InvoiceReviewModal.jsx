import { useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';
import { groupLineItems, fmtMoney } from '../booking/visitModel.js';

function formatMoney(value) {
  if (value == null) return '---';
  return '$' + Number(value).toFixed(2);
}

// Resolve the items to display: prefer the invoice snapshot (line_items, already
// a groupLineItems() output), else derive from the booking's booking_visits.
function resolveItems(invoice) {
  if (Array.isArray(invoice.line_items) && invoice.line_items.length > 0) {
    return invoice.line_items;
  }
  const visits = invoice.bookings?.booking_visits;
  if (Array.isArray(visits) && visits.length > 0) {
    return groupLineItems(visits);
  }
  return [];
}

function LineItemsTable({ invoice }) {
  const items = resolveItems(invoice);

  if (items.length > 0) {
    return (
      <table style={styles.lineTable}>
        <thead>
          <tr>
            <th style={{ ...styles.lineTh, textAlign: 'left' }}>Description</th>
            <th style={{ ...styles.lineTh, textAlign: 'center' }}>Qty</th>
            <th style={{ ...styles.lineTh, textAlign: 'right' }}>Unit Price</th>
            <th style={{ ...styles.lineTh, textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((li, idx) => (
            <tr key={idx}>
              <td style={styles.lineTd}>
                {li.is_addon ? <span style={{ color: COLORS.lightBlue }}>+ </span> : null}
                {li.description || li.service_name || '---'}
              </td>
              <td style={{ ...styles.lineTd, textAlign: 'center' }}>{li.qty ?? 1}</td>
              <td style={{ ...styles.lineTd, textAlign: 'right' }}>{fmtMoney(li.unit_price)}</td>
              <td style={{ ...styles.lineTd, textAlign: 'right', fontWeight: '600' }}>
                {li.is_quote ? 'Quote' : fmtMoney(li.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Fallback when no itemization is available at all.
  return (
    <table style={styles.lineTable}>
      <thead>
        <tr>
          <th style={{ ...styles.lineTh, textAlign: 'left' }}>Description</th>
          <th style={{ ...styles.lineTh, textAlign: 'center' }}>Qty</th>
          <th style={{ ...styles.lineTh, textAlign: 'right' }}>Unit Price</th>
          <th style={{ ...styles.lineTh, textAlign: 'right' }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={styles.lineTd}>{invoice.service_name || 'Pet Care Service'}</td>
          <td style={{ ...styles.lineTd, textAlign: 'center' }}>1</td>
          <td style={{ ...styles.lineTd, textAlign: 'right' }}>{formatMoney(invoice.subtotal)}</td>
          <td style={{ ...styles.lineTd, textAlign: 'right', fontWeight: '600' }}>{formatMoney(invoice.subtotal)}</td>
        </tr>
        {Number(invoice.travel_fee) > 0 && (
          <tr>
            <td style={styles.lineTd}>Travel Surcharge</td>
            <td style={{ ...styles.lineTd, textAlign: 'center' }}>1</td>
            <td style={{ ...styles.lineTd, textAlign: 'right' }}>{formatMoney(invoice.travel_fee)}</td>
            <td style={{ ...styles.lineTd, textAlign: 'right', fontWeight: '600' }}>{formatMoney(invoice.travel_fee)}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

LineItemsTable.propTypes = { invoice: PropTypes.object.isRequired };

export default function InvoiceReviewModal({ invoice, onSent, onClose }) {
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sent,      setSent]      = useState(false);

  const customerEmail = invoice.customers?.email || '---';
  const customerName  = invoice.customers?.full_name || customerEmail;

  const dateRange = invoice.booking_end_date && invoice.booking_end_date !== invoice.booking_date
    ? `${invoice.booking_date} - ${invoice.booking_end_date}`
    : (invoice.booking_date || '---');

  // Issue the invoice: mark awaiting_payment + issued_at, confirm the booking,
  // then email the customer (best-effort).
  async function handleApprove() {
    setSending(true);
    setSendError(null);

    const nowIso = new Date().toISOString();

    // 1) Invoice -> awaiting_payment, issued_at = now()
    const { data: updatedInvoice, error: invErr } = await supabase
      .from('invoices')
      .update({ status: 'awaiting_payment', issued_at: nowIso, updated_at: nowIso })
      .eq('id', invoice.id)
      .select('*, customers(email, full_name)')
      .single();

    if (invErr) {
      setSending(false);
      setSendError(invErr.message);
      return;
    }

    // 2) Linked booking -> confirmed
    const bookingId = invoice.booking_id || invoice.bookings?.id || null;
    if (bookingId) {
      const { error: bErr } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', updated_at: nowIso })
        .eq('id', bookingId);
      if (bErr) console.warn('Booking confirm failed:', bErr.message);
    }

    // 3) Email the itemized invoice (best-effort).
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('send-invoice-email', {
      body:    { invoiceId: invoice.id },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    setSending(false);

    if (error || data?.error) {
      // Invoice was already issued; surface the email failure but keep the state.
      setSendError(
        (error?.message || data?.error || 'Failed to send invoice email.') +
        ' The invoice was issued — you can resend the email later.'
      );
      onSent({ ...invoice, ...(updatedInvoice || {}), status: 'awaiting_payment', issued_at: nowIso });
      return;
    }

    setSent(true);
    onSent({ ...invoice, ...(updatedInvoice || {}), status: 'awaiting_payment', issued_at: nowIso });
  }

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>

        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Review Invoice -- {invoice.invoice_number}</h2>
          <button style={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        <div style={styles.modalBody}>

          <div style={styles.metaGrid}>
            <div style={styles.metaCol}>
              <p style={styles.metaLabel}>Customer</p>
              <p style={styles.metaValue}>{customerName}</p>
              {invoice.customers?.full_name && (
                <p style={{ ...styles.metaValue, fontSize: '0.8rem', color: COLORS.lightBlue }}>{customerEmail}</p>
              )}
            </div>
            <div style={styles.metaCol}>
              <p style={styles.metaLabel}>Service</p>
              <p style={styles.metaValue}>{invoice.service_name || '---'}</p>
            </div>
            <div style={styles.metaCol}>
              <p style={styles.metaLabel}>Pet</p>
              <p style={styles.metaValue}>{invoice.pet_name || '---'}</p>
            </div>
            <div style={styles.metaCol}>
              <p style={styles.metaLabel}>Date(s)</p>
              <p style={styles.metaValue}>{dateRange}</p>
            </div>
            {invoice.zone && (
              <div style={styles.metaCol}>
                <p style={styles.metaLabel}>Zone</p>
                <p style={styles.metaValue}>{invoice.zone}</p>
              </div>
            )}
          </div>

          <div style={styles.section}>
            <p style={styles.sectionTitle}>Line Items</p>
            <LineItemsTable invoice={invoice} />
          </div>

          <div style={styles.totalsBox}>
            {invoice.subtotal != null && (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Subtotal</span>
                <span>{formatMoney(invoice.subtotal)}</span>
              </div>
            )}
            {Number(invoice.travel_fee) > 0 && (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Travel Fee</span>
                <span>{formatMoney(invoice.travel_fee)}</span>
              </div>
            )}
            <div style={{ ...styles.totalRow, ...styles.grandTotal }}>
              <span>Total Due</span>
              <span>{formatMoney(invoice.total_amount)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div style={styles.section}>
              <p style={styles.sectionTitle}>Notes</p>
              <p style={styles.notesText}>{invoice.notes}</p>
            </div>
          )}

          <div style={styles.noticeBox}>
            <p style={styles.noticeText}>
              Clicking <strong>Issue Invoice</strong> will:
            </p>
            <ul style={styles.noticeList}>
              <li>Mark this invoice as <strong>Awaiting Payment</strong> and record the issue date</li>
              <li>Set the linked booking to <strong>Confirmed</strong></li>
              <li>Email the itemized invoice to <strong>{customerEmail}</strong> with a Pay Now link</li>
            </ul>
          </div>

          {sendError && <p style={styles.errorText}>{sendError}</p>}
          {sent      && <p style={styles.successText}>Invoice issued and emailed to {customerEmail}</p>}
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={sending}>
            {sent ? 'Close' : 'Cancel'}
          </button>
          {!sent && (
            <button style={styles.approveBtn} onClick={handleApprove} disabled={sending}>
              {sending ? 'Issuing...' : 'Issue Invoice'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

InvoiceReviewModal.propTypes = {
  invoice: PropTypes.object.isRequired,
  onSent:  PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
  },
  modal: {
    background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '640px',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.1rem 1.5rem', borderBottom: '1px solid ' + COLORS.lightBlue,
  },
  modalTitle: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1.2rem', margin: 0 },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '1.1rem',
    color: COLORS.lightBlue, cursor: 'pointer', padding: '0.2rem 0.5rem',
  },
  modalBody: { flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
    padding: '1rem 1.5rem', borderTop: '1px solid ' + COLORS.lightBlue,
  },

  metaGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem', marginBottom: '1.25rem' },
  metaCol:  { flex: '1 1 130px' },
  metaLabel: {
    fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px',
  },
  metaValue: { fontFamily: FONTS.body, fontSize: '0.875rem', color: '#000', margin: 0 },

  section: { marginBottom: '1.25rem' },
  sectionTitle: {
    fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.4rem',
  },
  notesText: { fontFamily: FONTS.body, fontSize: '0.875rem', color: '#555', fontStyle: 'italic', margin: 0 },

  lineTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '0.25rem' },
  lineTh: {
    fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '2px solid ' + COLORS.blue, paddingBottom: '4px', paddingRight: '8px',
  },
  lineTd: {
    fontFamily: FONTS.body, fontSize: '0.875rem', color: '#000',
    padding: '5px 8px 5px 0', borderBottom: '1px solid #eef1f5',
  },

  totalsBox: {
    marginLeft: 'auto', width: '220px',
    borderTop: '1px solid ' + COLORS.lightBlue,
    paddingTop: '0.5rem', marginBottom: '1.25rem',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between',
    fontFamily: FONTS.body, fontSize: '0.875rem', color: '#000', padding: '2px 0',
  },
  totalLabel: { color: COLORS.lightBlue },
  grandTotal: {
    fontWeight: '700', color: COLORS.blue,
    borderTop: '2px solid ' + COLORS.blue, paddingTop: '6px', marginTop: '4px',
  },

  noticeBox: {
    background: '#f0f6fd', border: '1px solid ' + COLORS.lightBlue,
    borderRadius: '8px', padding: '0.85rem 1rem', marginTop: '0.25rem',
  },
  noticeText: { fontFamily: FONTS.body, fontSize: '0.85rem', color: '#333', margin: '0 0 0.4rem' },
  noticeList: {
    fontFamily: FONTS.body, fontSize: '0.85rem', color: '#333',
    margin: 0, paddingLeft: '1.25rem', lineHeight: '1.7',
  },

  errorText:   { fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.red, marginTop: '0.75rem' },
  successText: { fontFamily: FONTS.body, fontSize: '0.875rem', color: '#155724', marginTop: '0.75rem', fontWeight: '600' },

  cancelBtn: {
    padding: '0.55rem 1.25rem', background: 'none', border: '1px solid ' + COLORS.lightBlue,
    borderRadius: '8px', color: COLORS.lightBlue, fontFamily: FONTS.body, cursor: 'pointer',
  },
  approveBtn: {
    padding: '0.55rem 1.5rem', background: COLORS.blue, border: 'none',
    borderRadius: '8px', color: '#fff', fontFamily: FONTS.body,
    fontWeight: '600', cursor: 'pointer',
  },
};
