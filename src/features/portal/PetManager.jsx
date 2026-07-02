import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../utils/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../constants.jsx';

const SPECIES    = ['Dog', 'Cat', 'Bird', 'Reptile', 'Fish', 'Small Mammal', 'Other'];
const DIET_TYPES = ['Kibble', 'Wet Food', 'Raw', 'Mixed', 'Other'];
const DAYS       = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BLANK = {
  name: '', species: 'Dog', breed: '', age_years: '', weight_lbs: '', notes: '',
  diet: null, walking_schedule: null, medications: [], vaccinations: [],
};

function petToForm(pet) {
  return {
    name:       pet.name,
    species:    pet.species,
    breed:      pet.breed      ?? '',
    age_years:  pet.age_years  ?? '',
    weight_lbs: pet.weight_lbs ?? '',
    notes:      pet.notes      ?? '',
    diet:             pet.diet             ?? null,
    walking_schedule: pet.walking_schedule ?? null,
    medications:      Array.isArray(pet.medications)  ? pet.medications  : [],
    vaccinations:     Array.isArray(pet.vaccinations) ? pet.vaccinations : [],
  };
}

export default function PetManager() {
  const { user } = useAuth();
  const [pets, setPets]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [editing, setEditing]     = useState(null);    // null | 'new' | pet.id
  const [editingPet, setEditingPet] = useState(null);  // full pet record being edited
  const [saving, setSaving]       = useState(false);
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
    setEditingPet(null); setEditing('new'); setSaveError(null);
  }

  function startEdit(pet) {
    setEditingPet(pet); setEditing(pet.id); setSaveError(null);
  }

  async function handleSave(form) {
    if (!form.name.trim()) { setSaveError('Name is required.'); return; }
    setSaving(true); setSaveError(null);
    const payload = {
      customer_id:      user.id,
      name:             form.name.trim(),
      species:          form.species,
      breed:            form.breed      || null,
      age_years:        form.age_years  ? parseFloat(form.age_years)  : null,
      weight_lbs:       form.weight_lbs ? parseFloat(form.weight_lbs) : null,
      notes:            form.notes      || null,
      diet:             form.diet             ?? null,
      walking_schedule: form.walking_schedule ?? null,
      medications:      form.medications      || [],
      vaccinations:     form.vaccinations     || [],
    };
    let err;
    if (editing === 'new') {
      ({ error: err } = await supabase.from('pets').insert(payload));
    } else {
      ({ error: err } = await supabase.from('pets').update(payload).eq('id', editing));
    }
    setSaving(false);
    if (err) { setSaveError(err.message); return; }
    setEditing(null); setEditingPet(null); fetchPets();
  }

  async function handleDelete(petId) {
    if (!window.confirm('Remove this pet? Existing bookings will not be affected.')) return;
    await supabase.from('pets').delete().eq('id', petId);
    fetchPets();
  }

  if (loading) return <p style={st.msg}>Loading your pets…</p>;
  if (error)   return <p style={st.error}>{error}</p>;

  return (
    <div>
      {pets.length === 0 && editing !== 'new' && (
        <p style={st.empty}>No pets added yet.</p>
      )}
      {pets.map(pet => (
        <div key={pet.id} style={st.petRow}>
          {editing === pet.id ? (
            <PetForm initial={editingPet} onSave={handleSave}
              onCancel={() => { setEditing(null); setEditingPet(null); }}
              saving={saving} error={saveError} />
          ) : (
            <PetCard pet={pet} onEdit={() => startEdit(pet)} onDelete={() => handleDelete(pet.id)} />
          )}
        </div>
      ))}
      {editing === 'new' && (
        <div style={st.petRow}>
          <PetForm initial={null} onSave={handleSave}
            onCancel={() => setEditing(null)}
            saving={saving} error={saveError} isNew />
        </div>
      )}
      {editing !== 'new' && (
        <button style={st.addBtn} onClick={startAdd}>+ Add a Pet</button>
      )}
    </div>
  );
}

