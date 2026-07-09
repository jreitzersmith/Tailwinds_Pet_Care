import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';

// ── Square (card + Google Pay) config ──
const SQUARE_ENV = import.meta.env.VITE_SQUARE_ENV || 'sandbox';
const SQ_IS_PROD = SQUARE_ENV === 'production';
const SQ_SDK_URL = SQ_IS_PROD ? 'https://web.squarecdn.com/v1/square.js'
                              : 'https://sandbox.web.squarecdn.com/v1/square.js';
const SQ_APP_ID  = SQ_IS_PROD ? import.meta.env.VITE_SQUARE_APP_ID_PROD
                              : import.meta.env.VITE_SQUARE_APP_ID_SANDBOX;
const SQ_LOCATION = SQ_IS_PROD ? import.meta.env.VITE_SQUARE_LOCATION_ID_PROD
                               : import.meta.env.VITE_SQUARE_LOCATION_ID_SANDBOX;

// ── PayPal config ──
const PP_ENV = import.meta.env.VITE_PAYPAL_ENV || SQUARE_ENV || 'sandbox';
const PP_CLIENT_ID = PP_ENV === 'production'
  ? import.meta.env.VITE_PAYPAL_CLIENT_ID_PROD
  : import.meta.env.VITE_PAYPAL_CLIENT_ID_SANDBOX;

let sqSdkPromise = null;
function loadSquareSdk() {
  if (window.Square) return Promise.resolve(window.Square);
  if (sqSdkPromise) return sqSdkPromise;
  sqSdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SQ_SDK_URL;
    s.onload = () => resolve(window.Square);
    s.onerror = () => reject(new Error('Could not load the Square payment library.'));
    document.head.appendChild(s);
  });
  return sqSdkPromise;
}

