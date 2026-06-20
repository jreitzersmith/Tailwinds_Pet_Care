import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../constants.jsx';

const SPECIES = ['Dog', 'Cat', 'Bird', 'Reptile', 'Fish', 'Small Mammal', 'Other'];
const BLANK   = { name: '', species: 'Dog', breed: '', age_years: '', weight_lbs: '', notes: '' };

export default function PetManager() {
  const { user } = useAuth();
  const [pets, setPets]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | pet.id
  const [form, setForm]       = useState(BLANK);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => { fetchPets(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPets() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('pets').select('*').eq('customer_id', user.id).order('name');
    if (err) { setError(err.message); } else { setPets(data); }
    setLoading(false);
  }

  function startAdd() {
    setForm(BLANK);
    setEditing('new');
    setSaveError(null);
  }

  function startEdit(pet) {
    setForm({
      name:       pet.name,
      species:    pet.species,
      breed:      pet.breed      ?? '',
      age_years:  pet.age_years  ?? '',
      weight_lbs: pet.weight_lbs ?? '',
      notes:      pet.notes      ?? '',
    });
    setEditing(pet.id);
    setSaveError(null);
  }

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setSaveError('Name is required.'); return; }
    setSaving(true);
    setSaveError(null);
    const payload = {
      customer_id: user.id,
      name:        form.name.trim(),
      species:     form.species,
      breed:       form.breed      || null,
      age_years:   form.age_years  ? parseFloat(form.age_years)  : null,
      weight_lbs:  form.weight_lbs ? parseFloat(form.weight_lbs) : null,
      notes:       form.notes      || null,
    };

    let err;
    if (editing === 'new') {
      ({ error: err } = await supabase.from('pets').insert(payload));
    } else {
      ({ error: err } = await supabase.from('pets').update(payload).eq('id', editing));
    }
    setSaving(false);
    if (err) { setSaveError(err.message); return; }
    setEditing(null);
    fetchPets();
  }

  async function handleDelete(petId) {
    if (!window.confirm('Remove this pet? Existing bookings will not be affected.')) return;
    await supabase.from('pets').delete().eq('id', petId);
    fetchPets();
  }

  if (loading) return <p style={styles.msg}>Loading your pets…</p>;
  if (error)   return <p style={styles.error}>{error}</p>;

  return (
    <div>
      {pets.length === 0 && editing !== 'new' && (
        <p style={styles.empty}>No pets added yet.</p>
      )}

      {pets.map(pet => (
        <div key={pet.id} style={styles.petRow}>
          {editing === pet.id ? (
            <PetForm form={form} onUpdate={updateField} onSave={handleSave}
              onCancel={() => setEditing(null)} saving={saving} error={saveError} />
          ) : (
            <div style={styles.petInfo}>
              <div>
                <span style={styles.petName}>{pet.name}</span>
                <span style={styles.petMeta}>
                  {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                  {pet.age_years ? ` · ${pet.age_years} yrs` : ''}
                  {pet.weight_lbs ? ` · ${pet.weight_lbs} lbs` : ''}
                </span>
                {pet.notes && <span style={styles.petNotes}>{pet.notes}</span>}
              </div>
              <div style={styles.petActions}>
                <button style={styles.editBtn} onClick={() => startEdit(pet)}>Edit</button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(pet.id)}>Remove</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {editing === 'new' && (
        <div style={styles.petRow}>
          <PetForm form={form} onUpdate={updateField} onSave={handleSave}
            onCancel={() => setEditing(null)} saving={saving} error={saveError} isNew />
        </div>
      )}

      {editing !== 'new' && (
        <button style={styles.addBtn} onClick={startAdd}>+ Add a Pet</button>
      )}
    </div>
  );
}

function PetForm({ form, onUpdate, onSave, onCancel, saving, error, isNew }) {
  return (
    <div style={styles.formWrap}>
      <h3 style={styles.formHeading}>{isNew ? 'New Pet' : 'Edit Pet'}</h3>
      {error && <p style={styles.formError}>{error}</p>}
      <div style={styles.formGrid}>
        {[
          { field: 'name',       label: 'Name *',        type: 'text' },
          { field: 'breed',      label: 'Breed',         type: 'text' },
          { field: 'age_years',  label: 'Age (years)',   type: 'number' },
          { field: 'weight_lbs', label: 'Weight (lbs)',  type: 'number' },
        ].map(({ field, label, type }) => (
          <label key={field} style={styles.label}>{label}
            <input style={styles.input} type={type}
              value={form[field]} onChange={e => onUpdate(field, e.target.value)} />
          </label>
        ))}
        <label style={styles.label}>Species
          <select style={styles.input} value={form.species}
            onChange={e => onUpdate('species', e.target.value)}>
            {SPECIES.map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ ...styles.label, gridColumn: '1 / -1' }}>Notes
          <input style={styles.input} type='text' value={form.notes}
            onChange={e => onUpdate('notes', e.target.value)}
            placeholder='Allergies, medications, behavioral notes…' />
        </label>
      </div>
      <div style={styles.formActions}>
        <button style={styles.saveBtn} onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button style={styles.cancelFormBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

import PropTypes from 'prop-types';

PetForm.propTypes = {
  form:     PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onSave:   PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  saving:   PropTypes.bool,
  error:    PropTypes.string,
  isNew:    PropTypes.bool,
};

const styles = {
  msg:       { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  error:     { fontFamily: FONTS.body, color: COLORS.red, padding: '1rem' },
  empty:     { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  petRow: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px',
    padding: '1rem 1.25rem', marginBottom: '0.75rem', background: COLORS.white,
  },
  petInfo:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' },
  petName:   { display: 'block', fontFamily: FONTS.body, fontWeight: '600', color: COLORS.black },
  petMeta:   { display: 'block', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue },
  petNotes:  { display: 'block', fontFamily: FONTS.body, fontSize: '0.8rem', color: '#777', marginTop: '0.25rem' },
  petActions:{ display: 'flex', gap: '0.5rem' },
  editBtn: {
    padding: '0.35rem 0.75rem', background: COLORS.white,
    border: `1px solid ${COLORS.blue}`, color: COLORS.blue,
    borderRadius: '6px', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  deleteBtn: {
    padding: '0.35rem 0.75rem', background: COLORS.white,
    border: `1px solid ${COLORS.red}`, color: COLORS.red,
    borderRadius: '6px', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  addBtn: {
    marginTop: '0.5rem', background: 'none', border: 'none', color: COLORS.blue,
    fontFamily: FONTS.body, fontSize: '0.95rem', cursor: 'pointer', padding: '0.5rem 0',
  },
  formWrap: {},
  formHeading: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1rem', marginBottom: '0.75rem' },
  formError:   { fontFamily: FONTS.body, color: COLORS.red, fontSize: '0.9rem', marginBottom: '0.5rem' },
  formGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem',
  },
  label: {
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
    fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black,
  },
  input: {
    padding: '0.5rem 0.7rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '0.95rem', outline: 'none',
  },
  formActions: { display: 'flex', gap: '0.75rem' },
  saveBtn: {
    padding: '0.5rem 1.5rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '7px', cursor: 'pointer', fontFamily: FONTS.body,
  },
  cancelFormBtn: {
    padding: '0.5rem 1rem', background: COLORS.white, color: COLORS.lightBlue,
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '7px', cursor: 'pointer',
    fontFamily: FONTS.body,
  },
};
