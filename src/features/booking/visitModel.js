// ============================================================
// visitModel.js — single source of truth for booking visits.
//
// The booking flow's slot grids (serviceSlots / addonSlots /
// extraServiceData) describe exactly which visits a customer wants:
// one checked cell = one visit on a given date + shift for a given
// service. This module converts those grids into persisted
// `booking_visits` rows, and derives every downstream number
// (line items, subtotal, travel, total) from those SAME rows.
//
// Because ConfirmStep (write), BookingCard, InvoicesList, and the
// admin panels all import these helpers, the quantities and totals
// they display are guaranteed to reconcile.
// ============================================================

export const DEFAULT_SHIFT_ROWS = [
  { id: 'morning', label: 'Morning' },
  { id: 'evening', label: 'Evening' },
];

function titleize(id) {
  if (!id) return 'Visit';
  return String(id).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Number of pets covered by a booking (existing selections + one
// new inline pet if the customer is creating one).
export function petCountForForm(form) {
  const existing = (form.petIds || []).length;
  const addingNew = form.petIsNew && (form.newPet?.name || '').trim() ? 1 : 0;
  return Math.max(existing + addingNew, 1);
}

// Build the list of persisted visit rows from the booking form.
// `servicesById`: { [id]: { id, name, base_price, price_per_pet } }
// Each returned row matches the booking_visits table shape (minus
// booking_id, which is attached at insert time).
export function buildVisitRows(form, servicesById) {
  const petCount = petCountForForm(form);
  const rows = [];

  const pushGrid = (svcId, slots, rowDefs, isAddon) => {
    const svc = servicesById[svcId];
    if (!svc) return;
    const isQuote = svc.base_price === null || svc.base_price === undefined;
    const unit = isQuote ? 0 : Number(svc.base_price);
    const perPet = !!svc.price_per_pet;
    const petsOnVisit = perPet ? petCount : 1;
    const labelById = Object.fromEntries((rowDefs || []).map(r => [r.id, r.label]));
    Object.entries(slots || {}).forEach(([date, day]) => {
      Object.entries(day || {}).forEach(([shiftId, checked]) => {
        if (!checked) return;
        rows.push({
          service_id:   svcId,
          service_name: svc.name,
          visit_date:   date,
          shift_id:     shiftId,
          shift_label:  labelById[shiftId] || titleize(shiftId),
          shift_time:   null,
          is_addon:     isAddon,
          unit_price:   unit,
          pet_count:    petsOnVisit,
          is_quote:     isQuote,
          line_total:   isQuote ? 0 : unit * petsOnVisit,
        });
      });
    });
  };

  // Single non-grid visit (transport / extended packages / field-based extras)
  const pushSingle = (svcId, date, unitOverride, isAddon, shiftTime) => {
    const svc = servicesById[svcId];
    if (!svc || !date) return;
    const isQuote = (svc.base_price === null || svc.base_price === undefined) && unitOverride == null;
    const unit = unitOverride != null ? Number(unitOverride)
               : isQuote ? 0 : Number(svc.base_price);
    const perPet = !!svc.price_per_pet;
    const petsOnVisit = perPet ? petCount : 1;
    rows.push({
      service_id:   svcId,
      service_name: svc.name,
      visit_date:   date,
      shift_id:     'scheduled',
      shift_label:  'Scheduled',
      shift_time:   shiftTime || null,
      is_addon:     isAddon,
      unit_price:   unit,
      pet_count:    petsOnVisit,
      is_quote:     isQuote,
      line_total:   isQuote ? 0 : unit * petsOnVisit,
    });
  };

  // Primary service
  if (form.serviceId) {
    const hasGrid = form.serviceSlots && Object.keys(form.serviceSlots).length > 0;
    if (hasGrid) {
      pushGrid(form.serviceId, form.serviceSlots, form.serviceSlotRows, false);
    } else {
      // No-slot primary (Transport, Extended Care Packages): one visit,
      // priced from form.basePrice (distance/quote resolved in ServiceStep).
      pushSingle(form.serviceId, form.bookingDate, form.basePrice || null, false, form.bookingTime);
    }
  }

  // Dependent add-ons
  (form.addonIds || []).forEach(id => {
    pushGrid(id, (form.addonSlots || {})[id], (form.addonSlotRows || {})[id], true);
  });

  // Independent extra services
  (form.extraServiceIds || []).forEach(id => {
    const d = (form.extraServiceData || {})[id] || {};
    const hasGrid = d.slots && Object.keys(d.slots).length > 0;
    if (hasGrid) {
      pushGrid(id, d.slots, d.rows, true);
    } else if (d.date) {
      pushSingle(id, d.date, null, true, d.time);
    }
  });

  return rows;
}

// Aggregate totals from visit rows. travelFeePerDay is the per-day
// zone fee; travel is charged once per distinct visit date.
export function summarizeVisits(rows, travelFeePerDay = 0) {
  const list = rows || [];
  const subtotal = list.reduce((s, r) => s + Number(r.line_total || 0), 0);
  const dates = new Set(list.map(r => r.visit_date));
  const distinctDates = dates.size;
  const travelFee = Number(travelFeePerDay || 0) * distinctDates;
  const hasQuote = list.some(r => r.is_quote);
  return {
    subtotal,
    distinctDates,
    travelFee,
    total: subtotal + travelFee,
    hasQuote,
  };
}

// Group visit rows into display/invoice line items. qty = number of
// visits; unit = per-visit charge (base price x pets on that visit);
// total = unit x qty. Guarantees qty x unit === total visually.
export function groupLineItems(rows) {
  const map = new Map();
  (rows || []).forEach(r => {
    const perVisit = Number(r.unit_price || 0) * Number(r.pet_count || 1);
    const key = [r.service_id, r.unit_price, r.pet_count, r.is_addon, r.is_quote].join('|');
    if (!map.has(key)) {
      map.set(key, {
        service_id:   r.service_id,
        service_name: r.service_name,
        is_addon:     !!r.is_addon,
        is_quote:     !!r.is_quote,
        base_unit:    Number(r.unit_price || 0),
        pet_count:    Number(r.pet_count || 1),
        unit_price:   perVisit,
        qty:          0,
      });
    }
    map.get(key).qty += 1;
  });
  return [...map.values()].map(li => ({
    ...li,
    description: li.service_name + (li.pet_count > 1 ? ` (x${li.pet_count} pets)` : ''),
    total: li.is_quote ? 0 : li.unit_price * li.qty,
  }));
}

// Convenience: full itemized snapshot for persisting to invoices.line_items.
export function buildInvoiceSnapshot(rows, travelFeePerDay = 0) {
  const lineItems = groupLineItems(rows);
  const totals = summarizeVisits(rows, travelFeePerDay);
  return {
    line_items:      lineItems,
    subtotal:        totals.subtotal,
    travel_fee:      totals.travelFee,
    total_amount:    totals.hasQuote ? null : totals.total,
    distinct_dates:  totals.distinctDates,
    travel_per_day:  Number(travelFeePerDay || 0),
    has_quote:       totals.hasQuote,
  };
}

// Format a money value for display.
export function fmtMoney(n) {
  const v = Number(n || 0);
  return '$' + v.toFixed(2);
}
