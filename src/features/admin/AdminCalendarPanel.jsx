import { useEffect, useState, useCallback } from 'react';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';
import PropTypes from 'prop-types';

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_ADDRESS = '2500 South Blvd, Dallas, TX 75215';
const BASE_COORDS  = { lat: 32.7359, lng: -96.8006 };

const STATUS_COLOR = {
  pending:     '#FFC107',
  confirmed:   '#28A745',
  in_progress: '#007BFF',
  completed:   '#6C757D',
  cancelled:   '#DC3545',
};

// ── Utilities ─────────────────────────────────────────────────────────────────
function isoDate(d) { return d.toISOString().split('T')[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function haversine(lat1, lng1, lat2, lng2) {
  const R    = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function nearestNeighbor(base, stops) {
  const remaining = [...stops.filter(s => s.coords)];
  const noCoords  = stops.filter(s => !s.coords);
  const route     = [];
  let   current   = base;
  while (remaining.length > 0) {
    let ni = 0, nd = Infinity;
    remaining.forEach((s, i) => {
      const d = haversine(current.lat, current.lng, s.coords.lat, s.coords.lng);
      if (d < nd) { nd = d; ni = i; }
    });
    route.push({ ...remaining[ni], distFromPrev: nd.toFixed(1) });
    current = remaining[ni].coords;
    remaining.splice(ni, 1);
  }
  return [...route, ...noCoords.map(s => ({ ...s, distFromPrev: null }))];
}

async function geocodeAddress(address, apiKey) {
  if (!address) return null;
  try {
    const url  = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results.length) return data.results[0].geometry.location;
  } catch (_) {}
  return null;
}

async function buildRoute(bookings, apiKey) {
  const stops = await Promise.all(
    bookings.map(async b => {
      const address = b.customers?.address;
      const coords  = await geocodeAddress(address, apiKey);
      return { booking: b, coords, address: address || '' };
    })
  );
  return nearestNeighbor(BASE_COORDS, stops);
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ current, bookings, onDayClick }) {
  const year     = current.getFullYear();
  const month    = current.getMonth();
  const first    = new Date(year, month, 1);
  const startDay = first.getDay();
  const lastDay  = new Date(year, month + 1, 0).getDate();
  const today    = isoDate(new Date());

  const cells = [];
  for (let i = 0; i < startDay; i++)
    cells.push(new Date(year, month, 1 - startDay + i));
  for (let d = 1; d <= lastDay; d++)
    cells.push(new Date(year, month, d));
  while (cells.length < 42)
    cells.push(new Date(year, month + 1, cells.length - lastDay - startDay + 1));

  const byDate = {};
  bookings.forEach(b => {
    if (!byDate[b.booking_date]) byDate[b.booking_date] = [];
    byDate[b.booking_date].push(b);
  });

  return (
    <div>
      <div style={cs.monthGrid}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={cs.monthDayHeader}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const key     = isoDate(d);
          const inMonth = d.getMonth() === month;
          const isToday = key === today;
          const dayBks  = byDate[key] || [];
          return (
            <div
              key={i}
              style={{ ...cs.monthCell, opacity: inMonth ? 1 : 0.3, ...(isToday ? cs.monthCellToday : {}) }}
              onClick={() => onDayClick(d)}
            >
              <span style={isToday ? cs.todayNum : cs.cellNum}>{d.getDate()}</span>
              <div style={cs.dotRow}>
                {dayBks.slice(0, 4).map((b, j) => (
                  <span
                    key={j}
                    style={{ ...cs.dot, background: STATUS_COLOR[b.status] || '#999' }}
                    title={`${b.customers?.full_name || ''} — ${b.services?.name || ''}`}
                  />
                ))}
                {dayBks.length > 4 && (
                  <span style={cs.moreDots}>+{dayBks.length - 4}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={cs.legend}>
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <span key={status} style={cs.legendItem}>
            <span style={{ ...cs.dot, background: color, marginRight: '4px' }} />
            {status.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

MonthView.propTypes = {
  current:    PropTypes.instanceOf(Date).isRequired,
  bookings:   PropTypes.array.isRequired,
  onDayClick: PropTypes.func.isRequired,
};

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ current, bookings, onDayClick }) {
  const ws    = startOfWeek(current);
  const days  = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const today = isoDate(new Date());

  const byDate = {};
  bookings.forEach(b => {
    if (!byDate[b.booking_date]) byDate[b.booking_date] = [];
    byDate[b.booking_date].push(b);
  });

  return (
    <div style={cs.weekGrid}>
      {days.map(d => {
        const key    = isoDate(d);
        const dayBks = byDate[key] || [];
        const isToday = key === today;
        return (
          <div key={key} style={{ ...cs.weekCol, ...(isToday ? cs.weekColToday : {}) }}>
            <div style={cs.weekColHeader} onClick={() => onDayClick(d)}>
              <span style={cs.weekDayName}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span style={{ ...cs.weekDayNum, ...(isToday ? cs.todayNum : {}) }}>{d.getDate()}</span>
            </div>
            <div style={cs.weekBookings}>
              {dayBks.length === 0 && (
                <span style={cs.emptyDay}>—</span>
              )}
              {dayBks.map(b => (
                <div key={b.id} style={{ ...cs.weekCard, borderLeftColor: STATUS_COLOR[b.status] || '#999' }}>
                  <span style={cs.weekCardService}>{b.services?.name || '—'}</span>
                  <span style={cs.weekCardName}>{b.customers?.full_name || '—'}</span>
                  {b.booking_time && <span style={cs.weekCardTime}>{b.booking_time}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

WeekView.propTypes = {
  current:    PropTypes.instanceOf(Date).isRequired,
  bookings:   PropTypes.array.isRequired,
  onDayClick: PropTypes.func.isRequired,
};

// ── Drop-In Modal ─────────────────────────────────────────────────────────────
function DropInModal({ date, onClose, onSuccess }) {
  const [customers,  setCustomers]  = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [pets,       setPets]       = useState([]);
  const [petId,      setPetId]      = useState('');
  const [services,   setServices]   = useState([]);
  const [time,       setTime]       = useState('');
  const [notes,      setNotes]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('id, full_name, email').order('full_name'),
      supabase.from('services').select('id, name, base_price').eq('is_active', true),
    ]).then(([{ data: c }, { data: s }]) => {
      setCustomers(c || []);
      setServices(s || []);
    });
  }, []);

  useEffect(() => {
    if (!customerId) { setPets([]); setPetId(''); return; }
    supabase.from('pets').select('id, name, species').eq('customer_id', customerId)
      .then(({ data }) => setPets(data || []));
  }, [customerId]);

  async function handleSubmit() {
    if (!customerId) { setError('Please select a customer.'); return; }
    const svc = services.find(s => s.name === 'Drop-In Visits');
    if (!svc) { setError('Drop-In Visits service not found in database.'); return; }
    setSubmitting(true); setError(null);
    const { error: err } = await supabase.from('bookings').insert({
      customer_id:          customerId,
      pet_id:               petId || null,
      service_id:           svc.id,
      booking_date:         isoDate(date),
      booking_end_date:     isoDate(date),
      booking_time:         time || null,
      status:               'confirmed',
      zone:                 null,
      travel_fee:           0,
      base_price:           Number(svc.base_price) || 0,
      total_price:          Number(svc.base_price) || 0,
      special_instructions: notes || null,
      addon_service_ids:    [],
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    onSuccess();
  }

  return (
    <div style={cs.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={cs.modal}>
        <h3 style={cs.modalTitle}>Schedule Drop-In Visit</h3>
        <p style={cs.modalDate}>
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <label style={cs.modalLabel}>Customer *
          <select style={cs.modalInput} value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value=''>— Select customer —</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
            ))}
          </select>
        </label>

        <label style={cs.modalLabel}>Pet (optional)
          <select style={cs.modalInput} value={petId} onChange={e => setPetId(e.target.value)} disabled={!customerId || pets.length === 0}>
            <option value=''>— Select pet —</option>
            {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
          </select>
        </label>

        <label style={cs.modalLabel}>Time (optional)
          <input style={cs.modalInput} type='time' value={time} onChange={e => setTime(e.target.value)} />
        </label>

        <label style={cs.modalLabel}>Notes (optional)
          <textarea style={{ ...cs.modalInput, resize: 'vertical', minHeight: '70px' }} rows={3}
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder='Special instructions, gate codes, etc.' />
        </label>

        {error && <p style={cs.errMsg}>{error}</p>}

        <div style={cs.modalFooter}>
          <button style={cs.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={cs.submitBtn} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Scheduling…' : 'Schedule Drop-In'}
          </button>
        </div>
      </div>
    </div>
  );
}

DropInModal.propTypes = {
  date:      PropTypes.instanceOf(Date).isRequired,
  onClose:   PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({ current, bookings, onRefresh }) {
  const [showModal,    setShowModal]    = useState(false);
  const [route,        setRoute]        = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (bookings.length === 0) { setRoute([]); return; }
    setRouteLoading(true);
    buildRoute(bookings, apiKey)
      .then(r => { setRoute(r); setRouteLoading(false); })
      .catch(() => setRouteLoading(false));
  }, [bookings, apiKey]);

  const sorted = [...bookings].sort((a, b) => {
    if (!a.booking_time) return 1;
    if (!b.booking_time) return -1;
    return a.booking_time.localeCompare(b.booking_time);
  });

  const mapsLink = route && route.length > 0
    ? 'https://www.google.com/maps/dir/' +
      [BASE_ADDRESS, ...route.map(s => s.address).filter(Boolean)]
        .map(encodeURIComponent).join('/')
    : null;

  return (
    <div style={cs.dayContainer}>
      {/* Bookings pane */}
      <div style={cs.dayLeft}>
        <div style={cs.dayPaneHeader}>
          <h3 style={cs.dayPaneTitle}>Bookings ({bookings.length})</h3>
          <button style={cs.addDropInBtn} onClick={() => setShowModal(true)}>+ Schedule Drop-In</button>
        </div>

        {sorted.length === 0 && <p style={cs.emptyDay}>No bookings for this day.</p>}

        {sorted.map(b => (
          <div key={b.id} style={{ ...cs.dayCard, borderLeftColor: STATUS_COLOR[b.status] || '#999' }}>
            <div style={cs.dayCardTime}>{b.booking_time || 'TBD'}</div>
            <div style={cs.dayCardBody}>
              <span style={cs.dayCardService}>{b.services?.name || '—'}</span>
              <span style={cs.dayCardCustomer}>{b.customers?.full_name || '—'}</span>
              {b.customers?.phone && <span style={cs.dayCardDetail}>{b.customers.phone}</span>}
              {b.pets?.name && (
                <span style={cs.dayCardDetail}>{b.pets.name} ({b.pets.species})</span>
              )}
              <span style={{ ...cs.dayCardStatus, color: STATUS_COLOR[b.status] || '#999' }}>
                {b.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Route pane */}
      <div style={cs.dayRight}>
        <h3 style={cs.dayPaneTitle}>Route Plan</h3>
        <p style={cs.routeBase}>🏠 Base — {BASE_ADDRESS}</p>

        {routeLoading && <p style={cs.routeMsg}>Planning route…</p>}

        {!routeLoading && route && route.map((stop, i) => (
          <div key={stop.booking.id} style={cs.routeStop}>
            {stop.distFromPrev != null && (
              <div style={cs.routeArrow}>↓ {stop.distFromPrev} mi</div>
            )}
            <div style={cs.routeStopCard}>
              <span style={cs.routeStopNum}>{i + 1}</span>
              <div style={cs.routeStopInfo}>
                <span style={cs.routeStopName}>{stop.booking.customers?.full_name || '—'}</span>
                <span style={cs.routeStopService}>{stop.booking.services?.name || '—'}</span>
                <span style={cs.routeStopAddr}>
                  {stop.address || <em style={{ color: COLORS.lightBlue }}>No address on file</em>}
                </span>
                {stop.booking.booking_time && (
                  <span style={cs.routeStopTime}>🕐 {stop.booking.booking_time}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {!routeLoading && route && route.length === 0 && (
          <p style={cs.emptyDay}>No stops to plan.</p>
        )}

        {mapsLink && (
          <a href={mapsLink} target='_blank' rel='noopener noreferrer' style={cs.mapsLink}>
            Open full route in Google Maps ↗
          </a>
        )}
      </div>

      {showModal && (
        <DropInModal
          date={current}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

DayView.propTypes = {
  current:   PropTypes.instanceOf(Date).isRequired,
  bookings:  PropTypes.array.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function AdminCalendarPanel() {
  const [view,     setView]     = useState('month');
  const [current,  setCurrent]  = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true); setError(null);
    let startStr, endStr;

    if (view === 'day') {
      startStr = endStr = isoDate(current);
    } else if (view === 'week') {
      const ws = startOfWeek(current);
      startStr = isoDate(ws);
      endStr   = isoDate(addDays(ws, 6));
    } else {
      const ms = startOfMonth(current);
      const me = endOfMonth(current);
      startStr = isoDate(startOfWeek(ms));
      endStr   = isoDate(addDays(startOfWeek(addDays(me, 6)), 6));
    }

    const { data, error: err } = await supabase
      .from('bookings')
      .select(`
        id, booking_date, booking_end_date, booking_time, status, total_price,
        customers ( full_name, email, phone, address ),
        services  ( name ),
        pets      ( name, species )
      `)
      .gte('booking_date', startStr)
      .lte('booking_date', endStr)
      .neq('status', 'cancelled')
      .order('booking_date')
      .order('booking_time', { nullsFirst: false });

    if (err) setError(err.message);
    else setBookings(data || []);
    setLoading(false);
  }, [view, current]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  function navigate(dir) {
    setCurrent(prev => {
      const d = new Date(prev);
      if (view === 'day')   d.setDate(d.getDate() + dir);
      if (view === 'week')  d.setDate(d.getDate() + dir * 7);
      if (view === 'month') d.setMonth(d.getMonth() + dir);
      return d;
    });
  }

  function periodLabel() {
    if (view === 'day')
      return current.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (view === 'week') {
      const ws = startOfWeek(current);
      const we = addDays(ws, 6);
      return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const dayBookings = view === 'day'
    ? bookings.filter(b => b.booking_date === isoDate(current))
    : bookings;

  return (
    <div>
      {/* Calendar header */}
      <div style={cs.calHeader}>
        <div style={cs.viewToggle}>
          {['day','week','month'].map(v => (
            <button
              key={v}
              style={{ ...cs.viewBtn, ...(view === v ? cs.viewBtnActive : {}) }}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div style={cs.navRow}>
          <button style={cs.navBtn} onClick={() => navigate(-1)}>‹</button>
          <button style={cs.todayBtn} onClick={() => setCurrent(new Date())}>Today</button>
          <button style={cs.navBtn} onClick={() => navigate(1)}>›</button>
        </div>
        <span style={cs.periodLabel}>{periodLabel()}</span>
      </div>

      {loading && <p style={cs.msg}>Loading…</p>}
      {error   && <p style={cs.errMsg}>{error}</p>}

      {!loading && !error && view === 'month' && (
        <MonthView
          current={current}
          bookings={bookings}
          onDayClick={d => { setCurrent(d); setView('day'); }}
        />
      )}
      {!loading && !error && view === 'week' && (
        <WeekView
          current={current}
          bookings={bookings}
          onDayClick={d => { setCurrent(d); setView('day'); }}
        />
      )}
      {!loading && !error && view === 'day' && (
        <DayView
          current={current}
          bookings={dayBookings}
          onRefresh={fetchBookings}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cs = {
  // Header
  calHeader:    { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' },
  viewToggle:   { display: 'flex', border: `1px solid ${COLORS.lightBlue}`, borderRadius: '8px', overflow: 'hidden' },
  viewBtn: {
    padding: '0.4rem 1rem', border: 'none', background: 'none',
    fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue, cursor: 'pointer',
  },
  viewBtnActive: { background: COLORS.blue, color: COLORS.white, fontWeight: '600' },
  navRow:       { display: 'flex', gap: '0.4rem', alignItems: 'center' },
  navBtn: {
    padding: '0.35rem 0.7rem', border: `1px solid ${COLORS.lightBlue}`, borderRadius: '6px',
    background: 'none', fontFamily: FONTS.body, fontSize: '1.1rem', color: COLORS.lightBlue, cursor: 'pointer',
  },
  todayBtn: {
    padding: '0.35rem 0.85rem', border: `1px solid ${COLORS.blue}`, borderRadius: '6px',
    background: 'none', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.blue, cursor: 'pointer',
  },
  periodLabel:  { fontFamily: FONTS.header, fontSize: '1.05rem', color: COLORS.black, marginLeft: 'auto' },

  // Month
  monthGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '8px', overflow: 'hidden',
  },
  monthDayHeader: {
    padding: '0.4rem', textAlign: 'center', background: '#f0f6fd',
    fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.lightBlue,
    fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: `1px solid ${COLORS.lightBlue}`,
  },
  monthCell: {
    minHeight: '80px', padding: '0.35rem 0.4rem',
    borderRight: `1px solid #e8f0f8`, borderBottom: `1px solid #e8f0f8`,
    cursor: 'pointer', position: 'relative',
    transition: 'background 0.15s',
  },
  monthCellToday: { background: '#eef7ff' },
  cellNum:   { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.lightBlue },
  todayNum: {
    fontFamily: FONTS.body, fontSize: '0.82rem', fontWeight: '700',
    background: COLORS.blue, color: COLORS.white,
    borderRadius: '50%', padding: '1px 5px',
  },
  dotRow:    { display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '4px' },
  dot:       { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  moreDots:  { fontFamily: FONTS.body, fontSize: '0.65rem', color: COLORS.lightBlue },
  legend:    { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem', padding: '0.25rem 0' },
  legendItem: { display: 'flex', alignItems: 'center', fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.lightBlue, textTransform: 'capitalize' },

  // Week
  weekGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' },
  weekCol: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '8px', overflow: 'hidden', background: '#fff',
  },
  weekColToday: { border: `1px solid ${COLORS.blue}` },
  weekColHeader: {
    padding: '0.4rem 0.6rem', background: '#f0f6fd', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    borderBottom: `1px solid ${COLORS.lightBlue}`,
  },
  weekDayName: { fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.lightBlue, textTransform: 'uppercase' },
  weekDayNum:  { fontFamily: FONTS.body, fontSize: '0.95rem', color: COLORS.black, fontWeight: '600' },
  weekBookings: { padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', minHeight: '80px' },
  weekCard: {
    padding: '0.3rem 0.4rem', borderRadius: '4px', borderLeft: '3px solid #999',
    background: '#f8fbff', display: 'flex', flexDirection: 'column', gap: '1px',
  },
  weekCardService: { fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.black, fontWeight: '600', lineHeight: 1.2 },
  weekCardName:    { fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.lightBlue },
  weekCardTime:    { fontFamily: FONTS.body, fontSize: '0.68rem', color: '#888' },
  emptyDay:        { fontFamily: FONTS.body, fontSize: '0.8rem', color: '#bbb', textAlign: 'center', padding: '1rem 0' },

  // Day
  dayContainer: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  dayLeft:      { flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  dayRight:     { flex: '0 0 300px', background: '#f8fbff', border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px', padding: '1rem' },
  dayPaneHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  dayPaneTitle:  { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1rem', margin: 0 },
  addDropInBtn: {
    padding: '0.35rem 0.85rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '6px', fontFamily: FONTS.body, fontSize: '0.82rem',
    cursor: 'pointer', fontWeight: '600',
  },
  dayCard: {
    display: 'flex', gap: '0.75rem', padding: '0.75rem', borderRadius: '8px',
    border: `1px solid ${COLORS.lightBlue}`, borderLeft: '4px solid #999',
    background: '#fff',
  },
  dayCardTime: {
    fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.lightBlue,
    minWidth: '42px', paddingTop: '2px', textAlign: 'center',
  },
  dayCardBody:     { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  dayCardService:  { fontFamily: FONTS.body, fontWeight: '600', fontSize: '0.88rem', color: COLORS.black },
  dayCardCustomer: { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.black },
  dayCardDetail:   { fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.lightBlue },
  dayCardStatus:   { fontFamily: FONTS.body, fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize', marginTop: '2px' },

  // Route
  routeBase:  { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.lightBlue, marginBottom: '0.5rem' },
  routeMsg:   { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue, fontStyle: 'italic' },
  routeArrow: { fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.lightBlue, marginLeft: '1.5rem', margin: '2px 0 2px 1.5rem' },
  routeStop:  { marginBottom: '0.25rem' },
  routeStopCard: { display: 'flex', gap: '0.5rem', alignItems: 'flex-start' },
  routeStopNum: {
    fontFamily: FONTS.body, fontWeight: '700', fontSize: '0.8rem', color: COLORS.white,
    background: COLORS.blue, borderRadius: '50%', width: '22px', height: '22px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
  },
  routeStopInfo:    { display: 'flex', flexDirection: 'column', gap: '1px' },
  routeStopName:    { fontFamily: FONTS.body, fontSize: '0.82rem', fontWeight: '600', color: COLORS.black },
  routeStopService: { fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.lightBlue },
  routeStopAddr:    { fontFamily: FONTS.body, fontSize: '0.75rem', color: '#777' },
  routeStopTime:    { fontFamily: FONTS.body, fontSize: '0.73rem', color: COLORS.lightBlue },
  mapsLink: {
    display: 'inline-block', marginTop: '1rem', fontFamily: FONTS.body, fontSize: '0.82rem',
    color: COLORS.blue, textDecoration: 'underline',
  },

  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    background: COLORS.white, borderRadius: '12px', padding: '1.5rem',
    width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalTitle: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1.1rem', marginBottom: '0.25rem' },
  modalDate:  { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue, marginBottom: '1rem' },
  modalLabel: {
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
    fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black, marginBottom: '0.75rem',
  },
  modalInput: {
    padding: '0.5rem 0.7rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '0.95rem',
    fontFamily: FONTS.body, outline: 'none', width: '100%', boxSizing: 'border-box',
    background: COLORS.white, color: COLORS.black,
  },
  modalFooter: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' },
  cancelBtn: {
    padding: '0.5rem 1.25rem', background: 'none', border: `1px solid ${COLORS.lightBlue}`,
    borderRadius: '6px', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.lightBlue, cursor: 'pointer',
  },
  submitBtn: {
    padding: '0.5rem 1.25rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '6px', fontFamily: FONTS.body, fontSize: '0.9rem',
    fontWeight: '600', cursor: 'pointer',
  },

  // Misc
  msg:    { fontFamily: FONTS.body, color: COLORS.lightBlue, padding: '2rem', textAlign: 'center' },
  errMsg: { fontFamily: FONTS.body, color: COLORS.red, padding: '0.5rem 0' },
};
