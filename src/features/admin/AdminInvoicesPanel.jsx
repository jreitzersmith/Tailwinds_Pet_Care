import { useEffect, useState, useCallback } from 'react';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS, CONTACT, BUSINESS } from '../../constants.jsx';
import AdminInvoiceEditor from './AdminInvoiceEditor.jsx';
import InvoiceReviewModal from './InvoiceReviewModal.jsx';
import PropTypes from 'prop-types';

const STATUS_STYLE = {
  pending_company_review:  { label: 'Pending Review',    bg: '#FFF3CD', color: '#856404' },
  pending_customer_review: { label: 'Pending Customer',  bg: '#CCE5FF', color: '#004085' },
  invoice_approved:        { label: 'Invoice Approved',  bg: '#D4EDDA', color: '#155724' },
  awaiting_payment:        { label: 'Awaiting Payment',  bg: '#FFE5B4', color: '#8a4e00' },
  paid:                    { label: 'Paid',              bg: '#D4EDDA', color: '#155724' },
};

function statusCfg(status) {
  return STATUS_STYLE[status] || { label: status, bg: '#eee', color: '#333' };
}

const FILTER_OPTIONS = [
  { key: 'all',                    label: 'All' },
  { key: 'pending_company_review', label: 'Pending Review' },
  { key: 'pending_customer_review',label: 'Pending Customer' },
  { key: 'invoice_approved',       label: 'Invoice Approved' },
  { key: 'awaiting_payment',       label: 'Awaiting Payment' },
  { key: 'paid',                   label: 'Paid' },
];

