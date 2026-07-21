import { useEffect, useState, useCallback } from 'react';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';
import PropTypes from 'prop-types';

const BOOKING_STATUS_STYLE = {
  pending:     { bg: '#FFF3CD', color: '#856404' },
  confirmed:   { bg: '#D4EDDA', color: '#155724' },
  in_progress: { bg: '#CCE5FF', color: '#004085' },
  completed:   { bg: '#E2E3E5', color: '#383d41' },
  cancelled:   { bg: '#F8D7DA', color: '#721c24' },
};

function statusStyle(s) {
  return BOOKING_STATUS_STYLE[s] || { bg: '#eee', color: '#333' };
}

// ── Customer row ──────────────────────────────────────────────────────────────
function CustomerRow({ customer }) {
  const [expanded, setExpanded]   = useState(false);
  const [bookings, setBookings]   = useState(null);
  const [loadingB, setLoadingB]   = useState(false);

  async function loadBookings() {
    if (bookings !== null) return; // already loaded
    setLoadingB(true);
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_date, booking_end_date, status, total_price, services(name), pets(name, species)')
      .eq('customer_id', customer.id)
      .order('booking_date', { ascending: false });
    setBookings(data || []);
    setLoadingB(false);
  }

  function handleToggle() {
    if (!expanded) loadBookings();
    setExpanded(x => !x);
  }

  const petList = customer.pets || [];
  const bookingCount = customer.booking_count ?? '—';
  const joinDate = customer.created_at
    ? new Date(customer.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

  return (
    <div style={styles.row}>
      {/* Collapsed header */}
      <div style={styles.rowMain} onClick={handleToggle}>
        <div style={styles.rowLeft}>
          <span style={styles.customerName}>{customer.full_name || '(no name)'}</span>
          <span style={styles.customerEmail}>{customer.email}</span>
        </div>
        <div style={styles.rowMid}>
          {customer.airline && (
            <span style={styles.chip}>{customer.airline}</span>
          )}
          {customer.is_admin && (
            <span style={{ ...styles.chip, background: '#CCE5FF', color: '#004085' }}>Admin</span>
          )}
        </div>
        <div style={styles.rowRight}>
          <span style={styles.stat}>{petList.length} pet{petList.length !== 1 ? 's' : ''}</span>
          <span style={styles.stat}>{bookingCount} booking{bookingCount !== 1 ? 's' : ''}</span>
          <span style={styles.expandCaret}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={styles.rowDetail}>
          {/* Account info */}
          <div style={styles.section}>
            <p style={styles.sectionTitle}>Account Details</p>
            <div style={styles.detailGrid}>
              <span style={styles.detailLabel}>Email</span>
              <span style={styles.detailValue}>{customer.email}</span>
              <span style={styles.detailLabel}>Full Name</span>
              <span style={styles.detailValue}>{customer.full_name || '—'}</span>
              <span style={styles.detailLabel}>Phone</span>
              <span style={styles.detailValue}>{customer.phone || '—'}</span>
              <span style={styles.detailLabel}>Airline</span>
              <span style={styles.detailValue}>{customer.airline || '—'}</span>
              <span style={styles.detailLabel}>Joined</span>
              <span style={styles.detailValue}>{joinDate}</span>
              <span style={styles.detailLabel}>Admin</span>
              <span style={styles.detailValue}>{customer.is_admin ? 'Yes' : 'No'}</span>
              <span style={styles.detailLabel}>Customer ID</span>
              <span style={{ ...styles.detailValue, fontSize: '0.78rem', fontFamily: 'monospace', color: COLORS.lightBlue }}>{customer.id}</span>
            </div>
          </div>

          {/* Pets */}
          <div style={styles.section}>
            <p style={styles.sectionTitle}>Pets ({petList.length})</p>
            {petList.length === 0 ? (
              <p style={styles.emptyNote}>No pets on file.</p>
            ) : (
              <div style={styles.petsGrid}>
                {petList.map(pet => (
                  <div key={pet.id} style={styles.petCard}>
                    <span style={styles.petName}>{pet.name}</span>
                    <span style={styles.petSpecies}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</span>
                    {pet.notes && <span style={styles.petNotes}>{pet.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bookings */}
          <div style={styles.section}>
            <p style={styles.sectionTitle}>Booking History</p>
            {loadingB && <p style={styles.emptyNote}>Loading…</p>}
            {!loadingB && bookings !== null && bookings.length === 0 && (
              <p style={styles.emptyNote}>No bookings yet.</p>
            )}
            {!loadingB && bookings !== null && bookings.length > 0 && (
              <div style={styles.bookingList}>
                {bookings.map(b => {
                  const ss = statusStyle(b.status);
                  const dateRange = b.booking_end_date && b.booking_end_date !== b.booking_date
                    ? `${b.booking_date} – ${b.booking_end_date}`
                    : b.booking_date;
                  return (
                    <div key={b.id} style={styles.bookingItem}>
                      <span style={styles.bookingDate}>{dateRange}</span>
                      <span style={styles.bookingService}>{b.services?.name || '—'}</span>
                      <span style={styles.bookingPet}>{b.pets?.name ? `${b.pets.name} (${b.pets.species})` : '—'}</span>
                      <span style={{ ...styles.bookingBadge, background: ss.bg, color: ss.color }}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                      <span style={styles.bookingPrice}>${Number(b.total_price || 0).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

CustomerRow.propTypes = {
  customer: PropTypes.object.isRequired,
};

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AdminCustomersPanel() {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('customers')
      .select(`
        id, email, full_name, phone, airline, is_admin, created_at,
        pets ( id, name, species, breed, notes ),
        bookings ( id )
      `)
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else {
      // Compute booking count from the joined data
      const enriched = (data || []).map(c => ({
        ...c,
        booking_count: c.bookings?.length ?? 0,
      }));
      setCustomers(enriched);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = customers.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.email || '').toLowerCase().includes(q) ||
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.airline || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={styles.topBar}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="Search by name, email, or airline…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={styles.countLabel}>
          {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading && <p style={styles.msg}>Loading customers…</p>}
      {error   && <p style={styles.err}>{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p style={styles.empty}>{search ? 'No customers match your search.' : 'No customers yet.'}</p>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div style={styles.list}>
          {filtered.map(c => (
            <CustomerRow key={c.id} customer={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  topBar: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  searchInput: {
    flex: '1 1 280px', padding: '0.45rem 0.8rem', borderRadius: '8px',
    border: `1px solid ${COLORS.lightBlue}`, fontFamily: FONTS.body, fontSize: '0.9rem',
    color: COLORS.black, outline: 'none',
  },
  countLabel: { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue, whiteSpace: 'nowrap' },
  list:  { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  msg:   { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  err:   { fontFamily: FONTS.body, color: COLORS.red, padding: '1rem' },
  empty: { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },

  row: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px',
    overflow: 'hidden', background: '#fff',
  },
  rowMain: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
    padding: '0.85rem 1.1rem', cursor: 'pointer',
  },
  rowLeft:  { flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '2px' },
  rowMid:   { flex: '1 1 120px', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' },
  rowRight: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' },

  customerName:  { fontFamily: FONTS.body, fontWeight: '600', fontSize: '0.9rem', color: COLORS.black },
  customerEmail: { fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.lightBlue },
  chip: {
    padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem',
    fontWeight: '600', fontFamily: FONTS.body, background: '#FFF3CD', color: '#856404',
  },
  stat:        { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.black },
  expandCaret: { fontFamily: FONTS.body, color: COLORS.lightBlue, fontSize: '0.75rem' },

  rowDetail: { borderTop: `1px solid ${COLORS.lightBlue}`, padding: '1rem 1.1rem', background: '#fafcff' },
  section:   { marginBottom: '1.25rem' },
  sectionTitle: {
    fontFamily: FONTS.header, color: COLORS.blue, fontSize: '0.95rem',
    fontWeight: '600', marginBottom: '0.6rem', margin: '0 0 0.5rem',
  },
  detailGrid: {
    display: 'grid', gridTemplateColumns: '130px 1fr', gap: '0.3rem 1rem',
    fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  detailLabel: { color: COLORS.lightBlue, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em', alignSelf: 'start', paddingTop: '2px' },
  detailValue: { color: COLORS.black },
  emptyNote:   { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue, fontStyle: 'italic', margin: 0 },

  petsGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  petCard: {
    display: 'flex', flexDirection: 'column', gap: '2px',
    padding: '0.5rem 0.85rem', borderRadius: '8px',
    border: `1px solid ${COLORS.lightBlue}`, background: '#fff',
    minWidth: '130px',
  },
  petName:    { fontFamily: FONTS.body, fontWeight: '600', fontSize: '0.88rem', color: COLORS.black },
  petSpecies: { fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.lightBlue },
  petNotes:   { fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.black, fontStyle: 'italic' },

  bookingList: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  bookingItem: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem 1rem',
    padding: '0.4rem 0.7rem', borderRadius: '6px', background: '#fff',
    border: `1px solid #eef1f5`,
  },
  bookingDate:    { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.black, fontWeight: '600', minWidth: '120px' },
  bookingService: { fontFamily: FONTS.body, fontSize: '0.82rem', color: COLORS.black },
  bookingPet:     { fontFamily: FONTS.body, fontSize: '0.78rem', color: COLORS.lightBlue },
  bookingBadge: {
    padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem',
    fontWeight: '600', fontFamily: FONTS.body, textTransform: 'capitalize',
  },
  bookingPrice: { fontFamily: FONTS.body, fontWeight: '700', color: COLORS.blue, fontSize: '0.85rem', marginLeft: 'auto' },
};
