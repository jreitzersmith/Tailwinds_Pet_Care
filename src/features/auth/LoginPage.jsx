import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import supabase from '../../utils/supabase.js';
import { COLORS } from '../../constants.jsx';

const OAUTH_REDIRECT = `${window.location.origin}/portal`;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/portal';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate(from, { replace: true });
  }

  async function handleOAuth(provider) {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: OAUTH_REDIRECT },
    });
    if (err) setError(err.message);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Sign In</h1>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleEmailLogin} style={styles.form}>
          <label style={styles.label}>Email
            <input style={styles.input} type='email' value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete='email' />
          </label>
          <label style={styles.label}>Password
            <input style={styles.input} type='password' value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete='current-password' />
          </label>
          <button type='submit' style={styles.primaryBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={styles.divider}><span>or continue with</span></div>

        <div style={styles.oauthRow}>
          <button style={styles.oauthBtn} onClick={() => handleOAuth('google')}>Google</button>
          <button style={styles.oauthBtn} onClick={() => handleOAuth('facebook')}>Facebook</button>
          {/* Apple Developer account pending renewal — stub disabled */}
          <button style={{ ...styles.oauthBtn, ...styles.oauthBtnDisabled }}
            disabled title='Apple Sign-In coming soon'>Apple</button>
        </div>

        <p style={styles.footer}>
          <Link to='/reset-password' style={styles.link}>Forgot password?</Link>
          {' · '}
          <Link to='/signup' style={styles.link}>Create account</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: COLORS.white,
    padding: '1.5rem',
  },
  card: {
    background: COLORS.white,
    border: `1px solid ${COLORS.lightBlue}`,
    borderRadius: '12px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(104,175,230,0.10)',
  },
  heading: {
    fontFamily: "'Lucida Bright', Georgia, serif",
    color: COLORS.blue,
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  error: {
    background: '#fff0f0',
    border: `1px solid ${COLORS.red}`,
    borderRadius: '6px',
    color: COLORS.red,
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    fontSize: '0.9rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontFamily: "'Lucida Sans Unicode', Arial, sans-serif",
    fontSize: '0.9rem',
    color: COLORS.black,
  },
  input: {
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`,
    fontSize: '1rem',
    outline: 'none',
  },
  primaryBtn: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    background: COLORS.blue,
    color: COLORS.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontFamily: "'Lucida Sans Unicode', Arial, sans-serif",
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '1.5rem 0 1rem',
    color: COLORS.lightBlue,
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  oauthRow: { display: 'flex', gap: '0.75rem' },
  oauthBtn: {
    flex: 1,
    padding: '0.65rem',
    background: COLORS.white,
    border: `1px solid ${COLORS.lightBlue}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'Lucida Sans Unicode', Arial, sans-serif",
    fontSize: '0.9rem',
  },
  oauthBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.875rem',
    fontFamily: "'Lucida Sans Unicode', Arial, sans-serif",
  },
  link: { color: COLORS.blue },
};
