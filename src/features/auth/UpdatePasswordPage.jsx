import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../utils/supabase.js';
import { COLORS } from '../../constants.jsx';

/**
 * Handles the deep-link from Supabase password reset emails.
 * Supabase sets the session from the URL hash before this component mounts,
 * so supabase.auth.updateUser() works without any extra token handling.
 */
export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);

  async function handleUpdate(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate('/portal', { replace: true });
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Set New Password</h1>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleUpdate} style={styles.form}>
          <label style={styles.label}>New Password
            <input style={styles.input} type='password' value={password}
              onChange={e => setPassword(e.target.value)} required minLength={8}
              autoComplete='new-password' />
          </label>
          <label style={styles.label}>Confirm Password
            <input style={styles.input} type='password' value={confirm}
              onChange={e => setConfirm(e.target.value)} required autoComplete='new-password' />
          </label>
          <button type='submit' style={styles.primaryBtn} disabled={loading}>
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: COLORS.white, padding: '1.5rem',
  },
  card: {
    background: COLORS.white, border: `1px solid ${COLORS.lightBlue}`,
    borderRadius: '12px', padding: '2.5rem 2rem', width: '100%', maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(104,175,230,0.10)',
  },
  heading: {
    fontFamily: "'Lucida Bright', Georgia, serif", color: COLORS.blue,
    marginBottom: '1.5rem', textAlign: 'center',
  },
  error: {
    background: '#fff0f0', border: `1px solid ${COLORS.red}`, borderRadius: '6px',
    color: COLORS.red, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: {
    display: 'flex', flexDirection: 'column', gap: '0.35rem',
    fontFamily: "'Lucida Sans Unicode', Arial, sans-serif", fontSize: '0.9rem', color: COLORS.black,
  },
  input: {
    padding: '0.6rem 0.8rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '1rem', outline: 'none',
  },
  primaryBtn: {
    marginTop: '0.5rem', padding: '0.75rem', background: COLORS.blue,
    color: COLORS.white, border: 'none', borderRadius: '8px', fontSize: '1rem',
    cursor: 'pointer', fontFamily: "'Lucida Sans Unicode', Arial, sans-serif",
  },
};
