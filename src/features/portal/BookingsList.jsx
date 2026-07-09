import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import supabase from '../../utils/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../constants.jsx';
import BookingCard from './BookingCard.jsx';

export default function BookingsList({ filter }) {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [bookings,     setBookings]     = useState([]);
  const [customerPets, setCustomerPets] = useState([]);
  const [allServices,  setAllServices]  = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user.id]);

  useEffect(() => {
    supabase.from('pets').select('id, name, species')
      .eq('customer_id', user.id).order('name')
      .then(({ data }) => { if (data) setCustomerPets(data); });
  }, [user.id]);

  // Light services fetch retained only for category lookups the card may need.
  useEffect(() => {
    supabase.from('services').select('id, name, base_price, category')
      .then(({ data }) => { if (data) setAllServices(data); });
  }, []);

  async function fetchBookings() {
    setLoading(true);
    setError(null);

    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('bookings')
      .select(`
        id, booking_date, booking_end_date, booking_time, status,
        service_id, pet_id, addon_service_ids,
        base_price, travel_fee, total_price, zone, special_instructions, created_at,
        admin_modified, change_note,
        services ( name, category, base_price ),
        pets     ( name, species ),
        booking_pets ( pet_name, pets ( name, species ) ),
        booking_visits ( service_id, service_name, visit_date, shift_id, shift_label, shift_time, is_addon, unit_price, pet_count, is_quote, line_total )
      `)
      .eq('customer_id', user.id)
      .order('booking_date', { ascending: filter === 'upcoming' });

    if (filter === 'upcoming') {
      query = query
        .gte('booking_end_date', today)
        .not('status', 'in', '("cancelled","declined")');
    } else {
      query = query.or(
        `booking_end_date.lt.${today},status.eq.cancelled,status.eq.declined,status.eq.completed`
      );
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
    // Void the linked invoice as well.
    await supabase.from('invoices').update({ status: 'void' }).eq('booking_id', bookingId);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
  }

  async function handleApproveChanges(bookingId) {
    const { error: bErr } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);
    if (bErr) { alert(`Could not approve changes: ${bErr.message}`); return; }
    await supabase
      .from('invoices')
      .update({ status: 'awaiting_payment', issued_at: new Date().toISOString() })
      .eq('booking_id', bookingId);
    await fetchBookings();
  }

  async function handleDeclineChanges(bookingId) {
    const { error: bErr } = await supabase
      .from('bookings')
      .update({ status: 'declined' })
      .eq('id', bookingId);
    if (bErr) { alert(`Could not decline changes: ${bErr.message}`); return; }
    await supabase.from('invoices').update({ status: 'void' }).eq('booking_id', bookingId);
    await fetchBookings();
  }

  function handleCopy(booking) {
    navigate('/book', {
      state: {
        copyFrom: {
          service_id:           booking.service_id,
          serviceName:          booking.services?.name || '',
          pet_id:               booking.pet_id,
          petIds:               (booking.booking_pets || []).map(bp => bp.pet_id).filter(Boolean),
          petNames:             (booking.booking_pets || []).map(bp => bp.pet_name || bp.pets?.name || '').filter(Boolean),
          addon_service_ids:    booking.addon_service_ids || [],
          addonNames:           (booking.addon_service_ids || []).map(id => allServices.find(s => s.id === id)?.name || ''),
          base_price:           booking.base_price,
          zone:                 booking.zone || '',
          travel_fee:           booking.travel_fee || 0,
          special_instructions: booking.special_instructions || '',
        },
      },
    });
  }

  function handleFullEdit(booking) {
    navigate('/book', {
      state: {
        editBooking: {
          editBookingId:        booking.id,
          serviceId:            booking.service_id   || null,
          serviceName:          booking.services?.name || '',
          basePrice:            Number(booking.base_price || 0),
          addonIds:             booking.addon_service_ids || [],
          addonNames:           (booking.addon_service_ids || []).map(id => allServices.find(s => s.id === id)?.name || ''),
          petId:                booking.pet_id       || null,
          petName:              booking.pets?.name   || '',
          petIds:               (booking.booking_pets || []).map(bp => bp.pet_id).filter(Boolean),
          petNames:             (booking.booking_pets || []).map(bp => bp.pet_name || bp.pets?.name || '').filter(Boolean),
          visits:               booking.booking_visits || [],
          bookingDate:          booking.booking_date || '',
          bookingEndDate:       booking.booking_end_date || booking.booking_date || '',
          zone:                 booking.zone         || null,
          travelFee:            Number(booking.travel_fee || 0),
          totalPrice:           Number(booking.total_price || 0),
          specialInstructions:  booking.special_instructions || '',
        },
      },
    });
  }

  if (loading) return <p style={styles.msg}>Loading...</p>;
  if (error)   return <p style={styles.error}>{error}</p>;
  if (!bookings.length) return (
    <p style={styles.empty}>
      {filter === 'upcoming' ? 'No upcoming bookings.' : 'No past bookings.'}
    </p>
  );

  return (
    <div style={styles.list}>
      {bookings.map(b => (
        <BookingCard key={b.id} booking={b}
          canCancel={filter === 'upcoming' && b.status !== 'cancelled'}
          canEdit={filter === 'upcoming'   && b.status !== 'cancelled'}
          canCopy={filter === 'past'}
          allServices={allServices}
          customerPets={customerPets}
          onCancel={handleCancel}
          onFullEdit={handleFullEdit}
          onCopy={handleCopy}
          onApproveChanges={handleApproveChanges}
          onDeclineChanges={handleDeclineChanges}
        />
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
