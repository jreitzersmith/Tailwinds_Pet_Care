import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';

// Square Web Payments SDK config (sandbox by default).
const SQUARE_ENV = import.meta.env.VITE_SQUARE_ENV || 'sandbox';
const IS_PROD    = SQUARE_ENV === 'production';
const SDK_URL    = IS_PROD
  ? 'https://web.squarecdn.com/v1/square.js'
  : 'https://sandbox.web.squarecdn.com/v1/square.js';
const APP_ID     = IS_PROD
  ? import.meta.env.VITE_SQUARE_APP_ID_PROD
  : import.meta.env.VITE_SQUARE_APP_ID_SANDBOX;
const LOCATION_ID = IS_PROD
  ? import.meta.env.VITE_SQUARE_LOCATION_ID_PROD
  : import.meta.env.VITE_SQUARE_LOCATION_ID_SANDBOX;

let sdkPromise = null;
function loadSquareSdk() {
  if (window.Square) return Promise.resolve(window.Square);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.onload  = () => resolve(window.Square);
    s.onerror = () => reject(new Error('Could not load the Square payment library.'));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export default function PayNowButton({ invoice, onPaid }) {
  const [open, setOpen]         = useState(false);
  const [ready, setReady]       = useState(false);
  const [status, setStatus]     = useState('idle'); // idle | loading | paying | done
  const [error, setError]       = useState(null);
  const cardRef   = useRef(null);   // Square card instance
  const paymentsRef = useRef(null);
  const containerRef = useRef(null);

  const amount = Number(invoice?.total_amount || 0);
  const configOk = !!APP_ID && !!LOCATION_ID;

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!open || cardRef.current) return;
      if (!configOk) { setError('Online payment is not configured yet. Please contact Tailwinds to pay.'); return; }
      setStatus('loading'); setError(null);
      try {
        const Square = await loadSquareSdk();
        if (cancelled) return;
        const payments = Square.payments(APP_ID, LOCATION_ID);
        paymentsRef.current = payments;
        const card = await payments.card();
        await card.attach(containerRef.current);
        if (cancelled) { card.destroy?.(); return; }
        cardRef.current = card;
        setReady(true);
        setStatus('idle');
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Payment setup failed.'); setStatus('idle'); }
      }
    }
    init();
    return () => {
      cancelled = true;
      if (cardRef.current) { cardRef.current.destroy?.(); cardRef.current = null; }
      setReady(false);
    };
  }, [open, configOk]);

  async function handlePay() {
    if (!cardRef.current) return;
    setStatus('paying'); setError(null);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== 'OK') {
        throw new Error(result.errors?.[0]?.message || 'Card could not be verified.');
      }
      const { data, error: fnErr } = await supabase.functions.invoke('charge-invoice', {
        body: { invoiceId: invoice.id, sourceId: result.token, appId: APP_ID },
      });
      if (fnErr) {
        // Surface the real error the edge function returned (e.g. a Square message).
        let detail = fnErr.message || 'Payment failed.';
        try {
          const body = await fnErr.context?.json?.();
          if (body?.error) detail = body.error;
        } catch { /* keep generic message */ }
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      setStatus('done');
      onPaid?.();
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setStatus('idle');
    }
  }

  if (status === 'done') {
    return <p style={styles.paidNote}>✓ Payment received — thank you!</p>;
  }

  if (!open) {
    return (
      <button style={styles.payBtn} onClick={() => setOpen(true)}>
        Pay ${amount.toFixed(2)} Now
      </button>
    );
  }

  return (
    <div style={styles.wrap}>
      {SQUARE_ENV !== 'production' && (
        <p style={styles.sandboxNote}>Test mode — use card 4111 1111 1111 1111, any future date, any CVV/ZIP.</p>
      )}
      {status === 'loading' && <p style={styles.note}>Loading secure payment form…</p>}
      <div ref={containerRef} style={styles.cardContainer} />
      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.btnRow}>
        <button
          style={{ ...styles.payBtn, opacity: ready && status !== 'paying' ? 1 : 0.6 }}
          onClick={handlePay}
          disabled={!ready || status === 'paying'}
        >
          {status === 'paying' ? 'Processing…' : `Pay $${amount.toFixed(2)}`}
        </button>
        <button style={styles.cancelBtn} onClick={() => setOpen(false)} disabled={status === 'paying'}>
          Cancel
        </button>
      </div>
    </div>
  );
}

PayNowButton.propTypes = {
  invoice: PropTypes.shape({
    id: PropTypes.string.isRequired,
    total_amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  onPaid: PropTypes.func,
};

const styles = {
  wrap:          { border: `1px solid ${COLORS.lightBlue}`, borderRadius: '8px', padding: '0.85rem', marginTop: '0.5rem', background: '#f8fbff' },
  cardContainer: { minHeight: '44px', marginBottom: '0.6rem' },
  sandboxNote:   { fontFamily: FONTS.body, fontSize: '0.78rem', color: '#8a4e00', margin: '0 0 0.5rem' },
  note:          { fontFamily: FONTS.body, fontSize: '0.83rem', color: COLORS.lightBlue, margin: '0 0 0.5rem' },
  error:         { fontFamily: FONTS.body, fontSize: '0.83rem', color: COLORS.red, margin: '0.25rem 0' },
  paidNote:      { fontFamily: FONTS.body, fontSize: '0.9rem', color: '#155724', fontWeight: 600, margin: 0 },
  btnRow:        { display: 'flex', gap: '0.6rem', alignItems: 'center' },
  payBtn:        { padding: '0.6rem 1.4rem', background: COLORS.blue, color: COLORS.white, border: 'none', borderRadius: '7px', fontFamily: FONTS.body, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' },
  cancelBtn:     { padding: '0.6rem 1rem', background: COLORS.white, color: COLORS.blue, border: `1px solid ${COLORS.lightBlue}`, borderRadius: '7px', fontFamily: FONTS.body, fontSize: '0.9rem', cursor: 'pointer' },
};
