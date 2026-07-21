import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS, CONTACT, BUSINESS } from '../../constants.jsx';
import { groupLineItems } from '../booking/visitModel.js';
import PayNowButton from '../payments/PayNowButton.jsx';

const STATUS = {
  draft:                   { label: 'Pending Tailwinds Review', bg: '#FFF3CD', color: '#856404' },
  pending_customer_review: { label: 'Pending Your Approval',    bg: '#CCE5FF', color: '#004085' },
  awaiting_payment:        { label: 'Awaiting Payment',         bg: '#FFE5B4', color: '#8a4e00' },
  paid:                    { label: 'Paid',                     bg: '#D4EDDA', color: '#155724' },
  void:                    { label: 'Void',                     bg: '#E2E3E5', color: '#383d41' },
};

// Statuses that show itemized details to the customer.
const SHOW_ITEMS_STATUSES = new Set(['pending_customer_review', 'awaiting_payment', 'paid']);

function statusBadge(status) {
  return STATUS[status] || { label: status, bg: '#eee', color: '#333' };
}

function fmt(val) {
  if (val == null) return '---';
  return '$' + Number(val).toFixed(2);
}

// Resolve the display rows for an invoice: prefer the stored line_items
// snapshot; otherwise fall back to grouping the joined booking_visits.
function resolveLineItems(invoice) {
  if (invoice.line_items && Array.isArray(invoice.line_items) && invoice.line_items.length) {
    return invoice.line_items;
  }
  const visits = invoice.bookings?.booking_visits;
  if (visits && visits.length) return groupLineItems(visits);
  return [];
}

