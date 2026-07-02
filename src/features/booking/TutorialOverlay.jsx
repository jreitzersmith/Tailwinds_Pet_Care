import { useState } from 'react';
import PropTypes from 'prop-types';
import { COLORS, FONTS } from '../../constants.jsx';

const STEPS = [
  {
    title: 'Choose a Service',
    body:  'Browse the service cards and click the one that fits your needs. Each card shows the name, description, and base price. Select one, then tap "Continue".',
  },
  {
    title: 'Pick a Date & Time',
    body:  'Select the date you need service. Adding a preferred start time is optional. Once your date is set, tap "Continue".',
  },
  {
    title: 'Select or Add Your Pet',
    body:  'Choose an existing pet from your list, or add a new one right here. Fill in the species and weight so we can prepare for the visit. Tap "Continue".',
  },
  {
    title: 'Review & Confirm',
    body:  'Enter your service address to calculate the travel fee. Review the pricing summary, add any special instructions, then hit "Confirm Booking".',
  },
];

export default function TutorialOverlay({ currentStep, onDismiss }) {
  const [minimized, setMinimized] = useState(false);

  const step   = STEPS[Math.min(currentStep, STEPS.length - 1)];
  const isLast = currentStep >= STEPS.length - 1;

  if (minimized) {
    return (
      <button style={s.minBtn} onClick={() => setMinimized(false)}>
        ? Tutorial
      </button>
    );
  }

  return (
    <div style={s.panel}>
      <div style={s.panelHeader}>
        <span style={s.panelTitle}>Tutorial</span>
        <div style={s.headerActions}>
          <button style={s.iconBtn} onClick={() => setMinimized(true)} title='Minimize'>−</button>
          <button style={s.iconBtn} onClick={onDismiss} title='Dismiss'>✕</button>
        </div>
      </div>

      <div style={s.dots}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            ...s.dot,
            ...(i === currentStep ? s.dotActive : i < currentStep ? s.dotDone : {}),
          }} />
        ))}
      </div>

      <h3 style={s.stepTitle}>Step {currentStep + 1}: {step.title}</h3>
      <p style={s.stepBody}>{step.body}</p>

      {isLast && (
        <button style={s.finishBtn} onClick={onDismiss}>Finish Tutorial</button>
      )}
    </div>
  );
}

TutorialOverlay.propTypes = {
  currentStep: PropTypes.number.isRequired,
  onDismiss:   PropTypes.func.isRequired,
};

const s = {
  panel: {
    position: 'fixed', bottom: '1.5rem', right: '1.5rem',
    width: '270px', background: COLORS.white,
    border: `2px solid ${COLORS.blue}`, borderRadius: '14px',
    padding: '1.25rem', boxShadow: '0 4px 24px rgba(104,175,230,0.3)',
    zIndex: 900,
  },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '0.75rem',
  },
  panelTitle:   { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '0.95rem', fontWeight: '700' },
  headerActions:{ display: 'flex', gap: '0.25rem' },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: COLORS.lightBlue, fontSize: '1.1rem', padding: '0.1rem 0.35rem', lineHeight: 1,
  },
  dots:     { display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' },
  dot:      { width: '8px', height: '8px', borderRadius: '50%', background: '#dde8f4' },
  dotActive: { background: COLORS.blue },
  dotDone:   { background: COLORS.lightBlue },
  stepTitle: {
    fontFamily: FONTS.header, color: COLORS.blue, fontSize: '0.95rem', marginBottom: '0.5rem',
  },
  stepBody: {
    fontFamily: FONTS.body, fontSize: '0.875rem', color: '#444',
    lineHeight: 1.55, marginBottom: '0.75rem',
  },
  finishBtn: {
    padding: '0.55rem 1rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '7px', cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: '0.9rem', width: '100%',
  },
  minBtn: {
    position: 'fixed', bottom: '1.5rem', right: '1.5rem',
    background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '8px', padding: '0.5rem 1rem',
    cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.875rem',
    zIndex: 900, boxShadow: '0 2px 8px rgba(104,175,230,0.4)',
  },
};