// ─── PetCard ─────────────────────────────────────────────────────────────────
function PetCard({ pet, onEdit, onDelete }) {
  const medCount  = Array.isArray(pet.medications)  ? pet.medications.length  : 0;
  const vaccCount = Array.isArray(pet.vaccinations) ? pet.vaccinations.length : 0;
  return (
    <div style={st.petInfo}>
      <div>
        <span style={st.petName}>{pet.name}</span>
        <span style={st.petMeta}>
          {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
          {pet.age_years  ? ` · ${pet.age_years} yrs`  : ''}
          {pet.weight_lbs ? ` · ${pet.weight_lbs} lbs` : ''}
        </span>
        {pet.notes && <span style={st.petNote}>{pet.notes}</span>}
        {pet.diet && (
          <span style={st.petNote}>
            Diet: {pet.diet.type}
            {pet.diet.frequency ? `, ${pet.diet.frequency}x/day` : ''}
            {pet.diet.amount    ? `, ${pet.diet.amount}`         : ''}
          </span>
        )}
        {medCount  > 0 && <span style={st.petNote}>{medCount} medication{medCount > 1 ? 's' : ''}</span>}
        {vaccCount > 0 && <span style={st.petNote}>{vaccCount} vaccination record{vaccCount > 1 ? 's' : ''}</span>}
      </div>
      <div style={st.petActions}>
        <button style={st.editBtn}   onClick={onEdit}>Edit</button>
        <button style={st.deleteBtn} onClick={onDelete}>Remove</button>
      </div>
    </div>
  );
}
PetCard.propTypes = {
  pet: PropTypes.object.isRequired, onEdit: PropTypes.func.isRequired, onDelete: PropTypes.func.isRequired,
};

// ─── PetForm ─────────────────────────────────────────────────────────────────
function PetForm({ initial, onSave, onCancel, saving, error, isNew }) {
  const [form, setForm]       = useState(() => initial ? petToForm(initial) : { ...BLANK });
  const [dietOpen, setDietOpen]   = useState(!!initial?.diet);
  const [walkOpen, setWalkOpen]   = useState(!!initial?.walking_schedule);
  const [medsOpen, setMedsOpen]   = useState((initial?.medications?.length ?? 0) > 0);
  const [vaccsOpen, setVaccsOpen] = useState((initial?.vaccinations?.length ?? 0) > 0);

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); }

  function setDiet(field, val) {
    setForm(p => ({ ...p, diet: { ...(p.diet ?? { type: 'Kibble', frequency: '', amount: '' }), [field]: val } }));
  }
  function setWalk(field, val) {
    setForm(p => ({ ...p, walking_schedule: { ...(p.walking_schedule ?? { days: [], time: '', duration_minutes: '' }), [field]: val } }));
  }
  function toggleDay(day) {
    const days = form.walking_schedule?.days ?? [];
    setWalk('days', days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
  }

  function toggleDiet() {
    if (dietOpen) { setDietOpen(false); setForm(p => ({ ...p, diet: null })); }
    else {
      setDietOpen(true);
      if (!form.diet) setForm(p => ({ ...p, diet: { type: 'Kibble', frequency: '', amount: '' } }));
    }
  }
  function toggleWalk() {
    if (walkOpen) { setWalkOpen(false); setForm(p => ({ ...p, walking_schedule: null })); }
    else {
      setWalkOpen(true);
      if (!form.walking_schedule) setForm(p => ({ ...p, walking_schedule: { days: [], time: '', duration_minutes: '' } }));
    }
  }

  function addMed()  { setMedsOpen(true);  setForm(p => ({ ...p, medications:  [...p.medications,  { name: '', dose: '', frequency: '' }] })); }
  function addVacc() { setVaccsOpen(true); setForm(p => ({ ...p, vaccinations: [...p.vaccinations, { vaccine: '', date_given: '', next_due: '' }] })); }

  function setMed(i, f, v)  { setForm(p => { const a = [...p.medications];  a[i] = { ...a[i], [f]: v }; return { ...p, medications:  a }; }); }
  function setVacc(i, f, v) { setForm(p => { const a = [...p.vaccinations]; a[i] = { ...a[i], [f]: v }; return { ...p, vaccinations: a }; }); }
  function removeMed(i)   { setForm(p => ({ ...p, medications:  p.medications.filter((_, x) => x !== i) })); }
  function removeVacc(i)  { setForm(p => ({ ...p, vaccinations: p.vaccinations.filter((_, x) => x !== i) })); }

  return (
    <div>
      <h3 style={st.formHead}>{isNew ? 'New Pet' : 'Edit Pet'}</h3>
      {error && <p style={st.formErr}>{error}</p>}

      {/* Required / basic fields */}
      <div style={st.formGrid}>
        <label style={st.label}>Name *
          <input style={st.input} type='text' value={form.name} onChange={e => set('name', e.target.value)} />
        </label>
        <label style={st.label}>Species
          <select style={st.input} value={form.species} onChange={e => set('species', e.target.value)}>
            {SPECIES.map(sp => <option key={sp}>{sp}</option>)}
          </select>
        </label>
        <label style={st.label}>Breed
          <input style={st.input} type='text' value={form.breed} onChange={e => set('breed', e.target.value)} />
        </label>
        <label style={st.label}>Weight (lbs)
          <input style={st.input} type='number' min='0' value={form.weight_lbs} onChange={e => set('weight_lbs', e.target.value)} />
        </label>
        <label style={st.label}>Age (years)
          <input style={st.input} type='number' min='0' step='0.5' value={form.age_years} onChange={e => set('age_years', e.target.value)} />
        </label>
        <label style={{ ...st.label, gridColumn: '1 / -1' }}>Notes
          <input style={st.input} type='text' value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder='Allergies, behavioral notes…' />
        </label>
      </div>

      {/* ── Optional sections ── */}
      <div style={st.optWrap}>

        {/* Diet & Feeding */}
        <div style={st.optSection}>
          <button style={st.optToggle} onClick={toggleDiet}>
            {dietOpen ? '▾' : '▸'} Diet &amp; Feeding
          </button>
          {dietOpen && form.diet && (
            <div style={st.optBody}>
              <div style={st.row3}>
                <label style={st.label}>Food Type
                  <select style={st.input} value={form.diet.type} onChange={e => setDiet('type', e.target.value)}>
                    {DIET_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label style={st.label}>Meals / Day
                  <input style={st.input} type='number' min='1' max='10' value={form.diet.frequency}
                    onChange={e => setDiet('frequency', e.target.value)} />
                </label>
                <label style={st.label}>Amount per Meal
                  <input style={st.input} type='text' value={form.diet.amount}
                    onChange={e => setDiet('amount', e.target.value)} placeholder='1 cup' />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Walking Schedule */}
        <div style={st.optSection}>
          <button style={st.optToggle} onClick={toggleWalk}>
            {walkOpen ? '▾' : '▸'} Walking Schedule
          </button>
          {walkOpen && form.walking_schedule && (
            <div style={st.optBody}>
              <div style={{ marginBottom: '0.6rem' }}>
                <span style={st.microLabel}>Days</span>
                <div style={st.daysRow}>
                  {DAYS.map(d => (
                    <button key={d} type='button'
                      style={{ ...st.dayBtn, ...(form.walking_schedule.days?.includes(d) ? st.dayBtnOn : {}) }}
                      onClick={() => toggleDay(d)}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={st.row2}>
                <label style={st.label}>Preferred Time
                  <input style={st.input} type='time' value={form.walking_schedule.time}
                    onChange={e => setWalk('time', e.target.value)} />
                </label>
                <label style={st.label}>Duration (min)
                  <input style={st.input} type='number' min='5' value={form.walking_schedule.duration_minutes}
                    onChange={e => setWalk('duration_minutes', e.target.value)} />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Medications */}
        <div style={st.optSection}>
          <div style={st.optHeaderRow}>
            <button style={st.optToggle} onClick={() => setMedsOpen(o => !o)}>
              {medsOpen ? '▾' : '▸'} Medications
              {form.medications.length > 0 && <span style={st.badge}>{form.medications.length}</span>}
            </button>
            <button style={st.addItemBtn} onClick={addMed}>+ Add</button>
          </div>
          {medsOpen && form.medications.map((m, i) => (
            <div key={i} style={st.listItem}>
              <div style={st.row3}>
                <label style={st.label}>Name
                  <input style={st.input} type='text' value={m.name}
                    onChange={e => setMed(i, 'name', e.target.value)} placeholder='Heartgard' />
                </label>
                <label style={st.label}>Dose
                  <input style={st.input} type='text' value={m.dose}
                    onChange={e => setMed(i, 'dose', e.target.value)} placeholder='1 tablet' />
                </label>
                <label style={st.label}>Frequency
                  <input style={st.input} type='text' value={m.frequency}
                    onChange={e => setMed(i, 'frequency', e.target.value)} placeholder='Monthly' />
                </label>
              </div>
              <button style={st.removeBtn} onClick={() => removeMed(i)}>Remove</button>
            </div>
          ))}
        </div>

        {/* Vaccinations */}
        <div style={st.optSection}>
          <div style={st.optHeaderRow}>
            <button style={st.optToggle} onClick={() => setVaccsOpen(o => !o)}>
              {vaccsOpen ? '▾' : '▸'} Vaccinations
              {form.vaccinations.length > 0 && <span style={st.badge}>{form.vaccinations.length}</span>}
            </button>
            <button style={st.addItemBtn} onClick={addVacc}>+ Add</button>
          </div>
          {vaccsOpen && form.vaccinations.map((v, i) => (
            <div key={i} style={st.listItem}>
              <div style={st.row3}>
                <label style={st.label}>Vaccine
                  <input style={st.input} type='text' value={v.vaccine}
                    onChange={e => setVacc(i, 'vaccine', e.target.value)} placeholder='Rabies' />
                </label>
                <label style={st.label}>Date Given
                  <input style={st.input} type='date' value={v.date_given}
                    onChange={e => setVacc(i, 'date_given', e.target.value)} />
                </label>
                <label style={st.label}>Next Due
                  <input style={st.input} type='date' value={v.next_due}
                    onChange={e => setVacc(i, 'next_due', e.target.value)} />
                </label>
              </div>
              <button style={st.removeBtn} onClick={() => removeVacc(i)}>Remove</button>
            </div>
          ))}
        </div>

      </div>{/* end optWrap */}

      <div style={st.formActions}>
        <button style={st.saveBtn} onClick={() => onSave(form)} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button style={st.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

PetForm.propTypes = {
  initial:  PropTypes.object,
  onSave:   PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  saving:   PropTypes.bool,
  error:    PropTypes.string,
  isNew:    PropTypes.bool,
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const st = {
  msg:   { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  error: { fontFamily: FONTS.body, color: COLORS.red, padding: '1rem' },
  empty: { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  petRow: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px',
    padding: '1rem 1.25rem', marginBottom: '0.75rem', background: COLORS.white,
  },
  petInfo:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' },
  petName:    { display: 'block', fontFamily: FONTS.body, fontWeight: '600', color: COLORS.black },
  petMeta:    { display: 'block', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue },
  petNote:    { display: 'block', fontFamily: FONTS.body, fontSize: '0.8rem', color: '#777', marginTop: '0.2rem' },
  petActions: { display: 'flex', gap: '0.5rem' },
  editBtn: {
    padding: '0.35rem 0.75rem', background: COLORS.white, border: `1px solid ${COLORS.blue}`,
    color: COLORS.blue, borderRadius: '6px', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  deleteBtn: {
    padding: '0.35rem 0.75rem', background: COLORS.white, border: `1px solid ${COLORS.red}`,
    color: COLORS.red, borderRadius: '6px', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  addBtn: {
    marginTop: '0.5rem', background: 'none', border: 'none', color: COLORS.blue,
    fontFamily: FONTS.body, fontSize: '0.95rem', cursor: 'pointer', padding: '0.5rem 0',
  },
  formHead: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1rem', marginBottom: '0.75rem' },
  formErr:  { fontFamily: FONTS.body, color: COLORS.red, fontSize: '0.9rem', marginBottom: '0.5rem' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' },
  label: {
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
    fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black,
  },
  input: {
    padding: '0.5rem 0.7rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '0.9rem', outline: 'none', fontFamily: FONTS.body,
  },
  formActions: { display: 'flex', gap: '0.75rem', marginTop: '1rem' },
  saveBtn: {
    padding: '0.5rem 1.5rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '7px', cursor: 'pointer', fontFamily: FONTS.body,
  },
  cancelBtn: {
    padding: '0.5rem 1rem', background: COLORS.white, color: COLORS.lightBlue,
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '7px', cursor: 'pointer', fontFamily: FONTS.body,
  },
  optWrap:   { borderTop: '1px solid #eef3fa', paddingTop: '0.75rem', marginTop: '0.5rem' },
  optSection: { marginBottom: '0.5rem' },
  optToggle: {
    background: 'none', border: 'none', color: COLORS.blue, fontFamily: FONTS.body,
    fontSize: '0.875rem', cursor: 'pointer', padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem',
  },
  optHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  addItemBtn: {
    background: 'none', border: `1px solid ${COLORS.blue}`, color: COLORS.blue,
    fontFamily: FONTS.body, fontSize: '0.8rem', cursor: 'pointer', borderRadius: '5px',
    padding: '0.2rem 0.6rem',
  },
  optBody:  { paddingLeft: '1rem', paddingBottom: '0.5rem' },
  row3:     { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.3rem' },
  row2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' },
  microLabel: { fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.black, display: 'block', marginBottom: '0.3rem' },
  daysRow:  { display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.6rem' },
  dayBtn:   {
    padding: '0.25rem 0.5rem', border: `1px solid ${COLORS.lightBlue}`, borderRadius: '4px',
    background: COLORS.white, color: COLORS.lightBlue, fontFamily: FONTS.body, fontSize: '0.8rem', cursor: 'pointer',
  },
  dayBtnOn: { background: COLORS.blue, color: COLORS.white, borderColor: COLORS.blue },
  listItem: { background: '#f8fbff', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '0.4rem' },
  removeBtn: {
    background: 'none', border: 'none', color: COLORS.red, fontFamily: FONTS.body,
    fontSize: '0.8rem', cursor: 'pointer', padding: '0.2rem 0',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: COLORS.blue, color: COLORS.white, borderRadius: '50%',
    width: '16px', height: '16px', fontSize: '0.7rem', fontFamily: FONTS.body, marginLeft: '0.3rem',
  },
};