// ── PDF export ────────────────────────────────────────────────────────────────
function openInvoicePDF(invoice, userEmail) {
  const cfg       = statusBadge(invoice.status);
  const dateRange = invoice.booking_end_date && invoice.booking_end_date !== invoice.booking_date
    ? invoice.booking_date + ' - ' + invoice.booking_end_date
    : (invoice.booking_date || '---');

  const items = resolveLineItems(invoice);
  const lineItemsHTML = (() => {
    if (items.length) {
      return items.map(li =>
        '<tr>' +
        '<td style="padding:6px 0;border-bottom:1px solid #eee;">' + (li.description || li.service_name || '') + '</td>' +
        '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;">' + (li.qty ?? 1) + '</td>' +
        '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">' + (li.unit_price != null ? '$' + Number(li.unit_price).toFixed(2) : '---') + '</td>' +
        '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">' + (li.total != null ? '$' + Number(li.total).toFixed(2) : '---') + '</td>' +
        '</tr>'
      ).join('');
    }
    return (
      '<tr>' +
      '<td style="padding:6px 0;border-bottom:1px solid #eee;">' + (invoice.service_name || 'Pet Care Service') + '</td>' +
      '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;">1</td>' +
      '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">' + (invoice.subtotal != null ? '$' + Number(invoice.subtotal).toFixed(2) : '---') + '</td>' +
      '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">' + (invoice.subtotal != null ? '$' + Number(invoice.subtotal).toFixed(2) : '---') + '</td>' +
      '</tr>'
    );
  })();

  const travelHTML = Number(invoice.travel_fee) > 0
    ? '<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">Travel Surcharge</td><td style="padding:6px 0;text-align:center;">1</td><td style="padding:6px 0;text-align:right;">$' + Number(invoice.travel_fee).toFixed(2) + '</td><td style="padding:6px 0;text-align:right;">$' + Number(invoice.travel_fee).toFixed(2) + '</td></tr>'
    : '';

  const win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Invoice ' + invoice.invoice_number + '</title>' +
'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:\'Lucida Sans Unicode\',\'Lucida Grande\',Arial,sans-serif;color:#222;padding:40px;max-width:720px;margin:0 auto}' +
'h1{font-family:\'Lucida Bright\',Georgia,serif;color:#68AFE6;font-size:2rem;margin-bottom:4px}.sub{color:#A0AFC5;font-size:.9rem;margin-bottom:24px}' +
'.grid{display:flex;justify-content:space-between;margin-bottom:28px;gap:20px}.col{flex:1}.col h3{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:#A0AFC5;margin-bottom:6px}' +
'.col p{font-size:.9rem;line-height:1.6}.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:.8rem;font-weight:600;background:' + cfg.bg + ';color:' + cfg.color + ';margin-bottom:24px}' +
'table{width:100%;border-collapse:collapse;margin-bottom:20px}thead th{text-align:left;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:#A0AFC5;border-bottom:2px solid #68AFE6;padding-bottom:6px}' +
'thead th:nth-child(2){text-align:center}thead th:nth-child(3),thead th:nth-child(4){text-align:right}' +
'.totals{margin-left:auto;width:240px}.totals tr td:first-child{color:#555;font-size:.9rem;padding:4px 0}.totals tr td:last-child{text-align:right;font-size:.9rem;padding:4px 0}' +
'.grand td{font-weight:700;font-size:1.05rem;color:#68AFE6;border-top:2px solid #68AFE6;padding-top:8px!important}' +
'.footer{margin-top:36px;padding-top:16px;border-top:1px solid #eee;font-size:.8rem;color:#A0AFC5;text-align:center}' +
'@media print{body{padding:20px}}</style></head><body>' +
'<h1>' + BUSINESS.name + '</h1><p class="sub">' + CONTACT.address + ' | ' + CONTACT.phone + ' | ' + CONTACT.email + '</p>' +
'<div class="grid">' +
'<div class="col"><h3>Invoice</h3><p><strong>' + invoice.invoice_number + '</strong></p><p>Date: ' + new Date(invoice.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) + '</p></div>' +
'<div class="col"><h3>Billed To</h3><p>' + (userEmail || '---') + '</p></div>' +
'<div class="col"><h3>Service Details</h3><p>Pet: ' + (invoice.pet_name || '---') + '</p><p>Date(s): ' + dateRange + '</p>' + (invoice.zone ? '<p>Zone: ' + invoice.zone + '</p>' : '') + '</div>' +
'</div>' +
'<span class="badge">' + cfg.label + '</span>' +
'<table><thead><tr><th>Description</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Amount</th></tr></thead><tbody>' + lineItemsHTML + travelHTML + '</tbody></table>' +
'<table class="totals"><tbody>' +
(invoice.subtotal != null ? '<tr><td>Subtotal</td><td>$' + Number(invoice.subtotal).toFixed(2) + '</td></tr>' : '') +
(Number(invoice.travel_fee) > 0 ? '<tr><td>Travel Fee</td><td>$' + Number(invoice.travel_fee).toFixed(2) + '</td></tr>' : '') +
'<tr class="grand"><td>Total</td><td>' + (invoice.total_amount != null ? '$' + Number(invoice.total_amount).toFixed(2) : 'Quote Pending') + '</td></tr>' +
'</tbody></table>' +
(invoice.notes ? '<p style="margin-top:16px;font-size:.875rem;color:#555;"><strong>Notes:</strong> ' + invoice.notes + '</p>' : '') +
'<div class="footer"><p>Thank you for choosing ' + BUSINESS.name + '! Questions? Reach us at ' + CONTACT.email + ' or ' + CONTACT.phone + '.</p></div>' +
'<script>window.onload = () => window.print();<\/script></body></html>');
  win.document.close();
}

// ── Inline itemized totals ────────────────────────────────────────────────────
function LineTotals({ invoice }) {
  const travelFee = Number(invoice.travel_fee) || 0;
  const showTravel = travelFee > 0;

  return (
    <div style={styles.lineTotals}>
      {showTravel && (
        <>
          <div style={styles.lineTotalRow}>
            <span style={styles.lineTotalLabel}>Subtotal</span>
            <span>{fmt(invoice.subtotal)}</span>
          </div>
          <div style={styles.lineTotalRow}>
            <span style={styles.lineTotalLabel}>Travel Fee</span>
            <span>{fmt(travelFee)}</span>
          </div>
        </>
      )}
      <div style={{ ...styles.lineTotalRow, ...styles.lineTotalGrand }}>
        <span>Total</span>
        <span>{invoice.total_amount != null ? fmt(invoice.total_amount) : 'Quote Pending'}</span>
      </div>
    </div>
  );
}

