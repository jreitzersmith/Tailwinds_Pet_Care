import { useState } from 'react';
import { Link } from 'react-router-dom';
import { COLORS, FONTS } from '../../constants.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import BookingsList from './BookingsList.jsx';
import PetManager from './PetManager.jsx';

const TABS = ['Upcoming', 'Past Bookings', 'My Pets'];

export default function PortalPage() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState(0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>My Account</h1>
          <p style={styles.email}>{user?.email}</p>
        </div>
        <div style={styles.headerActions}>
          <Link to='/book' style={styles.bookBtn}>+ Book a Service</Link>
          <button style={styles.signOutBtn} onClick={signOut}>Sign Out</button>
        </div>
      </div>

      <div style={styles.tabs}>
        {TABS.map((label, i) => (
          <button key={label}
            style={{ ...styles.tab, ...(tab === i ? styles.tabActive : {}) }}
            onClick={() => setTab(i)}>
            {label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {tab === 0 && <BookingsList filter='upcoming' />}
        {tab === 1 && <BookingsList filter='past' />}
        {tab === 2 && <PetManager />}
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: '760px', margin: '0 auto', padding: '2rem 1rem', minHeight: '80vh',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem',
  },
  heading: {
    fontFamily: FONTS.header, color: COLORS.blue, marginBottom: '0.25rem',
  },
  email: {
    fontFamily: FONTS.body, color: COLORS.lightBlue, fontSize: '0.9rem',
  },
  headerActions: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  bookBtn: {
    padding: '0.6rem 1.25rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '8px', fontSize: '0.9rem',
    fontFamily: FONTS.body, textDecoration: 'none', cursor: 'pointer',
  },
  signOutBtn: {
    padding: '0.6rem 1.25rem', background: COLORS.white, color: COLORS.lightBlue,
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '8px', fontSize: '0.9rem',
    fontFamily: FONTS.body, cursor: 'pointer',
  },
  tabs: {
    display: 'flex', borderBottom: `2px solid ${COLORS.lightBlue}`, marginBottom: '1.5rem',
  },
  tab: {
    padding: '0.65rem 1.25rem', background: 'none', border: 'none',
    fontFamily: FONTS.body, fontSize: '0.95rem', color: COLORS.lightBlue,
    cursor: 'pointer', borderBottom: '3px solid transparent', marginBottom: '-2px',
  },
  tabActive: { color: COLORS.blue, borderBottomColor: COLORS.blue, fontWeight: '600' },
  content: {},
};
