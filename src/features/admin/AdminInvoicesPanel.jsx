import { useEffect, useState, useCallback } from 'react';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS, CONTACT, BUSINESS } from '../../constants.jsx';
import AdminInvoiceEditor from './AdminInvoiceEditor.jsx';

const STATUS_STYLE = {
  pending_company_review:  { label: 'Pending Review',    bg: '#FFF3CD', color: '#856404' },
  pending_customer_review: { label: 'Pending Customer',  bg: '#CCE5FF', color: '#004085' },
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
  { key: 'awaiting_payment',       label: 'Awaiting Payment' },
  { key: 'paid',                   label: 'Paid' },
];

// ── Reuse PDF renderer from customer InvoicesList ─────────────────────────────
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
import PropTypes from 'prop-types';

function InvoiceRow({ invoice, onEdit }) {
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
      <div style={styles.rowTop}>
        <div style={styles.rowTopLeft}>
          <span style={styles.invoiceNum}>{invoice.invoice_number}</span>
          <span style={{ ...styles.badge, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        </div>
        <div style={styles.rowActions}>
          <button style={styles.actionBtn} onClick={() => onEdit(invoice)}>Edit</button>
          <button style={styles.actionBtn} onClick={() => openInvoicePDF(invoice, customerEmail)}>PDF</button>
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
      </div>
    </div>
  );
}

InvoiceRow.propTypes = {
  invoice: PropTypes.object.isRequired,
  onEdit:  PropTypes.func.isRequired,
};

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AdminInvoicesPanel() {
  const [invoices,   setInvoices]   = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [filter,     setFilter]     = useState('all');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = new invoice

  // Load all customers once for the editor dropdown
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

  function openNew()         { setEditTarget(null);    setEditorOpen(true); }
  function openEdit(invoice) { setEditTarget(invoice); setEditorOpen(true); }
  function closeEditor()     { setEditorOpen(false);   setEditTarget(null); }

  function handleSave(saved, isNew) {
    if (isNew) {
      setInvoices(prev => [saved, ...prev]);
    } else {
      setInvoices(prev => prev.map(inv => inv.id === saved.id ? saved : inv));
    }
    closeEditor();
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

      {loading && <p style={styles.msg}>Loading invoices…</p>}
      {error   && <p style={styles.err}>{error}</p>}
      {!loading && !error && invoices.length === 0 && (
        <p style={styles.empty}>No invoices found.</p>
      )}
      {!loading && !error && invoices.length > 0 && (
        <div style={styles.list}>
          {invoices.map(inv => (
            <InvoiceRow key={inv.id} invoice={inv} onEdit={openEdit} />
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
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' },
  filterRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  filterBtn: {
    padding: '0.4rem 1rem', borderRadius: '20px', border: `1px solid ${COLORS.lightBlue}`,
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

  row: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px',
    padding: '1rem 1.25rem', background: '#fff',
  },
  rowTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem',
  },
  rowTopLeft: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  invoiceNum: { fontFamily: FONTS.header, fontSize: '1rem', color: COLORS.blue, fontWeight: '600' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600', fontFamily: FONTS.body },
  rowActions: { display: 'flex', gap: '0.5rem' },
  actionBtn: {
    padding: '0.3rem 0.85rem', background: 'none', border: `1px solid ${COLORS.blue}`,
    borderRadius: '6px', color: COLORS.blue, fontFamily: FONTS.body, fontSize: '0.82rem', cursor: 'pointer',
  },
  rowBody: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem',
  },
  detail: { display: 'flex', flexDirection: 'column' },
  detailLabel: { fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' },
  detailValue: { fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.black },
};
