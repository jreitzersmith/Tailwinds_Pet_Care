import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../../utils/supabase.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../../constants.jsx';

const SPECIES = ['Dog', 'Cat', 'Bird', 'Reptile', 'Fish', 'Small Mammal', 'Other'];

export default function PetStep({ booking }) {
  const { form, update, next, back } = booking;
  const { user } = useAuth();
  const [pets, setPets]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [addingNew, setAddingNew] = useState(false);

  useEffect(() => {
    async function fetchPets() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('pets')
        .select('id, name, species, breed')
        .eq('customer_id', user.id)
        .order('name');
      if (err) { setError(err.message); } else { setPets(data); }
      setLoading(false);
    }
    fetchPets();
  }, [user.id]);

  function selectExisting(pet) {
    update({ petId: pet.id, petIsNew: false });
    setAddingNew(false);
  }

  function handleNewPetField(field, value) {
    update({ newPet: { ...form.newPet, [field]: value }, petId: null, petIsNew: true });
  }

  const canContinue = form.petId || (form.petIsNew && form.newPet.name && form.newPet.species);

  if (loading) return <p style={styles.msg}>Loading your pets…</p>;

  return (
    <div>
      <p style={styles.subhead}>Which pet needs care?</p>
      {error && <p style={styles.error}>{error}</p>}

      {pets.length > 0 && !addingNew && (
        <div style={styles.petList}>
          {pets.map(pet => {
            const selected = form.petId === pet.id;
            return (
              <button key={pet.id}
                style={{ ...styles.petBtn, ...(selected ? styles.petBtnSelected : {}) }}
                onClick={() => selectExisting(pet)}>
                <span style={styles.petName}>{pet.name}</span>
                <span style={styles.petMeta}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</span>
              </button>
            );
          })}
        </div>
      )}

      <button style={styles.addNewToggle} onClick={() => { setAddingNew(v => !v); update({ petId: null, petIsNew: !addingNew }); }}>
        {addingNew ? '← Back to my pets' : '+ Add a new pet'}
      </button>

      {addingNew && (
        <div style={styles.newPetForm}>
          <h3 style={styles.newPetHeading}>New Pet</h3>
          {[
            { field: 'name',       label: 'Name',          type: 'text',   required: true },
            { field: 'breed',      label: 'Breed',         type: 'text' },
            { field: 'age_years',  label: 'Age (years)',   type: 'number' },
            { field: 'weight_lbs', label: 'Weight (lbs)',  type: 'number' },
            { field: 'notes',      label: 'Special Notes', type: 'text' },
          ].map(({ field, label, type, required }) => (
            <label key={field} style={styles.label}>{label}
              <input style={styles.input} type={type} required={required}
                value={form.newPet[field]}
                onChange={e => handleNewPetField(field, e.target.value)} />
            </label>
          ))}
          <label style={styles.label}>Species
            <select style={styles.input} value={form.newPet.species}
              onChange={e => handleNewPetField('species', e.target.value)}>
              {SPECIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
      )}

      <div style={styles.footer}>
        <button style={styles.secondaryBtn} onClick={back}>Back</button>
        <button style={styles.primaryBtn} onClick={next} disabled={!canContinue}>Continue</button>
      </div>
    </div>
  );
}

PetStep.propTypes = {
  booking: PropTypes.shape({
    form: PropTypes.object.isRequired,
    update: PropTypes.func.isRequired,
    next: PropTypes.func.isRequired,
    back: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = {
  subhead:  { fontFamily: FONTS.body, color: COLORS.black, marginBottom: '1.25rem' },
  msg:      { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  error:    { fontFamily: FONTS.body, color: COLORS.red, marginBottom: '1rem' },
  petList:  { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' },
  petBtn: {
    display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left',
    padding: '0.75rem 1rem', background: COLORS.white,
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '8px', cursor: 'pointer',
  },
  petBtnSelected: {
    borderColor: COLORS.blue, background: '#f0f8ff', boxShadow: `0 0 0 2px ${COLORS.blue}`,
  },
  petName: { fontFamily: FONTS.body, fontWeight: '600', color: COLORS.black },
  petMeta: { fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue },
  addNewToggle: {
    background: 'none', border: 'none', color: COLORS.blue, cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: '0.9rem', padding: '0.5rem 0', marginBottom: '1rem',
  },
  newPetForm: { display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.25rem' },
  newPetHeading: {
    fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1rem', marginBottom: '0.25rem',
  },
  label: {
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
    fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.black,
  },
  input: {
    padding: '0.6rem 0.8rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '1rem', outline: 'none',
  },
  footer: { display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem' },
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
