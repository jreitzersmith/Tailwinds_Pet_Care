import PropTypes from 'prop-types';
import { COLORS, FONTS } from '../../../constants.jsx';

// Earliest booking: tomorrow
function minDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function ScheduleStep({ booking }) {
  const { form, update, next, back } = booking;

  const canContinue = form.bookingDate && form.bookingTime;

  return (
    <div>
      <p style={styles.subhead}>When do you need service?</p>

      <div style={styles.form}>
        <label style={styles.label}>Date
          <input
            type='date'
            style={styles.input}
            min={minDate()}
            value={form.bookingDate}
            onChange={e => update({ bookingDate: e.target.value })}
            required
          />
        </label>

        <label style={styles.label}>Preferred Time
          <input
            type='time'
            style={styles.input}
            value={form.bookingTime}
            onChange={e => update({ bookingTime: e.target.value })}
            required
          />
        </label>
      </div>

      <p style={styles.note}>
        We will confirm the exact time when we reach out to you.
      </p>

      <div style={styles.footer}>
        <button style={styles.secondaryBtn} onClick={back}>Back</button>
        <button style={styles.primaryBtn} onClick={next} disabled={!canContinue}>Continue</button>
      </div>
    </div>
  );
}

ScheduleStep.propTypes = {
  booking: PropTypes.shape({
    form: PropTypes.object.isRequired,
    update: PropTypes.func.isRequired,
    next: PropTypes.func.isRequired,
    back: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = {
  subhead:  { fontFamily: FONTS.body, color: COLORS.black, marginBottom: '1.25rem' },
  form:     { display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1rem' },
  label: {
    display: 'flex', flexDirection: 'column', gap: '0.35rem',
    fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.black,
  },
  input: {
    padding: '0.6rem 0.8rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '1rem', outline: 'none',
  },
  note: {
    fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue,
    marginBottom: '1.5rem',
  },
  footer: { display: 'flex', justifyContent: 'space-between', gap: '1rem' },
  primaryBtn: {
    padding: '0.75rem 2rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', fontFamily: FONTS.body,
  },
  secondaryBtn: {
    padding: '0.75rem 1.5rem', background: COLORS.white, color: COLORS.blue,
    border: `2px solid ${COLORS.blue}`, borderRadius: '8px', fontSize: '1rem',
    cursor: 'pointer', fontFamily: FONTS.body,
  },
};
