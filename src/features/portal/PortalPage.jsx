import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { COLORS, FONTS } from '../../constants.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import supabase from '../../utils/supabase.js';
import BookingsList from './BookingsList.jsx';
import AccountSettings from './AccountSettings.jsx';
import GuidedSetup from './GuidedSetup.jsx';
import PetManager from './PetManager.jsx';
import InvoicesList from './InvoicesList.jsx';

const TABS = ['My Info', 'My Pets', 'Upcoming', 'Past Bookings', 'Invoices'];

// Maps the ?tab= query param value to a tab index
function resolveInitialTab(searchParams) {
  const param = searchParams.get('tab')?.toLowerCase();
  if (!param) return 0;
  const idx = TABS.findIndex(t => t.toLowerCase().replace(/\s+/g, '') === param.replace(/\s+/g, ''));
  return idx >= 0 ? idx : 0;
}

export default function PortalPage() {
  const { user, signOut } = useAuth();
  const [searchParams]    = useSearchParams();
  const [tab, setTab]     = useState(() => resolveInitialTab(searchParams));
  const [focusInvoiceId, setFocusInvoiceId] = useState(searchParams.get('focus') || null);
  const [setupDone, setSetupDone] = useState(true); // optimistic: avoid flash

  // React to deep links (e.g. "View invoice" from a booking, or the email link).
  useEffect(() => {
    setTab(resolveInitialTab(searchParams));
    setFocusInvoiceId(searchParams.get('focus') || null);
  }, [searchParams]);

  useEffect(() => {
    async function checkSetup() {
      const { data } = await supabase
        .from('customers')
        .select('setup_completed')
        .eq('id', user.id)
        .single();
      if (data && !data.setup_completed) setSetupDone(false);
    }
    if (user?.id) checkSetup();
  }, [user?.id]);

  return (
    <div style={styles.page}>
      {!setupDone && <GuidedSetup onComplete={() => setSetupDone(true)} />}
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
        {tab === 0 && <AccountSettings />}
        {tab === 1 && <PetManager onSelectTab={setTab} />}
        {tab === 2 && <BookingsList filter='upcoming' />}
        {tab === 3 && <BookingsList filter='past' />}
        {tab === 4 && <InvoicesList focusInvoiceId={focusInvoiceId} />}
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
    border: '1px solid ' + COLORS.lightBlue, borderRadius: '8px', fontSize: '0.9rem',
    fontFamily: FONTS.body, cursor: 'pointer',
  },
  tabs: {
    display: 'flex', borderBottom: '2px solid ' + COLORS.lightBlue, marginBottom: '1.5rem',
    // Scrolls horizontally instead of overflowing/wrapping when all 5 tabs don't
    // fit a phone-width screen (MR-3) — a no-op on wider screens where they fit.
    overflowX: 'auto', WebkitOverflowScrolling: 'touch',
  },
  tab: {
    padding: '0.65rem 1.25rem', background: 'none', border: 'none',
    fontFamily: FONTS.body, fontSize: '0.95rem', color: COLORS.lightBlue,
    cursor: 'pointer', borderBottom: '3px solid transparent', marginBottom: '-2px',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  tabActive: { color: COLORS.blue, borderBottomColor: COLORS.blue, fontWeight: '600' },
  content: {},
};
