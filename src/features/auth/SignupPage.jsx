import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../../utils/supabase.js';
import { COLORS } from '../../constants.jsx';

const OAUTH_REDIRECT = `${window.location.origin}/portal`;

export default function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true); // Email confirmation required before login
  }

  async function handleOAuth(provider) {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: OAUTH_REDIRECT },
    });
    if (err) setError(err.message);
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Check your email</h1>
          <p style={styles.body}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
            account, then <Link to='/login' style={styles.link}>sign in</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Create Account</h1>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSignup} style={styles.form}>
          <label style={styles.label}>Full Name
            <input style={styles.input} type='text' value={fullName}
              onChange={e => setFullName(e.target.value)} required autoComplete='name' />
          </label>
          <label style={styles.label}>Email
            <input style={styles.input} type='email' value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete='email' />
          </label>
          <label style={styles.label}>Password
            <input style={styles.input} type='password' value={password}
              onChange={e => setPassword(e.target.value)} required minLength={8}
              autoComplete='new-password' />
          </label>
          <button type='submit' style={styles.primaryBtn} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div style={styles.divider}><span>or sign up with</span></div>

        <div style={styles.oauthRow}>
          <button style={styles.oauthBtn} onClick={() => handleOAuth('google')}>Google</button>
          <button style={styles.oauthBtn} onClick={() => handleOAuth('facebook')}>Facebook</button>
          <button style={{ ...styles.oauthBtn, ...styles.oauthBtnDisabled }}
            disabled title='Apple Sign-In coming soon'>Apple</button>
        </div>

        <p style={styles.footer}>
          Already have an account? <Link to='/login' style={styles.link}>Sign in</Link>
        </p>
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
  body: {
    fontFamily: "'Lucida Sans Unicode', Arial, sans-serif",
    lineHeight: 1.6, textAlign: 'center', color: COLORS.black,
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
  divider: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    margin: '1.5rem 0 1rem', color: COLORS.lightBlue, fontSize: '0.85rem', textAlign: 'center',
  },
  oauthRow: { display: 'flex', gap: '0.75rem' },
  oauthBtn: {
    flex: 1, padding: '0.65rem', background: COLORS.white,
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '8px', cursor: 'pointer',
    fontFamily: "'Lucida Sans Unicode', Arial, sans-serif", fontSize: '0.9rem',
  },
  oauthBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  footer: {
    marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem',
    fontFamily: "'Lucida Sans Unicode', Arial, sans-serif",
  },
  link: { color: COLORS.blue },
};
