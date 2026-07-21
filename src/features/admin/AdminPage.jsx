import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../constants.jsx';
import AdminBookingsPanel from './AdminBookingsPanel.jsx';
import AdminCalendarPanel from './AdminCalendarPanel.jsx';
import AdminInvoicesPanel from './AdminInvoicesPanel.jsx';
import AdminCustomersPanel from './AdminCustomersPanel.jsx';
import AdminSettingsPanel from './AdminSettingsPanel.jsx';

const TABS = ['Bookings', 'Calendar', 'Invoices', 'Customers', 'Settings'];

export default function AdminPage() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState(0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Admin Dashboard</h1>
          <p style={styles.email}>{user?.email}</p>
        </div>
        <button style={styles.signOutBtn} onClick={signOut}>Sign Out</button>
      </div>

      <div style={styles.tabs}>
        {TABS.map((label, i) => (
          <button
            key={label}
            style={{ ...styles.tab, ...(tab === i ? styles.tabActive : {}) }}
            onClick={() => setTab(i)}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {tab === 0 && <AdminBookingsPanel />}
        {tab === 1 && <AdminCalendarPanel />}
        {tab === 2 && <AdminInvoicesPanel />}
        {tab === 3 && <AdminCustomersPanel />}
        {tab === 4 && <AdminSettingsPanel />}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem', minHeight: '80vh' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem',
  },
  heading: { fontFamily: FONTS.header, color: COLORS.blue, marginBottom: '0.25rem' },
  email:   { fontFamily: FONTS.body, color: COLORS.lightBlue, fontSize: '0.9rem' },
  signOutBtn: {
    padding: '0.6rem 1.25rem', background: COLORS.white, color: COLORS.lightBlue,
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '8px', fontSize: '0.9rem',
    fontFamily: FONTS.body, cursor: 'pointer',
  },
  tabs: { display: 'flex', borderBottom: `2px solid ${COLORS.lightBlue}`, marginBottom: '1.5rem' },
  tab: {
    padding: '0.65rem 1.25rem', background: 'none', border: 'none',
    fontFamily: FONTS.body, fontSize: '0.95rem', color: COLORS.lightBlue,
    cursor: 'pointer', borderBottom: '3px solid transparent', marginBottom: '-2px',
  },
  tabActive: { color: COLORS.blue, borderBottomColor: COLORS.blue, fontWeight: '600' },
  content: {},
};
