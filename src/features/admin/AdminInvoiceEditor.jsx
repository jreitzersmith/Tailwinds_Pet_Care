import { useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';

// Invoice statuses the admin can set from this editor (per contract).
const INVOICE_STATUSES = [
  { value: 'draft',                   label: 'Draft (Pending Tailwinds Review)' },
  { value: 'pending_customer_review', label: 'Pending Customer Review (Propose Changes)' },
  { value: 'awaiting_payment',        label: 'Awaiting Payment (Issue Invoice)' },
  { value: 'paid',                    label: 'Paid' },
  { value: 'void',                    label: 'Void' },
];

function emptyLineItem() {
  return { description: '', qty: 1, unit_price: '', total: '' };
}

function recalcLineItem(li) {
  const qty   = Number(li.qty)        || 0;
  const price = Number(li.unit_price) || 0;
  return { ...li, total: qty > 0 && price > 0 ? qty * price : '' };
}

function computeTotals(lineItems, travelFee) {
  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.total) || 0), 0);
  const travel   = Number(travelFee) || 0;
  return { subtotal, total: subtotal + travel };
}

// ── Modal shell ───────────────────────────────────────────────────────────────
export default function AdminInvoiceEditor({ invoice, customers, onSave, onClose }) {
  const isNew = !invoice?.id;

  const [customerId,     setCustomerId]     = useState(invoice?.customer_id     || '');
  const [serviceName,    setServiceName]    = useState(invoice?.service_name    || '');
  const [petName,        setPetName]        = useState(invoice?.pet_name        || '');
  const [bookingDate,    setBookingDate]    = useState(invoice?.booking_date    || '');
  const [bookingEndDate, setBookingEndDate] = useState(invoice?.booking_end_date|| '');
  const [zone,           setZone]           = useState(invoice?.zone            || '');
  const [lineItems,      setLineItems]      = useState(
    invoice?.line_items?.length ? invoice.line_items : [emptyLineItem()]
  );
  const [travelFee,  setTravelFee]  = useState(invoice?.travel_fee ?? '');
  const [notes,      setNotes]      = useState(invoice?.notes      || '');
  const [changeNote, setChangeNote] = useState(invoice?.bookings?.change_note || '');
  const [status,     setStatus]     = useState(invoice?.status     || 'draft');
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState(null);

  const { subtotal, total } = computeTotals(lineItems, travelFee);

  const bookingId = invoice?.booking_id || null;

  function updateLineItem(idx, field, value) {
    setLineItems(prev => {
      const updated = prev.map((li, i) => {
        if (i !== idx) return li;
        const next = { ...li, [field]: value };
        return recalcLineItem(next);
      });
      return updated;
    });
  }

  function addLineItem()       { setLineItems(prev => [...prev, emptyLineItem()]); }
  function removeLineItem(idx) { setLineItems(prev => prev.filter((_, i) => i !== idx)); }

  async function handleSave() {
    if (!customerId)          { setFormError('Please select a customer.'); return; }
    if (lineItems.length === 0) { setFormError('Add at least one line item.'); return; }
    if (status === 'pending_customer_review' && !changeNote.trim()) {
      setFormError('Add a change note describing what you changed for the customer.');
      return;
    }

    setFormError(null);
    setSaving(true);

    const nowIso = new Date().toISOString();

    // Persist line items in the SAME shape visitModel.groupLineItems produces
    // (description, qty, unit_price, total + is_addon/is_quote), so downstream
    // renderers can display invoice.line_items directly without re-grouping.
    const validItems = lineItems
      .filter(li => (li.description || '').trim())
      .map(li => ({
        ...li,
        qty:        Number(li.qty)        || 0,
        unit_price: Number(li.unit_price) || 0,
        total:      Number(li.total)      || 0,
        is_addon:   !!li.is_addon,
        is_quote:   li.is_quote === true ? true : false,
      }));

    const payload = {
      customer_id:      customerId,
      service_name:     serviceName    || null,
      pet_name:         petName        || null,
      booking_date:     bookingDate    || null,
      booking_end_date: bookingEndDate || null,
      zone:             zone           || null,
      line_items:       validItems,
      has_custom_items: true,
      subtotal:         subtotal       || null,
      travel_fee:       Number(travelFee) || 0,
      total_amount:     total          || null,
      notes:            notes          || null,
      status,
      updated_at:       nowIso,
    };

    // Status-driven side effects on the invoice.
    if (status === 'awaiting_payment' && invoice?.status !== 'awaiting_payment') {
      payload.issued_at = nowIso;
    }
    if (status === 'paid' && invoice?.status !== 'paid') {
      payload.paid_at = nowIso;
    }

    let result;
    if (isNew) {
      result = await supabase.from('invoices').insert(payload).select().single();
    } else {
      result = await supabase.from('invoices').update(payload).eq('id', invoice.id).select().single();
    }

    if (result.error) { setSaving(false); setFormError(result.error.message); return; }

    // Keep the linked booking in sync with the invoice status change.
    if (bookingId) {
      let bookingUpdate = null;
      if (status === 'pending_customer_review') {
        // Admin proposing changes.
        bookingUpdate = {
          status:         'changes_pending_customer',
          admin_modified: true,
          change_note:    changeNote || null,
          updated_at:     nowIso,
        };
      } else if (status === 'awaiting_payment') {
        // Issuing the invoice: booking is now confirmed.
        bookingUpdate = { status: 'confirmed', updated_at: nowIso };
      }
      if (bookingUpdate) {
        const { error: bErr } = await supabase
          .from('bookings')
          .update(bookingUpdate)
          .eq('id', bookingId);
        if (bErr) console.warn('Booking sync failed:', bErr.message);
      }
    }

    setSaving(false);
    onSave(result.data, isNew);
  }

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{isNew ? 'New Invoice' : `Edit ${invoice.invoice_number}`}</h2>
          <button style={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        <div style={styles.modalBody}>
          {formError && <p style={styles.formError}>{formError}</p>}

          <div style={styles.field}>
            <label style={styles.label}>Customer *</label>
            <select style={styles.input} value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value=''>-- Select customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name ? `${c.full_name} (${c.email})` : c.email}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Service Name</label>
              <input style={styles.input} value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder='e.g. Dog Walking' />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Pet Name</label>
              <input style={styles.input} value={petName} onChange={e => setPetName(e.target.value)} placeholder='e.g. Biscuit' />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Start Date</label>
              <input style={styles.input} type='date' value={bookingDate} onChange={e => setBookingDate(e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>End Date</label>
              <input style={styles.input} type='date' value={bookingEndDate} onChange={e => setBookingEndDate(e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Zone</label>
              <input style={styles.input} value={zone} onChange={e => setZone(e.target.value)} placeholder='e.g. Zone 2' />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Travel Fee ($)</label>
              <input style={styles.input} type='number' min='0' step='0.01' value={travelFee} onChange={e => setTravelFee(e.target.value)} placeholder='0.00' />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Line Items *</label>
            <div style={styles.lineItemsHeader}>
              <span style={{ flex: 3 }}>Description</span>
              <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Unit $</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Total</span>
              <span style={{ width: '28px' }} />
            </div>
            {lineItems.map((li, idx) => (
              <div key={idx} style={styles.lineItemRow}>
                <input
                  style={{ ...styles.input, flex: 3 }}
                  value={li.description}
                  onChange={e => updateLineItem(idx, 'description', e.target.value)}
                  placeholder='Service or item description'
                />
                <input
                  style={{ ...styles.input, flex: 1, textAlign: 'center' }}
                  type='number' min='1' step='1'
                  value={li.qty}
                  onChange={e => updateLineItem(idx, 'qty', e.target.value)}
                />
                <input
                  style={{ ...styles.input, flex: 1, textAlign: 'right' }}
                  type='number' min='0' step='0.01'
                  value={li.unit_price}
                  onChange={e => updateLineItem(idx, 'unit_price', e.target.value)}
                  placeholder='0.00'
                />
                <span style={{ ...styles.lineTotal, flex: 1 }}>
                  {li.total !== '' ? `$${Number(li.total).toFixed(2)}` : '---'}
                </span>
                <button style={styles.removeBtn} onClick={() => removeLineItem(idx)} title='Remove'>X</button>
              </div>
            ))}
            <button style={styles.addLineBtn} onClick={addLineItem}>+ Add Line Item</button>
          </div>

          <div style={styles.totalsBox}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Subtotal</span>
              <span style={styles.totalValue}>${subtotal.toFixed(2)}</span>
            </div>
            {Number(travelFee) > 0 && (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Travel Fee</span>
                <span style={styles.totalValue}>${Number(travelFee).toFixed(2)}</span>
              </div>
            )}
            <div style={{ ...styles.totalRow, ...styles.grandTotal }}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Status</label>
              <select style={styles.input} value={status} onChange={e => setStatus(e.target.value)}>
                {INVOICE_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Change note — required when proposing changes to the customer */}
          <div style={styles.field}>
            <label style={styles.label}>
              Change Note {status === 'pending_customer_review' ? '*' : '(shown when proposing changes)'}
            </label>
            <textarea
              style={{ ...styles.input, ...styles.textarea }}
              value={changeNote}
              onChange={e => setChangeNote(e.target.value)}
              placeholder='Explain what changed (price, schedule, add-ons) so the customer can approve or decline…'
            />
            {!bookingId && (
              <p style={styles.hintNote}>No linked booking — change note is saved on the invoice only when a booking is attached.</p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Notes (visible to customer)</label>
            <textarea style={{ ...styles.input, ...styles.textarea }} value={notes} onChange={e => setNotes(e.target.value)} placeholder='Optional notes or payment instructions...' />
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={styles.saveBtn}   onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Create Invoice' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

AdminInvoiceEditor.propTypes = {
  invoice:   PropTypes.object,
  customers: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSave:    PropTypes.func.isRequired,
  onClose:   PropTypes.func.isRequired,
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
  },
  modal: {
    background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '680px',
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

  formError: { fontFamily: FONTS.body, color: COLORS.red, fontSize: '0.875rem', marginBottom: '0.75rem' },
  field:  { marginBottom: '1rem' },
  label:  { display: 'block', fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.lightBlue, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' },
  input:  {
    width: '100%', padding: '0.45rem 0.7rem', borderRadius: '6px',
    border: '1px solid ' + COLORS.lightBlue, fontFamily: FONTS.body, fontSize: '0.9rem',
    color: COLORS.black, boxSizing: 'border-box', outline: 'none',
  },
  textarea: { resize: 'vertical', minHeight: '72px' },
  hintNote: { fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.lightBlue, fontStyle: 'italic', margin: '4px 0 0' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' },

  lineItemsHeader: {
    display: 'flex', gap: '0.5rem', alignItems: 'center',
    fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
    paddingRight: '36px',
  },
  lineItemRow: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '6px' },
  lineTotal: { fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black, textAlign: 'right', whiteSpace: 'nowrap' },
  removeBtn: {
    background: 'none', border: 'none', color: COLORS.red, cursor: 'pointer',
    fontSize: '0.85rem', padding: '0.2rem 0.4rem', lineHeight: 1,
  },
  addLineBtn: {
    marginTop: '0.5rem', padding: '0.35rem 1rem', background: 'none',
    border: '1px dashed ' + COLORS.blue, borderRadius: '6px',
    color: COLORS.blue, fontFamily: FONTS.body, fontSize: '0.85rem', cursor: 'pointer',
  },

  totalsBox: {
    background: '#f5f9fe', borderRadius: '8px', padding: '0.75rem 1rem',
    marginBottom: '1rem', width: '280px', marginLeft: 'auto',
  },
  totalRow:  { display: 'flex', justifyContent: 'space-between', fontFamily: FONTS.body, fontSize: '0.88rem', padding: '2px 0' },
  totalLabel: { color: COLORS.lightBlue },
  totalValue: { color: COLORS.black },
  grandTotal: { fontWeight: '700', color: COLORS.blue, borderTop: '1px solid ' + COLORS.lightBlue, paddingTop: '6px', marginTop: '4px' },

  cancelBtn: {
    padding: '0.55rem 1.25rem', background: 'none', border: '1px solid ' + COLORS.lightBlue,
    borderRadius: '8px', color: COLORS.lightBlue, fontFamily: FONTS.body, cursor: 'pointer',
  },
  saveBtn: {
    padding: '0.55rem 1.5rem', background: COLORS.blue, border: 'none',
    borderRadius: '8px', color: COLORS.white, fontFamily: FONTS.body,
    fontWeight: '600', cursor: 'pointer',
  },
};
