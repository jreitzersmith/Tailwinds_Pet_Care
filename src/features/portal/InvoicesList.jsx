import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS, CONTACT, BUSINESS } from '../../constants.jsx';

const STATUS = {
  pending_company_review:  { label: 'Pending Tailwinds Review', bg: '#FFF3CD', color: '#856404' },
  pending_customer_review: { label: 'Pending Your Review',      bg: '#CCE5FF', color: '#004085' },
  invoice_approved:        { label: 'Invoice Approved',         bg: '#D4EDDA', color: '#155724' },
  awaiting_payment:        { label: 'Awaiting Payment',         bg: '#FFE5B4', color: '#8a4e00' },
  paid:                    { label: 'Paid',                     bg: '#D4EDDA', color: '#155724' },
};

function statusBadge(status) {
  return STATUS[status] || { label: status, bg: '#eee', color: '#333' };
}

function fmt(val) {
  if (val == null) return '---';
  return '$' + Number(val).toFixed(2);
}

// ── Payment modal ─────────────────────────────────────────────────────────────
function PaymentModal({ invoice, onClose }) {
  const amountDisplay = invoice.total_amount != null ? fmt(invoice.total_amount) : 'See invoice';

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Pay Invoice {invoice.invoice_number}</h2>
          <button style={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.amountBox}>
            <span style={styles.amountLabel}>Amount Due</span>
            <span style={styles.amountValue}>{amountDisplay}</span>
          </div>

          <p style={styles.payIntro}>
            Choose your preferred payment method below. Online card payment is coming soon — in the
            meantime, please use one of the options listed here or contact us to arrange payment.
          </p>

          {/* Phase 3 placeholder — Square and PayPal will mount here */}
          <div style={styles.methodList}>
            <div style={styles.method}>
              <span style={styles.methodIcon}>💵</span>
              <div>
                <p style={styles.methodName}>Cash</p>
                <p style={styles.methodDesc}>Pay in person at time of service.</p>
              </div>
            </div>
            <div style={styles.method}>
              <span style={styles.methodIcon}>📬</span>
              <div>
                <p style={styles.methodName}>Check</p>
                <p style={styles.methodDesc}>
                  Payable to <strong>Tailwinds Pet Care, LLC</strong>.
                  Mail to 2500 South Blvd, Dallas, TX 75215.
                </p>
              </div>
            </div>
            <div style={styles.method}>
              <span style={styles.methodIcon}>📱</span>
              <div>
                <p style={styles.methodName}>Zelle / Venmo</p>
                <p style={styles.methodDesc}>
                  Contact us for details:{' '}
                  <a href={'mailto:' + CONTACT.email} style={styles.link}>{CONTACT.email}</a>{' '}
                  or {CONTACT.phone}.
                </p>
              </div>
            </div>
          </div>

          <p style={styles.payNote}>
            Questions? Email{' '}
            <a href={'mailto:' + CONTACT.email} style={styles.link}>{CONTACT.email}</a>{' '}
            or call {CONTACT.phone} and we'll be happy to help.
          </p>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function openInvoicePDF(invoice, userEmail) {
  const cfg       = statusBadge(invoice.status);
  const dateRange = invoice.booking_end_date && invoice.booking_end_date !== invoice.booking_date
    ? invoice.booking_date + ' - ' + invoice.booking_end_date
    : (invoice.booking_date || '---');

  const lineItemsHTML = (() => {
    if (invoice.line_items && Array.isArray(invoice.line_items) && invoice.line_items.length) {
      return invoice.line_items.map(li =>
        '<tr>' +
        '<td style="padding:6px 0;border-bottom:1px solid #eee;">' + (li.description || '') + '</td>' +
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
      '</tr>' +
      (Number(invoice.travel_fee) > 0
        ? '<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">Travel Surcharge</td><td style="padding:6px 0;text-align:center;">1</td><td style="padding:6px 0;text-align:right;">$' + Number(invoice.travel_fee).toFixed(2) + '</td><td style="padding:6px 0;text-align:right;">$' + Number(invoice.travel_fee).toFixed(2) + '</td></tr>'
        : '')
    );
  })();

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
'<table><thead><tr><th>Description</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Amount</th></tr></thead><tbody>' + lineItemsHTML + '</tbody></table>' +
'<table class="totals"><tbody>' +
(invoice.subtotal != null ? '<tr><td>Subtotal</td><td>$' + Number(invoice.subtotal).toFixed(2) + '</td></tr>' : '') +
(Number(invoice.travel_fee) > 0 ? '<tr><td>Travel Fee</td><td>$' + Number(invoice.travel_fee).toFixed(2) + '</td></tr>' : '') +
'<tr class="grand"><td>Total</td><td>' + (invoice.total_amount != null ? '$' + Number(invoice.total_amount).toFixed(2) : invoice.has_custom_items ? 'Quote Pending' : '---') + '</td></tr>' +
'</tbody></table>' +
(invoice.notes ? '<p style="margin-top:16px;font-size:.875rem;color:#555;"><strong>Notes:</strong> ' + invoice.notes + '</p>' : '') +
'<div class="footer"><p>Thank you for choosing ' + BUSINESS.name + '! Questions? Reach us at ' + CONTACT.email + ' or ' + CONTACT.phone + '.</p></div>' +
'<script>window.onload = () => window.print();<\/script></body></html>');
  win.document.close();
}

// ── Invoice card ──────────────────────────────────────────────────────────────
function InvoiceCard({ invoice, userEmail, onPay }) {
  const cfg = statusBadge(invoice.status);
  const dateRange = invoice.booking_end_date && invoice.booking_end_date !== invoice.booking_date
    ? invoice.booking_date + ' - ' + invoice.booking_end_date
    : (invoice.booking_date || '---');

  const amountDisplay = invoice.total_amount != null
    ? fmt(invoice.total_amount)
    : invoice.has_custom_items ? 'Quote pending' : '---';

  const isApproved = invoice.status === 'invoice_approved';

  return (
    <div style={{ ...styles.card, ...(isApproved ? styles.cardApproved : {}) }}>
      <div style={styles.cardTop}>
        <div>
          <span style={styles.invoiceNum}>{invoice.invoice_number}</span>
          <span style={{ ...styles.badge, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        </div>
        <div style={styles.cardActions}>
          {isApproved && (
            <button style={styles.payBtn} onClick={() => onPay(invoice)}>
              Pay Now
            </button>
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

      {isApproved && (
        <div style={styles.approvedBanner}>
          <span style={styles.approvedIcon}>✓</span>
          <span>
            Your invoice has been approved and is ready for payment.{' '}
            <button style={styles.approvedPayLink} onClick={() => onPay(invoice)}>
              Click here to pay
            </button>
            {' '}or contact us at{' '}
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
export default function InvoicesList() {
  const { user } = useAuth();
  const [invoices,    setInvoices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [filter,      setFilter]      = useState('all');
  const [payTarget,   setPayTarget]   = useState(null);

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.in('status', ['pending_company_review', 'pending_customer_review', 'invoice_approved', 'awaiting_payment']);
      } else if (filter === 'paid') {
        query = query.eq('status', 'paid');
      }

      const { data, error: err } = await query;
      if (err) setError(err.message);
      else setInvoices(data || []);
      setLoading(false);
    }
    fetchInvoices();
  }, [user.id, filter]);

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
              onPay={setPayTarget}
            />
          ))}
        </div>
      )}

      <p style={styles.helpNote}>
        Questions about an invoice? Contact us at{' '}
        <a href={'mailto:' + CONTACT.email} style={styles.link}>{CONTACT.email}</a>{' '}
        or {CONTACT.phone}.
      </p>

      {payTarget && (
        <PaymentModal invoice={payTarget} onClose={() => setPayTarget(null)} />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
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
  payBtn: {
    padding: '0.4rem 1.1rem', background: '#28A745', color: '#fff', border: 'none',
    borderRadius: '6px', fontFamily: FONTS.body, fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer',
  },
  pdfBtn: {
    padding: '0.35rem 0.9rem', background: 'none', border: '1px solid ' + COLORS.blue,
    borderRadius: '6px', color: COLORS.blue, fontFamily: FONTS.body, fontSize: '0.82rem', cursor: 'pointer',
  },
  cardBody: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' },
  detail: { display: 'flex', flexDirection: 'column' },
  detailLabel: { fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' },
  detailValue: { fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.black },

  approvedBanner: {
    marginTop: '0.75rem', padding: '0.65rem 0.9rem',
    background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px',
    fontFamily: FONTS.body, fontSize: '0.84rem', color: '#166534',
    display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
  },
  approvedIcon: { fontWeight: '700', flexShrink: 0 },
  approvedPayLink: {
    background: 'none', border: 'none', color: '#166534', fontFamily: FONTS.body,
    fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', padding: 0,
  },
  paidNote: { marginTop: '0.6rem', fontFamily: FONTS.body, fontSize: '0.82rem', color: '#155724', fontStyle: 'italic' },
  notes:    { marginTop: '0.6rem', fontFamily: FONTS.body, fontSize: '0.82rem', color: '#555' },
  helpNote: { marginTop: '2rem', fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.lightBlue, textAlign: 'center' },
  link: { color: COLORS.blue },

  // PaymentModal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
  },
  modal: {
    background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.1rem 1.5rem', borderBottom: '1px solid ' + COLORS.lightBlue,
  },
  modalTitle: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1.15rem', margin: 0 },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '1rem',
    color: COLORS.lightBlue, cursor: 'pointer', padding: '0.2rem 0.5rem',
  },
  modalBody: { flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end',
    padding: '0.85rem 1.5rem', borderTop: '1px solid ' + COLORS.lightBlue,
  },
  cancelBtn: {
    padding: '0.55rem 1.25rem', background: 'none', border: '1px solid ' + COLORS.lightBlue,
    borderRadius: '8px', color: COLORS.lightBlue, fontFamily: FONTS.body, cursor: 'pointer',
  },
  amountBox: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px',
    padding: '0.85rem 1.1rem', marginBottom: '1.1rem',
  },
  amountLabel: { fontFamily: FONTS.body, fontSize: '0.85rem', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' },
  amountValue: { fontFamily: FONTS.header, fontSize: '1.4rem', color: '#166534', fontWeight: '700' },
  payIntro: { fontFamily: FONTS.body, fontSize: '0.875rem', color: '#555', marginBottom: '1rem', lineHeight: '1.55' },
  methodList: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' },
  method: {
    display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
    padding: '0.75rem', border: '1px solid #eef1f5', borderRadius: '8px', background: '#fafcff',
  },
  methodIcon: { fontSize: '1.4rem', flexShrink: 0, lineHeight: 1 },
  methodName: { fontFamily: FONTS.body, fontWeight: '700', fontSize: '0.9rem', color: COLORS.black, margin: '0 0 2px' },
  methodDesc: { fontFamily: FONTS.body, fontSize: '0.82rem', color: '#555', margin: 0, lineHeight: '1.45' },
  payNote: { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.lightBlue, textAlign: 'center', marginTop: '0.5rem' },
};