// ── Inline itemized line items table ──────────────────────────────────────────
function LineItemsTable({ invoice, heading }) {
  const travelFee = Number(invoice.travel_fee) || 0;
  const items = resolveLineItems(invoice);

  return (
    <div style={styles.lineSection}>
      <p style={styles.lineSectionTitle}>{heading || 'Invoice Details'}</p>
      <table style={styles.lineTable}>
        <thead>
          <tr>
            <th style={{ ...styles.lineTh, textAlign: 'left' }}>Description</th>
            <th style={{ ...styles.lineTh, textAlign: 'center' }}>Qty</th>
            <th style={{ ...styles.lineTh, textAlign: 'right' }}>Unit</th>
            <th style={{ ...styles.lineTh, textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((li, i) => (
            <tr key={i}>
              <td style={styles.lineTd}>{li.description || li.service_name || '---'}</td>
              <td style={{ ...styles.lineTd, textAlign: 'center' }}>{li.qty ?? 1}</td>
              <td style={{ ...styles.lineTd, textAlign: 'right' }}>
                {li.unit_price != null ? fmt(li.unit_price) : '---'}
              </td>
              <td style={{ ...styles.lineTd, textAlign: 'right', fontWeight: '600' }}>
                {li.is_quote ? 'Quote' : (li.total != null ? fmt(li.total) : '---')}
              </td>
            </tr>
          ))}
          {travelFee > 0 && (
            <tr>
              <td style={styles.lineTd}>Travel Surcharge</td>
              <td style={{ ...styles.lineTd, textAlign: 'center' }}>1</td>
              <td style={{ ...styles.lineTd, textAlign: 'right' }}>{fmt(travelFee)}</td>
              <td style={{ ...styles.lineTd, textAlign: 'right', fontWeight: '600' }}>{fmt(travelFee)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <LineTotals invoice={invoice} />
    </div>
  );
}

// ── Invoice card ──────────────────────────────────────────────────────────────
function InvoiceCard({ invoice, userEmail, onApprove, onDecline, reload, highlight }) {
  const cfg = statusBadge(invoice.status);
  const dateRange = invoice.booking_end_date && invoice.booking_end_date !== invoice.booking_date
    ? invoice.booking_date + ' - ' + invoice.booking_end_date
    : (invoice.booking_date || '---');

  const amountDisplay = invoice.total_amount != null ? fmt(invoice.total_amount) : 'Quote pending';

  const isProposed   = invoice.status === 'pending_customer_review';
  const isAwaiting    = invoice.status === 'awaiting_payment';
  const showItemized = SHOW_ITEMS_STATUSES.has(invoice.status);

  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    await onApprove(invoice.booking_id);
    setBusy(false);
  }
  async function decline() {
    setBusy(true);
    await onDecline(invoice.booking_id);
    setBusy(false);
  }

  return (
    <div id={'invoice-' + invoice.id} style={{ ...styles.card, ...(isAwaiting ? styles.cardApproved : {}), ...(highlight ? styles.cardFocused : {}) }}>
      <div style={styles.cardTop}>
        <div>
          <span style={styles.invoiceNum}>{invoice.invoice_number}</span>
          <span style={{ ...styles.badge, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        </div>
        <div style={styles.cardActions}>
          {isAwaiting && (
            <PayNowButton invoice={invoice} onPaid={reload} />
          )}
          <button style={styles.pdfBtn} onClick={() => openInvoicePDF(invoice, userEmail)}>
            PDF
          </button>
        </div>
      </div>

      <div style={styles.cardBody}>
        <div style={styles.detail}>
          <span style={styles.detailLabel}>Service</span>
          <span style={styles.detailValue}>{invoice.service_name || '---'}</span>
        </div>
        <div style={styles.detail}>
          <span style={styles.detailLabel}>Pet</span>
          <span style={styles.detailValue}>{invoice.pet_name || '---'}</span>
        </div>
        <div style={styles.detail}>
          <span style={styles.detailLabel}>Date(s)</span>
          <span style={styles.detailValue}>{dateRange}</span>
        </div>
        <div style={styles.detail}>
          <span style={styles.detailLabel}>Total</span>
          <span style={{ ...styles.detailValue, fontWeight: '700', color: COLORS.blue }}>{amountDisplay}</span>
        </div>
      </div>

      {showItemized && (
        <LineItemsTable
          invoice={invoice}
          heading={isProposed ? 'Proposed changes — please review' : 'Invoice Details'}
        />
      )}

      {isProposed && (
        <div style={styles.proposedBanner}>
          <span>
            Tailwinds proposed changes to this invoice. Please review the items above.
          </span>
          <div style={styles.proposedBtns}>
            <button style={styles.approveBtn} onClick={approve} disabled={busy}>
              {busy ? 'Working…' : 'Approve'}
            </button>
            <button style={styles.declineBtn} onClick={decline} disabled={busy}>
              Decline
            </button>
          </div>
        </div>
      )}

      {isAwaiting && (
        <div style={styles.approvedBanner}>
          <span style={styles.approvedIcon}>✓</span>
          <span>
            Your invoice is ready for payment. Use <strong>Pay Now</strong> above, or contact us at{' '}
            <a href={'mailto:' + CONTACT.email} style={styles.link}>{CONTACT.email}</a>.
          </span>
        </div>
      )}

      {invoice.status === 'paid' && invoice.paid_at && (
        <p style={styles.paidNote}>
          Paid on {new Date(invoice.paid_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}
        </p>
      )}

      {invoice.notes && (
        <p style={styles.notes}><strong>Note:</strong> {invoice.notes}</p>
      )}
    </div>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────
export default function InvoicesList({ focusInvoiceId = null }) {
  const { user } = useAuth();
  const [invoices,     setInvoices]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [filter,       setFilter]       = useState('all');
  const [reloadKey,    setReloadKey]    = useState(0);

  function reload() { setReloadKey(k => k + 1); }

  // Scroll to and highlight an invoice when deep-linked from a booking.
  useEffect(() => {
    if (!focusInvoiceId || loading) return;
    const el = document.getElementById('invoice-' + focusInvoiceId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusInvoiceId, loading, invoices]);

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('invoices')
        .select('*, bookings(*, services(*), booking_visits(*), booking_pets(pet_name))')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.in('status', ['draft', 'pending_customer_review', 'awaiting_payment']);
      } else if (filter === 'paid') {
        query = query.eq('status', 'paid');
      } else {
        // Default (all) — hide void invoices.
        query = query.neq('status', 'void');
      }

      const { data, error: err } = await query;
      if (err) setError(err.message);
      else setInvoices(data || []);
      setLoading(false);
    }
    fetchInvoices();
  }, [user.id, filter, reloadKey]);

  async function handleApprove(bookingId) {
    if (!bookingId) return;
    await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);
    await supabase
      .from('invoices')
      .update({ status: 'awaiting_payment', issued_at: new Date().toISOString() })
      .eq('booking_id', bookingId);
    reload();
  }

  async function handleDecline(bookingId) {
    if (!bookingId) return;
    await supabase.from('bookings').update({ status: 'declined' }).eq('id', bookingId);
    await supabase.from('invoices').update({ status: 'void' }).eq('booking_id', bookingId);
    reload();
  }

  const filterOptions = [
    { key: 'all',     label: 'All' },
    { key: 'pending', label: 'Pending / In Progress' },
    { key: 'paid',    label: 'Paid' },
  ];

  return (
    <div>
      <div style={styles.filterRow}>
        {filterOptions.map(opt => (
          <button
            key={opt.key}
            style={{ ...styles.filterBtn, ...(filter === opt.key ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(opt.key)}>
            {opt.label}
          </button>
        ))}
      </div>

      {loading && <p style={styles.msg}>Loading invoices...</p>}
      {error   && <p style={styles.err}>{error}</p>}

      {!loading && !error && invoices.length === 0 && (
        <p style={styles.empty}>
          {filter === 'paid' ? 'No paid invoices yet.' : 'No invoices found.'}
        </p>
      )}

      {!loading && !error && invoices.length > 0 && (
        <div style={styles.list}>
          {invoices.map(inv => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              userEmail={user?.email}
              onApprove={handleApprove}
              onDecline={handleDecline}
              reload={reload}
              highlight={inv.id === focusInvoiceId}
            />
          ))}
        </div>
      )}

      <p style={styles.helpNote}>
        Questions about an invoice? Contact us at{' '}
        <a href={'mailto:' + CONTACT.email} style={styles.link}>{CONTACT.email}</a>{' '}
        or {CONTACT.phone}.
      </p>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  cardFocused: { boxShadow: '0 0 0 3px ' + COLORS.blue, transition: 'box-shadow 0.3s' },
  filterRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  filterBtn: {
    padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid ' + COLORS.lightBlue,
    background: 'none', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue, cursor: 'pointer',
  },
  filterBtnActive: { background: COLORS.blue, color: COLORS.white, borderColor: COLORS.blue, fontWeight: '600' },
  list:  { display: 'flex', flexDirection: 'column', gap: '1rem' },
  msg:   { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  err:   { fontFamily: FONTS.body, color: COLORS.red, padding: '1rem' },
  empty: { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },

  card: {
    border: '1px solid ' + COLORS.lightBlue, borderRadius: '10px',
    padding: '1rem 1.25rem', background: '#fff',
  },
  cardApproved: { borderColor: '#28A745', boxShadow: '0 0 0 2px rgba(40,167,69,0.12)' },
  cardTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem',
  },
  invoiceNum: { fontFamily: FONTS.header, fontSize: '1rem', color: COLORS.blue, fontWeight: '600', marginRight: '0.75rem' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600', fontFamily: FONTS.body },
  cardActions: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  pdfBtn: {
    padding: '0.35rem 0.9rem', background: 'none', border: '1px solid ' + COLORS.blue,
    borderRadius: '6px', color: COLORS.blue, fontFamily: FONTS.body, fontSize: '0.82rem', cursor: 'pointer',
  },
  cardBody: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' },
  detail: { display: 'flex', flexDirection: 'column' },
  detailLabel: { fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' },
  detailValue: { fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.black },

  // Itemized line items
  lineSection: {
    marginTop: '1rem', borderTop: '1px solid #eef1f5', paddingTop: '0.75rem',
  },
  lineSectionTitle: {
    fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
  },
  lineTable: { width: '100%', borderCollapse: 'collapse', fontFamily: FONTS.body, fontSize: '0.84rem' },
  lineTh: {
    fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em',
    color: COLORS.lightBlue, borderBottom: '1px solid ' + COLORS.lightBlue,
    paddingBottom: '5px', paddingTop: '2px', fontWeight: '600',
  },
  lineTd: {
    padding: '5px 0', borderBottom: '1px solid #f0f2f5',
    color: COLORS.black, fontFamily: FONTS.body, fontSize: '0.84rem',
  },
  lineTotals: { marginTop: '0.6rem', marginLeft: 'auto', width: '220px' },
  lineTotalRow: {
    display: 'flex', justifyContent: 'space-between',
    fontFamily: FONTS.body, fontSize: '0.85rem', padding: '2px 0',
  },
  lineTotalLabel: { color: COLORS.lightBlue },
  lineTotalGrand: {
    fontWeight: '700', color: COLORS.blue,
    borderTop: '1px solid ' + COLORS.lightBlue,
    paddingTop: '5px', marginTop: '3px',
  },

  proposedBanner: {
    marginTop: '0.75rem', padding: '0.65rem 0.9rem',
    background: '#eef5ff', border: '1px solid #99c2ff', borderRadius: '8px',
    fontFamily: FONTS.body, fontSize: '0.84rem', color: '#004085',
    display: 'flex', flexDirection: 'column', gap: '0.6rem',
  },
  proposedBtns: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' },
  approveBtn: {
    padding: '0.4rem 1rem', background: '#28A745', color: '#fff', border: 'none',
    borderRadius: '6px', fontFamily: FONTS.body, fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
  },
  declineBtn: {
    padding: '0.4rem 1rem', background: '#fff', color: COLORS.red,
    border: '1px solid ' + COLORS.red, borderRadius: '6px',
    fontFamily: FONTS.body, fontSize: '0.85rem', cursor: 'pointer',
  },

  approvedBanner: {
    marginTop: '0.75rem', padding: '0.65rem 0.9rem',
    background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px',
    fontFamily: FONTS.body, fontSize: '0.84rem', color: '#166534',
    display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
  },
  approvedIcon: { fontWeight: '700', flexShrink: 0 },
  paidNote: { marginTop: '0.6rem', fontFamily: FONTS.body, fontSize: '0.82rem', color: '#155724', fontStyle: 'italic' },
  notes:    { marginTop: '0.6rem', fontFamily: FONTS.body, fontSize: '0.82rem', color: '#555' },
  helpNote: { marginTop: '2rem', fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.lightBlue, textAlign: 'center' },
  link: { color: COLORS.blue },
};
