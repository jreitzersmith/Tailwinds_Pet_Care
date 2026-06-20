import { useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../utils/supabase.js';
import { COLORS } from '../../constants.jsx';

export default function ResetPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Email sent</h1>
          <p style={styles.body}>
            Check <strong>{email}</strong> for a password reset link. It expires in 1 hour.
          </p>
          <p style={{ ...styles.body, marginTop: '1rem' }}>
            <Link to='/login' style={styles.link}>Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Reset Password</h1>
        <p style={styles.body}>Enter your email and we will send you a reset link.</p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleReset} style={styles.form}>
          <label style={styles.label}>Email
            <input style={styles.input} type='email' value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete='email' />
          </label>
          <button type='submit' style={styles.primaryBtn} disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <p style={styles.footer}>
          <Link to='/login' style={styles.link}>Back to sign in</Link>
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
    marginBottom: '1rem', textAlign: 'center',
  },
  body: {
    fontFamily: "'Lucida Sans Unicode', Arial, sans-serif",
    lineHeight: 1.6, color: COLORS.black, textAlign: 'center', marginBottom: '1.25rem',
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
  footer: {
    marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem',
    fontFamily: "'Lucida Sans Unicode', Arial, sans-serif",
  },
  link: { color: COLORS.blue },
};