let ppSdkPromise = null;
function loadPayPalSdk() {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (ppSdkPromise) return ppSdkPromise;
  ppSdkPromise = new Promise((resolve, reject) => {
    if (!PP_CLIENT_ID) { reject(new Error('PayPal is not configured.')); return; }
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PP_CLIENT_ID)}&currency=USD&intent=capture`;
    s.onload = () => resolve(window.paypal);
    s.onerror = () => reject(new Error('Could not load PayPal.'));
    document.head.appendChild(s);
  });
  return ppSdkPromise;
}

export default function PayNowButton({ invoice, onPaid }) {
  const [open, setOpen]     = useState(false);
  const [method, setMethod] = useState(null);           // 'card' | 'gpay' | 'paypal'
  const [status, setStatus] = useState('idle');         // idle | loading | paying | done
  const [error, setError]   = useState(null);
  const [cardReady, setCardReady] = useState(false);

  const paymentsRef = useRef(null);
  const cardRef     = useRef(null);
  const cardBox     = useRef(null);
  const gpayBox     = useRef(null);
  const paypalBox   = useRef(null);
  const paypalRendered = useRef(false);

  const amount   = Number(invoice?.total_amount || 0);
  const sqConfig = !!SQ_APP_ID && !!SQ_LOCATION;

  async function chargeSquareToken(token) {
    setStatus('paying'); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('charge-invoice', {
        body: { invoiceId: invoice.id, sourceId: token, appId: SQ_APP_ID },
      });
      if (fnErr) {
        let detail = fnErr.message || 'Payment failed.';
        try { const b = await fnErr.context?.json?.(); if (b?.error) detail = b.error; } catch { /* */ }
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      setStatus('done'); onPaid?.();
    } catch (e) { setError(e.message); setStatus('idle'); }
  }

  // Initialise Square payments instance when a Square method is chosen.
  useEffect(() => {
    let cancelled = false;
    async function initSquare() {
      if (paymentsRef.current || (method !== 'card' && method !== 'gpay')) return;
      if (!sqConfig) { setError('Card payment is not configured yet.'); return; }
      setStatus('loading'); setError(null);
      try {
        const Square = await loadSquareSdk();
        if (cancelled) return;
        paymentsRef.current = Square.payments(SQ_APP_ID, SQ_LOCATION);
        setStatus('idle');
      } catch (e) { if (!cancelled) { setError(e.message); setStatus('idle'); } }
    }
    initSquare();
    return () => { cancelled = true; };
  }, [method, sqConfig]);

  // Card form
  useEffect(() => {
    let cancelled = false;
    async function attachCard() {
      if (method !== 'card' || !paymentsRef.current || cardRef.current) return;
      try {
        const card = await paymentsRef.current.card();
        await card.attach(cardBox.current);
        if (cancelled) { card.destroy?.(); return; }
        cardRef.current = card; setCardReady(true);
      } catch (e) { if (!cancelled) setError(e.message); }
    }
    attachCard();
    return () => {
      if (method !== 'card' && cardRef.current) { cardRef.current.destroy?.(); cardRef.current = null; setCardReady(false); }
      cancelled = true;
    };
  }, [method, status]);

  // Google Pay
  useEffect(() => {
    let cancelled = false; let gpay;
    async function initGpay() {
      if (method !== 'gpay' || !paymentsRef.current || !gpayBox.current) return;
      try {
        const req = paymentsRef.current.paymentRequest({
          countryCode: 'US', currencyCode: 'USD',
          total: { amount: amount.toFixed(2), label: 'Total' },
        });
        gpay = await paymentsRef.current.googlePay(req);
        await gpay.attach(gpayBox.current, { buttonColor: 'black', buttonType: 'long' });
        if (cancelled) return;
        gpayBox.current.addEventListener('click', async () => {
          try {
            const r = await gpay.tokenize();
            if (r.status === 'OK') chargeSquareToken(r.token);
            else setError(r.errors?.[0]?.message || 'Google Pay was cancelled.');
          } catch (e) { setError(e.message); }
        });
      } catch (e) { if (!cancelled) setError('Google Pay is unavailable on this device/browser.'); }
    }
    initGpay();
    return () => { cancelled = true; };
  }, [method]);

  // PayPal buttons
  useEffect(() => {
    let cancelled = false;
    async function initPaypal() {
      if (method !== 'paypal' || paypalRendered.current || !paypalBox.current) return;
      if (!PP_CLIENT_ID) { setError('PayPal is not configured yet.'); return; }
      setStatus('loading'); setError(null);
      try {
        const paypal = await loadPayPalSdk();
        if (cancelled) return;
        paypalRendered.current = true;
        setStatus('idle');
        paypal.Buttons({
          style: { layout: 'horizontal', height: 40, tagline: false },
          createOrder: async () => {
            const { data, error: e } = await supabase.functions.invoke('paypal-order', {
              body: { action: 'create', invoiceId: invoice.id },
            });
            if (e || data?.error) throw new Error(data?.error || e.message);
            return data.id;
          },
          onApprove: async (d) => {
            setStatus('paying');
            const { data, error: e } = await supabase.functions.invoke('paypal-order', {
              body: { action: 'capture', invoiceId: invoice.id, orderId: d.orderID },
            });
            if (e || data?.error) { setError(data?.error || e.message); setStatus('idle'); return; }
            setStatus('done'); onPaid?.();
          },
          onError: (err) => setError(err?.message || 'PayPal payment failed.'),
        }).render(paypalBox.current);
      } catch (e) { if (!cancelled) { setError(e.message); setStatus('idle'); } }
    }
    initPaypal();
    return () => { cancelled = true; };
  }, [method]);

  async function payCard() {
    if (!cardRef.current) return;
    setStatus('paying'); setError(null);
    try {
      const r = await cardRef.current.tokenize();
      if (r.status !== 'OK') throw new Error(r.errors?.[0]?.message || 'Card could not be verified.');
      await chargeSquareToken(r.token);
    } catch (e) { setError(e.message); setStatus('idle'); }
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
        <p style={styles.sandboxNote}>Test mode — card 4111 1111 1111 1111, any future date, any CVV/ZIP.</p>
      )}

      {/* Method selector */}
      <div style={styles.methodRow}>
        {[['card', 'Credit / Debit Card'], ['gpay', 'Google Pay'], ['paypal', 'PayPal']].map(([m, label]) => (
          <button key={m}
            style={{ ...styles.methodBtn, ...(method === m ? styles.methodBtnActive : {}) }}
            onClick={() => { setError(null); setMethod(m); }}>
            {label}
          </button>
        ))}
      </div>

      {status === 'loading' && <p style={styles.note}>Loading…</p>}

      {method === 'card' && (
        <div>
          <div ref={cardBox} style={styles.cardContainer} />
          <button style={{ ...styles.payBtn, opacity: cardReady && status !== 'paying' ? 1 : 0.6 }}
            onClick={payCard} disabled={!cardReady || status === 'paying'}>
            {status === 'paying' ? 'Processing…' : `Pay $${amount.toFixed(2)}`}
          </button>
        </div>
      )}

      {method === 'gpay' && <div ref={gpayBox} style={styles.gpayContainer} />}

      {method === 'paypal' && <div ref={paypalBox} style={styles.paypalContainer} />}

      {error && <p style={styles.error}>{error}</p>}

      <button style={styles.cancelBtn} onClick={() => setOpen(false)} disabled={status === 'paying'}>
        Cancel
      </button>
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
  methodRow:     { display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' },
  methodBtn:     { padding: '0.4rem 0.75rem', border: `1px solid ${COLORS.lightBlue}`, background: COLORS.white, color: COLORS.blue, borderRadius: '6px', fontFamily: FONTS.body, fontSize: '0.83rem', cursor: 'pointer' },
  methodBtnActive: { background: COLORS.blue, color: COLORS.white, borderColor: COLORS.blue },
  cardContainer: { minHeight: '44px', marginBottom: '0.6rem' },
  gpayContainer: { minHeight: '44px', marginBottom: '0.4rem' },
  paypalContainer: { minHeight: '44px', marginBottom: '0.4rem' },
  sandboxNote:   { fontFamily: FONTS.body, fontSize: '0.78rem', color: '#8a4e00', margin: '0 0 0.5rem' },
  note:          { fontFamily: FONTS.body, fontSize: '0.83rem', color: COLORS.lightBlue, margin: '0 0 0.5rem' },
  error:         { fontFamily: FONTS.body, fontSize: '0.83rem', color: COLORS.red, margin: '0.25rem 0' },
  paidNote:      { fontFamily: FONTS.body, fontSize: '0.9rem', color: '#155724', fontWeight: 600, margin: 0 },
  payBtn:        { padding: '0.6rem 1.4rem', background: COLORS.blue, color: COLORS.white, border: 'none', borderRadius: '7px', fontFamily: FONTS.body, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' },
  cancelBtn:     { display: 'block', marginTop: '0.6rem', padding: '0.4rem 0', background: 'none', color: COLORS.lightBlue, border: 'none', fontFamily: FONTS.body, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' },
};