// ── PDF renderer ──────────────────────────────────────────────────────────────
function openInvoicePDF(invoice, customerEmail) {
  const cfg = statusCfg(invoice.status);
  const dateRange = invoice.booking_end_date && invoice.booking_end_date !== invoice.booking_date
    ? `${invoice.booking_date} – ${invoice.booking_end_date}`
    : (invoice.booking_date || '—');

  const lineItemsHTML = (() => {
    if (invoice.line_items?.length) {
      return invoice.line_items.map(li => `
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid #eee;">${li.description || ''}</td>
          <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;">${li.qty ?? 1}</td>
          <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${li.unit_price != null ? '$' + Number(li.unit_price).toFixed(2) : '—'}</td>
          <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${li.total != null ? '$' + Number(li.total).toFixed(2) : '—'}</td>
        </tr>`).join('');
    }
    return `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;">${invoice.service_name || 'Pet Care Service'}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;">1</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${invoice.subtotal != null ? '$' + Number(invoice.subtotal).toFixed(2) : '—'}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${invoice.subtotal != null ? '$' + Number(invoice.subtotal).toFixed(2) : '—'}</td>
      </tr>
      ${Number(invoice.travel_fee) > 0 ? `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">Travel Surcharge</td><td style="text-align:center;">1</td><td style="text-align:right;">$${Number(invoice.travel_fee).toFixed(2)}</td><td style="text-align:right;">$${Number(invoice.travel_fee).toFixed(2)}</td></tr>` : ''}`;
  })();

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Invoice ${invoice.invoice_number}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Lucida Sans Unicode',Arial,sans-serif;color:#222;padding:40px;max-width:720px;margin:0 auto}
h1{font-family:'Lucida Bright',Georgia,serif;color:#68AFE6;font-size:2rem;margin-bottom:4px}.sub{color:#A0AFC5;font-size:.9rem;margin-bottom:24px}
.grid{display:flex;justify-content:space-between;margin-bottom:28px;gap:20px}.col{flex:1}.col h3{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:#A0AFC5;margin-bottom:6px}
.col p{font-size:.9rem;line-height:1.6}.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:.8rem;font-weight:600;background:${cfg.bg};color:${cfg.color};margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}thead th{text-align:left;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:#A0AFC5;border-bottom:2px solid #68AFE6;padding-bottom:6px}
thead th:nth-child(2){text-align:center}thead th:nth-child(3),thead th:nth-child(4){text-align:right}
.totals{margin-left:auto;width:240px}.totals tr td:first-child{color:#555;font-size:.9rem;padding:4px 0}.totals tr td:last-child{text-align:right;font-size:.9rem;padding:4px 0}
.grand td{font-weight:700;font-size:1.05rem;color:#68AFE6;border-top:2px solid #68AFE6;padding-top:8px!important}
.footer{margin-top:36px;padding-top:16px;border-top:1px solid #eee;font-size:.8rem;color:#A0AFC5;text-align:center}
@media print{body{padding:20px}}</style></head><body>
<h1>${BUSINESS.name}</h1><p class="sub">${CONTACT.address} | ${CONTACT.phone} | ${CONTACT.email}</p>
<div class="grid">
  <div class="col"><h3>Invoice</h3><p><strong>${invoice.invoice_number}</strong></p><p>Date: ${new Date(invoice.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p></div>
  <div class="col"><h3>Billed To</h3><p>${customerEmail || '—'}</p></div>
  <div class="col"><h3>Service Details</h3><p>Pet: ${invoice.pet_name || '—'}</p><p>Date(s): ${dateRange}</p>${invoice.zone ? `<p>Zone: ${invoice.zone}</p>` : ''}</div>
</div>
<span class="badge">${cfg.label}</span>
<table><thead><tr><th>Description</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${lineItemsHTML}</tbody></table>
<table class="totals"><tbody>
${invoice.subtotal != null ? `<tr><td>Subtotal</td><td>$${Number(invoice.subtotal).toFixed(2)}</td></tr>` : ''}
${Number(invoice.travel_fee) > 0 ? `<tr><td>Travel Fee</td><td>$${Number(invoice.travel_fee).toFixed(2)}</td></tr>` : ''}
<tr class="grand"><td>Total</td><td>${invoice.total_amount != null ? '$' + Number(invoice.total_amount).toFixed(2) : '—'}</td></tr>
</tbody></table>
${invoice.notes ? `<p style="margin-top:16px;font-size:.875rem;color:#555;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
<div class="footer"><p>Thank you for choosing ${BUSINESS.name}! Questions? ${CONTACT.email} or ${CONTACT.phone}.</p></div>
<script>window.onload=()=>window.print();<\/script></body></html>`);
  win.document.close();
}

// ── Invoice row card ──────────────────────────────────────────────────────────
function InvoiceRow({ invoice, onEdit, onReview }) {
  const [expanded, setExpanded] = useState(false);

  const cfg = statusCfg(invoice.status);
  const customerEmail = invoice.customers?.email || '—';
  const customerName  = invoice.customers?.full_name || '';
  const dateRange = invoice.booking_end_date && invoice.booking_end_date !== invoice.booking_date
    ? `${invoice.booking_date} – ${invoice.booking_end_date}`
    : (invoice.booking_date || '—');
  const amountDisplay = invoice.total_amount != null
    ? `$${Number(invoice.total_amount).toFixed(2)}`
    : (invoice.has_custom_items ? 'Quote pending' : '—');

  return (
    <div style={styles.row}>
      <div style={styles.rowTop} onClick={() => setExpanded(x => !x)}>
        <div style={styles.rowTopLeft}>
          <span style={styles.invoiceNum}>{invoice.invoice_number}</span>
          <span style={{ ...styles.badge, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        </div>
        <div style={styles.rowSummary}>
          <span style={styles.summaryCustomer}>{customerName || customerEmail}</span>
          <span style={styles.summaryAmount}>{amountDisplay}</span>
          <span style={styles.expandCaret}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <div style={styles.rowBody}>
        <div style={styles.detail}>
          <span style={styles.detailLabel}>Customer</span>
          <span style={styles.detailValue}>{customerName || customerEmail}</span>
          {customerName && <span style={{ ...styles.detailValue, fontSize: '0.78rem', color: COLORS.lightBlue }}>{customerEmail}</span>}
        </div>
        <div style={styles.detail}>
          <span style={styles.detailLabel}>Service</span>
          <span style={styles.detailValue}>{invoice.service_name || '—'}</span>
        </div>
        <div style={styles.detail}>
          <span style={styles.detailLabel}>Date(s)</span>
          <span style={styles.detailValue}>{dateRange}</span>
        </div>
        <div style={styles.detail}>
          <span style={styles.detailLabel}>Total</span>
          <span style={{ ...styles.detailValue, fontWeight: '700', color: COLORS.blue }}>{amountDisplay}</span>
        </div>
        <div style={styles.rowActions}>
          {invoice.status === 'pending_company_review' && (
            <button
              style={{ ...styles.actionBtn, ...styles.approveBtn }}
              onClick={e => { e.stopPropagation(); onReview(invoice); }}
            >
              Approve
            </button>
          )}
          <button style={styles.actionBtn} onClick={e => { e.stopPropagation(); onEdit(invoice); }}>Edit</button>
          <button style={styles.actionBtn} onClick={e => { e.stopPropagation(); openInvoicePDF(invoice, customerEmail); }}>PDF</button>
        </div>
      </div>

      {expanded && (
        <div style={styles.expandedDetail}>
          <div style={styles.expandedGrid}>
            <div style={styles.expandedCol}>
              <p style={styles.expandLabel}>Invoice #</p>
              <p style={styles.expandValue}>{invoice.invoice_number}</p>
              <p style={styles.expandLabel}>Pet</p>
              <p style={styles.expandValue}>{invoice.pet_name || '—'}</p>
              <p style={styles.expandLabel}>Zone</p>
              <p style={styles.expandValue}>{invoice.zone || '—'}</p>
              <p style={styles.expandLabel}>Travel Fee</p>
              <p style={styles.expandValue}>{invoice.travel_fee != null ? `$${Number(invoice.travel_fee).toFixed(2)}` : '—'}</p>
              <p style={styles.expandLabel}>Created</p>
              <p style={styles.expandValue}>
                {invoice.created_at
                  ? new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : '—'}
              </p>
            </div>

            <div style={{ flex: 2 }}>
              <p style={styles.expandLabel}>Line Items</p>
              {invoice.line_items?.length ? (
                <table style={styles.lineTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.lineTh, textAlign: 'left' }}>Description</th>
                      <th style={{ ...styles.lineTh, textAlign: 'center' }}>Qty</th>
                      <th style={{ ...styles.lineTh, textAlign: 'right' }}>Unit $</th>
                      <th style={{ ...styles.lineTh, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((li, idx) => (
                      <tr key={idx}>
                        <td style={styles.lineTd}>{li.description || '—'}</td>
                        <td style={{ ...styles.lineTd, textAlign: 'center' }}>{li.qty ?? 1}</td>
                        <td style={{ ...styles.lineTd, textAlign: 'right' }}>
                          {li.unit_price != null ? `$${Number(li.unit_price).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ ...styles.lineTd, textAlign: 'right', fontWeight: '600' }}>
                          {li.total != null ? `$${Number(li.total).toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={styles.expandValue}>{invoice.service_name || 'No line items'}</p>
              )}

              <div style={styles.totalsBox}>
                {invoice.subtotal != null && (
                  <div style={styles.totalRow}>
                    <span>Subtotal</span>
                    <span>${Number(invoice.subtotal).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoice.travel_fee) > 0 && (
                  <div style={styles.totalRow}>
                    <span>Travel Fee</span>
                    <span>${Number(invoice.travel_fee).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ ...styles.totalRow, ...styles.grandTotal }}>
                  <span>Total</span>
                  <span>{invoice.total_amount != null ? `$${Number(invoice.total_amount).toFixed(2)}` : '—'}</span>
                </div>
              </div>

              {invoice.notes && (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={styles.expandLabel}>Notes</p>
                  <p style={{ ...styles.expandValue, fontStyle: 'italic' }}>{invoice.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

InvoiceRow.propTypes = {
  invoice:  PropTypes.object.isRequired,
  onEdit:   PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
};

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AdminInvoicesPanel() {
  const [invoices,     setInvoices]     = useState([]);
  const [customers,    setCustomers]    = useState([]);
  const [filter,       setFilter]       = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [editorOpen,   setEditorOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  useEffect(() => {
    supabase
      .from('customers')
      .select('id, email, full_name')
      .order('email')
      .then(({ data }) => { if (data) setCustomers(data); });
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('invoices')
      .select('*, customers(email, full_name)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setInvoices(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  function openNew()           { setEditTarget(null);     setEditorOpen(true); }
  function openEdit(invoice)   { setEditTarget(invoice);  setEditorOpen(true); }
  function closeEditor()       { setEditorOpen(false);    setEditTarget(null); }
  function openReview(invoice) { setReviewTarget(invoice); }
  function closeReview()       { setReviewTarget(null); }

  function handleSave(saved, isNew) {
    if (isNew) {
      setInvoices(prev => [saved, ...prev]);
    } else {
      setInvoices(prev => prev.map(inv => inv.id === saved.id ? saved : inv));
    }
    closeEditor();
  }

  function handleReviewSent(updatedInvoice) {
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    closeReview();
  }

  return (
    <div>
      <div style={styles.topBar}>
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
        <button style={styles.newBtn} onClick={openNew}>+ New Invoice</button>
      </div>

      {loading && <p style={styles.msg}>Loading invoices...</p>}
      {error   && <p style={styles.err}>{error}</p>}
      {!loading && !error && invoices.length === 0 && (
        <p style={styles.empty}>No invoices found.</p>
      )}
      {!loading && !error && invoices.length > 0 && (
        <div style={styles.list}>
          {invoices.map(inv => (
            <InvoiceRow key={inv.id} invoice={inv} onEdit={openEdit} onReview={openReview} />
          ))}
        </div>
      )}

      {editorOpen && (
        <AdminInvoiceEditor
          invoice={editTarget}
          customers={customers}
          onSave={handleSave}
          onClose={closeEditor}
        />
      )}

      {reviewTarget && (
        <InvoiceReviewModal
          invoice={reviewTarget}
          onSent={handleReviewSent}
          onClose={closeReview}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' },
  filterRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  filterBtn: {
    padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid ' + COLORS.lightBlue,
    background: 'none', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue, cursor: 'pointer',
  },
  filterBtnActive: { background: COLORS.blue, color: COLORS.white, borderColor: COLORS.blue, fontWeight: '600' },
  newBtn: {
    padding: '0.5rem 1.25rem', background: COLORS.blue, color: COLORS.white, border: 'none',
    borderRadius: '8px', fontFamily: FONTS.body, fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
  },
  list:  { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  msg:   { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  err:   { fontFamily: FONTS.body, color: COLORS.red, padding: '1rem' },
  empty: { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },

  row: { border: '1px solid ' + COLORS.lightBlue, borderRadius: '10px', background: '#fff', overflow: 'hidden' },
  rowTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.75rem 1.25rem', borderBottom: '1px solid #eef1f5',
    cursor: 'pointer', background: '#f8fbff',
  },
  rowTopLeft: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  invoiceNum: { fontFamily: FONTS.header, fontSize: '1rem', color: COLORS.blue, fontWeight: '600' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600', fontFamily: FONTS.body },
  rowSummary: { display: 'flex', alignItems: 'center', gap: '1rem' },
  summaryCustomer: { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.black },
  summaryAmount: { fontFamily: FONTS.body, fontWeight: '700', color: COLORS.blue, fontSize: '0.9rem' },
  expandCaret: { fontFamily: FONTS.body, color: COLORS.lightBlue, fontSize: '0.75rem' },

  rowBody: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem 1.25rem' },
  detail: { display: 'flex', flexDirection: 'column', flex: '1 1 120px' },
  detailLabel: { fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' },
  detailValue: { fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.black },
  rowActions: { display: 'flex', gap: '0.5rem', marginLeft: 'auto' },
  actionBtn: {
    padding: '0.3rem 0.85rem', background: 'none', border: '1px solid ' + COLORS.blue,
    borderRadius: '6px', color: COLORS.blue, fontFamily: FONTS.body, fontSize: '0.82rem', cursor: 'pointer',
  },
  approveBtn: { background: COLORS.blue, color: COLORS.white, fontWeight: '600' },

  expandedDetail: { borderTop: '1px dashed ' + COLORS.lightBlue, padding: '1rem 1.25rem', background: '#fafcff' },
  expandedGrid: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  expandedCol: { flex: 1, minWidth: '160px' },
  expandLabel: {
    fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', marginTop: '0.6rem',
  },
  expandValue: { fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black, margin: 0 },

  lineTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '0.5rem' },
  lineTh: {
    fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '2px solid ' + COLORS.blue, paddingBottom: '4px', paddingRight: '8px',
  },
  lineTd: { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.black, padding: '4px 8px 4px 0', borderBottom: '1px solid #eef1f5' },

  totalsBox: { marginTop: '0.75rem', marginLeft: 'auto', width: '220px', borderTop: '1px solid ' + COLORS.lightBlue, paddingTop: '0.5rem' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.black, padding: '2px 0' },
  grandTotal: { fontWeight: '700', color: COLORS.blue, borderTop: '2px solid ' + COLORS.blue, paddingTop: '6px', marginTop: '4px' },
};
