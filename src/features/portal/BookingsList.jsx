import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../utils/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../constants.jsx';
import BookingCard from './BookingCard.jsx';

export default function BookingsList({ filter }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user.id]);

  async function fetchBookings() {
    setLoading(true);
    setError(null);

    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('bookings')
      .select(`
        id, booking_date, booking_time, status,
        base_price, travel_fee, total_price, zone, special_instructions, created_at,
        services ( name, category ),
        pets     ( name, species )
      `)
      .eq('customer_id', user.id)
      .order('booking_date', { ascending: filter === 'upcoming' });

    if (filter === 'upcoming') {
      query = query.gte('booking_date', today).not('status', 'eq', 'cancelled');
    } else {
      query = query.or(`booking_date.lt.${today},status.eq.cancelled`);
    }

    const { data, error: err } = await query;
    if (err) { setError(err.message); } else { setBookings(data); }
    setLoading(false);
  }

  async function handleCancel(bookingId) {
    const { error: err } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);
    if (err) { alert(`Could not cancel: ${err.message}`); return; }
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
  }

  if (loading) return <p style={styles.msg}>Loading…</p>;
  if (error)   return <p style={styles.error}>{error}</p>;
  if (!bookings.length) return (
    <p style={styles.empty}>
      {filter === 'upcoming' ? 'No upcoming bookings.' : 'No past bookings.'}{' '}
    </p>
  );

  return (
    <div style={styles.list}>
      {bookings.map(b => (
        <BookingCard key={b.id} booking={b}
          canCancel={filter === 'upcoming' && b.status !== 'cancelled'}
          onCancel={handleCancel} />
      ))}
    </div>
  );
}

BookingsList.propTypes = {
  filter: PropTypes.oneOf(['upcoming', 'past']).isRequired,
};

const styles = {
  list:  { display: 'flex', flexDirection: 'column', gap: '1rem' },
  msg:   { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  error: { fontFamily: FONTS.body, color: COLORS.red, padding: '1rem' },
  empty: { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
};
