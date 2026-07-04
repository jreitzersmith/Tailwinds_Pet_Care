import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../../utils/supabase.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../../constants.jsx';

const SPECIES    = ['Dog', 'Cat', 'Bird', 'Reptile', 'Fish', 'Small Mammal', 'Other'];
const DIET_TYPES = ['Kibble', 'Wet Food', 'Raw', 'Mixed', 'Treat', 'Bone/Rawhide', 'Other'];
const DAYS       = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BLANK_DIET = { label: '', type: 'Kibble', time: '', amount: '', notes: '' };
const BLANK_WALK = { label: '', days: [], time: '', duration_minutes: '' };
const BLANK_MED  = { name: '', dose: '', frequency: 'Once Daily', time1: '', time2: '', details: '' };

function toArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function entryToSlot(label, timeStr) {
  const l = (label || '').toLowerCase();
  if (l.includes('morning') || l.includes('breakfast') || l.includes('am')) return 'morning';
  if (l.includes('midday') || l.includes('noon') || l.includes('lunch') || l.includes('afternoon')) return 'midday';
  if (l.includes('evening') || l.includes('dinner') || l.includes('night') || l.includes('pm')) return 'evening';
  if (timeStr) {
    const h = parseInt((timeStr || '').split(':')[0], 10);
    if (!isNaN(h)) {
      if (h >= 5 && h < 12)  return 'morning';
      if (h >= 12 && h < 17) return 'midday';
      return 'evening';
    }
  }
  return null;
}

function medToSlot(timeStr) {
  if (!timeStr) return null;
  const h = parseInt((timeStr || '').split(':')[0], 10);
  if (isNaN(h)) return null;
  if (h >= 5 && h < 12)  return 'morning';
  if (h >= 12 && h < 17) return 'midday';
  return 'evening';
}

function petToSchedule(pet) {
  const ORDER = ['morning', 'midday', 'evening'];
  const feedSet = new Set();
  const walkSet = new Set();
  const medSet  = new Set();
  toArr(pet.diet).forEach(e => { const s = entryToSlot(e.label, e.time); if (s) feedSet.add(s); });
  toArr(pet.walking_schedule).forEach(e => { const s = entryToSlot(e.label, e.time); if (s) walkSet.add(s); });
  toArr(pet.medications).forEach(m => {
    if (m.frequency === 'Once Daily' || m.frequency === 'Twice Daily') {
      const s1 = medToSlot(m.time1); if (s1) medSet.add(s1);
      if (m.frequency === 'Twice Daily') { const s2 = medToSlot(m.time2); if (s2) medSet.add(s2); }
    }
  });
  return {
    feeding_times:    ORDER.filter(t => feedSet.has(t)),
    walking_times:    ORDER.filter(t => walkSet.has(t)),
    medication_times: ORDER.filter(t => medSet.has(t)),
  };
}

function petToForm(pet) {
  const rawDiet = pet.diet;
  const freeFed = rawDiet && !Array.isArray(rawDiet) && rawDiet.free_fed === true;
  return {
    name:             pet.name        ?? '',
    species:          pet.species     ?? 'Dog',
    breed:            pet.breed       ?? '',
    age_years:        pet.age_years   ?? '',
    weight_lbs:       pet.weight_lbs  ?? '',
    notes:            pet.notes       ?? '',
    diet:             freeFed ? [] : toArr(rawDiet),
    walking_schedule: toArr(pet.walking_schedule),
    medications:      toArr(pet.medications),
  };
}

export default function PetStep({ booking }) {
  const { form, update, next, back } = booking;
  const { user } = useAuth();
  const [pets, setPets]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [addingNew, setAddingNew]   = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState(null);

  async function fetchPets() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('pets')
      .select('id, name, species, breed, age_years, weight_lbs, notes, diet, walking_schedule')
      .eq('customer_id', user.id)
      .order('name');
    if (err) { setError(err.message); } else { setPets(data || []); }
    setLoading(false);
  }

  useEffect(() => { fetchPets(); }, [user.id]);

  function selectExisting(pet) {
    update({ petId: pet.id, petName: pet.name, petIsNew: false, petSchedule: petToSchedule(pet) });
    setAddingNew(false);
  }

  function handleNewPetField(field, value) {
    update({ newPet: { ...form.newPet, [field]: value }, petId: null, petIsNew: true });
  }
  function setNewDiet(i, field, v) {
    const d = [...(form.newPet.diet || [])];
    d[i] = { ...d[i], [field]: v };
    update({ newPet: { ...form.newPet, diet: d }, petId: null, petIsNew: true });
  }
  function addNewDiet() {
    update({ newPet: { ...form.newPet, diet: [...(form.newPet.diet || []), { ...BLANK_DIET }] }, petId: null, petIsNew: true });
  }
  function removeNewDiet(i) {
    update({ newPet: { ...form.newPet, diet: (form.newPet.diet || []).filter((_, x) => x !== i) }, petId: null, petIsNew: true });
  }
  function setNewWalk(i, field, v) {
    const w = [...(form.newPet.walking_schedule || [])];
    w[i] = { ...w[i], [field]: v };
    update({ newPet: { ...form.newPet, walking_schedule: w }, petId: null, petIsNew: true });
  }
  function addNewWalk() {
    update({ newPet: { ...form.newPet, walking_schedule: [...(form.newPet.walking_schedule || []), { ...BLANK_WALK }] }, petId: null, petIsNew: true });
  }
  function removeNewWalk(i) {
    update({ newPet: { ...form.newPet, walking_schedule: (form.newPet.walking_schedule || []).filter((_, x) => x !== i) }, petId: null, petIsNew: true });
  }
  function setNewMed(i, field, v) {
    const m = [...(form.newPet.medications || [])];
    m[i] = { ...m[i], [field]: v };
    update({ newPet: { ...form.newPet, medications: m }, petId: null, petIsNew: true });
  }
  function addNewMed() {
    update({ newPet: { ...form.newPet, medications: [...(form.newPet.medications || []), { ...BLANK_MED }] }, petId: null, petIsNew: true });
  }
  function removeNewMed(i) {
    update({ newPet: { ...form.newPet, medications: (form.newPet.medications || []).filter((_, x) => x !== i) }, petId: null, petIsNew: true });
  }

  function toggleNewWalkDay(i, day) {
    const w = [...(form.newPet.walking_schedule || [])];
    const days = w[i]?.days ?? [];
    w[i] = { ...w[i], days: days.includes(day) ? days.filter(d => d !== day) : [...days, day] };
    update({ newPet: { ...form.newPet, walking_schedule: w }, petId: null, petIsNew: true });
  }

  function openEdit(e, pet) {
    e.stopPropagation();
    setEditingPet(pet);
    setEditFields(petToForm(pet));
    setEditError(null);
  }
  function closeEdit() { setEditingPet(null); setEditFields({}); setEditError(null); }

  function setEdit(field, val) { setEditFields(f => ({ ...f, [field]: val })); }
  function setEditDiet(i, field, v) {
    setEditFields(f => { const d = [...f.diet]; d[i] = { ...d[i], [field]: v }; return { ...f, diet: d }; });
  }
  function addEditDiet() { setEditFields(f => ({ ...f, diet: [...f.diet, { ...BLANK_DIET }] })); }
  function removeEditDiet(i) { setEditFields(f => ({ ...f, diet: f.diet.filter((_, x) => x !== i) })); }
  function setEditWalk(i, field, v) {
    setEditFields(f => { const w = [...f.walking_schedule]; w[i] = { ...w[i], [field]: v }; return { ...f, walking_schedule: w }; });
  }
  function addEditWalk() { setEditFields(f => ({ ...f, walking_schedule: [...f.walking_schedule, { ...BLANK_WALK }] })); }
  function removeEditWalk(i) { setEditFields(f => ({ ...f, walking_schedule: f.walking_schedule.filter((_, x) => x !== i) })); }
  function toggleEditWalkDay(i, day) {
    setEditFields(f => {
      const w = [...f.walking_schedule];
      const days = w[i]?.days ?? [];
      w[i] = { ...w[i], days: days.includes(day) ? days.filter(d => d !== day) : [...days, day] };
      return { ...f, walking_schedule: w };
    });
  }

  function setEditMed(i, field, v) {
    setEditFields(f => { const m = [...f.medications]; m[i] = { ...m[i], [field]: v }; return { ...f, medications: m }; });
  }
  function addEditMed() { setEditFields(f => ({ ...f, medications: [...f.medications, { ...BLANK_MED }] })); }
  function removeEditMed(i) { setEditFields(f => ({ ...f, medications: f.medications.filter((_, x) => x !== i) })); }

  async function saveEdit() {
    setEditSaving(true);
    setEditError(null);
    const payload = {
      name:             (editFields.name || '').trim(),
      species:          editFields.species,
      breed:            (editFields.breed || '').trim(),
      age_years:        editFields.age_years !== '' ? Number(editFields.age_years) : null,
      weight_lbs:       editFields.weight_lbs !== '' ? Number(editFields.weight_lbs) : null,
      notes:            (editFields.notes || '').trim(),
      diet:             editFields.diet,
      walking_schedule: editFields.walking_schedule,
      medications:      editFields.medications,
    };
    const { error: err } = await supabase.from('pets').update(payload).eq('id', editingPet.id);
    if (err) { setEditError(err.message); setEditSaving(false); return; }
    await fetchPets();
    if (form.petId === editingPet.id) {
      update({ petSchedule: petToSchedule({ ...editingPet, ...payload }) });
    }
    closeEdit();
    setEditSaving(false);
  }

  const canProceed = form.petId || (form.petIsNew && form.newPet?.name?.trim());

  return (
    <div>
      <h2 style={styles.sectionTitle}>Select a Pet</h2>

      {loading && <p style={styles.msg}>Loading pets…</p>}
      {error   && <p style={styles.err}>{error}</p>}

      {!loading && (
        <div style={styles.petList}>
          {pets.map(pet => {
            const feedCount = toArr(pet.diet).length;
            const walkCount = toArr(pet.walking_schedule).length;
            const medCount  = toArr(pet.medications).length;
            const selected  = form.petId === pet.id;
            return (
              <div
                key={pet.id}
                style={{ ...styles.petCard, ...(selected ? styles.petCardSelected : {}) }}
                onClick={() => selectExisting(pet)}
              >
                <div style={styles.petCardTop}>
                  <div>
                    <span style={styles.petName}>{pet.name}</span>
                    <span style={styles.petSpecies}> · {pet.species}{pet.breed ? `, ${pet.breed}` : ''}</span>
                  </div>
                  <div style={styles.petCardActions}>
                    {feedCount > 0 && <span style={styles.badge}>🍖 {feedCount}</span>}
                    {walkCount > 0 && <span style={styles.badge}>🦮 {walkCount}</span>}
                    {medCount > 0 && <span style={styles.badge}>💊 {medCount}</span>}
                    <button style={styles.editPetBtn} onClick={e => openEdit(e, pet)}>Edit</button>
                  </div>
                </div>
                {selected && <span style={styles.selectedMark}>✓ Selected</span>}
              </div>
            );
          })}
          <button style={styles.addNewBtn} onClick={() => {
            const next = !addingNew;
            setAddingNew(next);
            if (!next) update({ petId: null, petIsNew: false });
            else update({ petId: null, petIsNew: true });
          }}>
            {addingNew ? '− Cancel new pet' : '+ Add a new pet'}
          </button>
        </div>
      )}

      {addingNew && (
        <div style={styles.newPetForm}>
          <h3 style={styles.subTitle}>New Pet</h3>
          <div style={styles.row2}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Name *</label>
              <input style={styles.input} value={form.newPet?.name || ''} onChange={e => handleNewPetField('name', e.target.value)} />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Species</label>
              <select style={styles.select} value={form.newPet?.species || 'Dog'} onChange={e => handleNewPetField('species', e.target.value)}>
                {SPECIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.row2}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Breed</label>
              <input style={styles.input} value={form.newPet?.breed || ''} onChange={e => handleNewPetField('breed', e.target.value)} />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Age (years)</label>
              <input style={styles.input} type="number" min="0" value={form.newPet?.age_years || ''} onChange={e => handleNewPetField('age_years', e.target.value)} />
            </div>
          </div>
          <div style={styles.row2}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Weight (lbs)</label>
              <input style={styles.input} type="number" min="0" value={form.newPet?.weight_lbs || ''} onChange={e => handleNewPetField('weight_lbs', e.target.value)} />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Notes</label>
              <input style={styles.input} value={form.newPet?.notes || ''} onChange={e => handleNewPetField('notes', e.target.value)} />
            </div>
          </div>
          <div style={styles.scheduleSection}>
            <div style={styles.scheduleHeader}>
              <span style={styles.scheduleLabel}>Feeding Schedule</span>
              <button style={styles.addEntryBtn} onClick={addNewDiet}>+ Add</button>
            </div>
            {(form.newPet?.diet || []).map((entry, i) => (
              <DietEntry key={i} entry={entry} idx={i}
                onChange={(f, v) => setNewDiet(i, f, v)}
                onRemove={() => removeNewDiet(i)} />
            ))}
          </div>
          <div style={styles.scheduleSection}>
            <div style={styles.scheduleHeader}>
              <span style={styles.scheduleLabel}>Walking Schedule</span>
              <button style={styles.addEntryBtn} onClick={addNewWalk}>+ Add</button>
            </div>
            {(form.newPet?.walking_schedule || []).map((entry, i) => (
              <WalkEntry key={i} entry={entry} idx={i}
                onChange={(f, v) => setNewWalk(i, f, v)}
                onRemove={() => removeNewWalk(i)}
                onToggleDay={day => toggleNewWalkDay(i, day)} />
            ))}
          </div>
          <div style={styles.scheduleSection}>
            <div style={styles.scheduleHeader}>
              <span style={styles.scheduleLabel}>Medications</span>
              <button style={styles.addEntryBtn} onClick={addNewMed}>+ Add</button>
            </div>
            {(form.newPet?.medications || []).map((entry, i) => (
              <MedEntry key={i} entry={entry} idx={i}
                onChange={(f, v) => setNewMed(i, f, v)}
                onRemove={() => removeNewMed(i)} />
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingPet && (
        <div style={styles.overlay} onClick={closeEdit}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Edit {editingPet.name}</h3>
            <div style={styles.row2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Name *</label>
                <input style={styles.input} value={editFields.name || ''} onChange={e => setEdit('name', e.target.value)} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Species</label>
                <select style={styles.select} value={editFields.species || 'Dog'} onChange={e => setEdit('species', e.target.value)}>
                  {SPECIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={styles.row2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Breed</label>
                <input style={styles.input} value={editFields.breed || ''} onChange={e => setEdit('breed', e.target.value)} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Age (years)</label>
                <input style={styles.input} type="number" min="0" value={editFields.age_years ?? ''} onChange={e => setEdit('age_years', e.target.value)} />
              </div>
            </div>
            <div style={styles.row2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Weight (lbs)</label>
                <input style={styles.input} type="number" min="0" value={editFields.weight_lbs ?? ''} onChange={e => setEdit('weight_lbs', e.target.value)} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Notes</label>
                <input style={styles.input} value={editFields.notes || ''} onChange={e => setEdit('notes', e.target.value)} />
              </div>
            </div>
            <div style={styles.scheduleSection}>
              <div style={styles.scheduleHeader}>
                <span style={styles.scheduleLabel}>Feeding Schedule</span>
                <button style={styles.addEntryBtn} onClick={addEditDiet}>+ Add</button>
              </div>
              {(editFields.diet || []).map((entry, i) => (
                <DietEntry key={i} entry={entry} idx={i}
                  onChange={(f, v) => setEditDiet(i, f, v)}
                  onRemove={() => removeEditDiet(i)} />
              ))}
            </div>
            <div style={styles.scheduleSection}>
              <div style={styles.scheduleHeader}>
                <span style={styles.scheduleLabel}>Walking Schedule</span>
                <button style={styles.addEntryBtn} onClick={addEditWalk}>+ Add</button>
              </div>
              {(editFields.walking_schedule || []).map((entry, i) => (
                <WalkEntry key={i} entry={entry} idx={i}
                  onChange={(f, v) => setEditWalk(i, f, v)}
                  onRemove={() => removeEditWalk(i)}
                  onToggleDay={day => toggleEditWalkDay(i, day)} />
              ))}
            </div>
            <div style={styles.scheduleSection}>
              <div style={styles.scheduleHeader}>
                <span style={styles.scheduleLabel}>Medications</span>
                <button style={styles.addEntryBtn} onClick={addEditMed}>+ Add</button>
              </div>
              {(editFields.medications || []).map((entry, i) => (
                <MedEntry key={i} entry={entry} idx={i}
                  onChange={(f, v) => setEditMed(i, f, v)}
                  onRemove={() => removeEditMed(i)} />
              ))}
            </div>
            {editError && <p style={styles.err}>{editError}</p>}
            <div style={styles.modalBtns}>
              <button style={styles.saveBtn} onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save'}
              </button>
              <button style={styles.cancelModalBtn} onClick={closeEdit}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.navRow}>
        <button style={styles.backBtn} onClick={back}>← Back</button>
        <button style={styles.nextBtn} onClick={next} disabled={!canProceed}>Next →</button>
      </div>
    </div>
  );
}

function DietEntry({ entry, idx, onChange, onRemove }) {
  return (
    <div style={styles.listItem}>
      <div style={styles.listItemHeader}>
        <span style={styles.entryNum}>#{idx + 1}</span>
        <button style={styles.removeBtn} onClick={onRemove}>✕</button>
      </div>
      <div style={styles.row2}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Label</label>
          <input style={styles.input} placeholder="e.g. Morning Kibble" value={entry.label || ''} onChange={e => onChange('label', e.target.value)} />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Type</label>
          <select style={styles.select} value={entry.type || 'Kibble'} onChange={e => onChange('type', e.target.value)}>
            {DIET_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={styles.row2}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Time</label>
          <input style={styles.input} type="time" value={entry.time || ''} onChange={e => onChange('time', e.target.value)} />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Amount</label>
          <input style={styles.input} placeholder="e.g. 1 cup" value={entry.amount || ''} onChange={e => onChange('amount', e.target.value)} />
        </div>
      </div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Notes</label>
        <input style={styles.input} value={entry.notes || ''} onChange={e => onChange('notes', e.target.value)} />
      </div>
    </div>
  );
}

function WalkEntry({ entry, idx, onChange, onRemove, onToggleDay }) {
  return (
    <div style={styles.listItem}>
      <div style={styles.listItemHeader}>
        <span style={styles.entryNum}>#{idx + 1}</span>
        <button style={styles.removeBtn} onClick={onRemove}>✕</button>
      </div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Label</label>
        <input style={styles.input} placeholder="e.g. Morning Walk" value={entry.label || ''} onChange={e => onChange('label', e.target.value)} />
      </div>
      <div style={styles.row2}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Time</label>
          <input style={styles.input} type="time" value={entry.time || ''} onChange={e => onChange('time', e.target.value)} />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Duration (min)</label>
          <input style={styles.input} type="number" min="1" value={entry.duration_minutes || ''} onChange={e => onChange('duration_minutes', e.target.value)} />
        </div>
      </div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Days</label>
        <div style={styles.daysRow}>
          {DAYS.map(day => (
            <button key={day} type="button"
              style={{ ...styles.dayBtn, ...(entry.days?.includes(day) ? styles.dayBtnActive : {}) }}
              onClick={() => onToggleDay(day)}
            >{day}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MedEntry({ entry, idx, onChange, onRemove }) {
  const freq = entry.frequency || 'Once Daily';
  return (
    <div style={styles.listItem}>
      <div style={styles.listItemHeader}>
        <span style={styles.entryNum}>#{idx + 1}</span>
        <button style={styles.removeBtn} onClick={onRemove}>✕</button>
      </div>
      <div style={styles.row2}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Medication Name</label>
          <input style={styles.input} placeholder="e.g. Heartgard" value={entry.name || ''} onChange={e => onChange('name', e.target.value)} />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Dose</label>
          <input style={styles.input} placeholder="e.g. 1 tablet" value={entry.dose || ''} onChange={e => onChange('dose', e.target.value)} />
        </div>
      </div>
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Frequency</label>
        <select style={styles.select} value={freq} onChange={e => onChange('frequency', e.target.value)}>
          {['Monthly', 'Once Daily', 'Twice Daily', 'Other'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      {(freq === 'Once Daily' || freq === 'Twice Daily') && (
        <div style={styles.row2}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>{freq === 'Twice Daily' ? 'Time 1' : 'Time'}</label>
            <input style={styles.input} type="time" value={entry.time1 || ''} onChange={e => onChange('time1', e.target.value)} />
          </div>
          {freq === 'Twice Daily' && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Time 2</label>
              <input style={styles.input} type="time" value={entry.time2 || ''} onChange={e => onChange('time2', e.target.value)} />
            </div>
          )}
        </div>
      )}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Details</label>
        <input style={styles.input} placeholder="Instructions, prescribing vet, etc." value={entry.details || ''} onChange={e => onChange('details', e.target.value)} />
      </div>
    </div>
  );
}

DietEntry.propTypes = {
  entry: PropTypes.object.isRequired, idx: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired, onRemove: PropTypes.func.isRequired,
};
WalkEntry.propTypes = {
  entry: PropTypes.object.isRequired, idx: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired, onRemove: PropTypes.func.isRequired,
  onToggleDay: PropTypes.func.isRequired,
};
MedEntry.propTypes = {
  entry: PropTypes.object.isRequired, idx: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired, onRemove: PropTypes.func.isRequired,
};
PetStep.propTypes = { booking: PropTypes.object.isRequired };

const styles = {
  sectionTitle: { fontFamily: FONTS.header, color: COLORS.blue, marginBottom: '1rem', fontSize: '1.1rem' },
  subTitle:     { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1rem', margin: '0 0 0.75rem' },
  msg:          { fontFamily: FONTS.body, color: COLORS.lightBlue },
  err:          { fontFamily: FONTS.body, color: COLORS.red, fontSize: '0.85rem' },
  petList:      { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' },
  petCard: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '8px',
    padding: '0.75rem 1rem', cursor: 'pointer', background: COLORS.white,
  },
  petCardSelected: { border: `2px solid ${COLORS.blue}`, background: '#f0f8ff' },
  petCardTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  petName:       { fontFamily: FONTS.header, color: COLORS.black, fontWeight: '600' },
  petSpecies:    { fontFamily: FONTS.body, color: '#777', fontSize: '0.875rem' },
  petCardActions:{ display: 'flex', gap: '0.5rem', alignItems: 'center' },
  badge:         { fontSize: '0.75rem', background: '#e8f4fd', borderRadius: '4px', padding: '0.15rem 0.4rem', fontFamily: FONTS.body },
  selectedMark:  { fontFamily: FONTS.body, color: COLORS.blue, fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' },
  editPetBtn: {
    background: 'none', border: `1px solid ${COLORS.lightBlue}`, borderRadius: '5px',
    padding: '0.2rem 0.6rem', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.blue,
  },
  addNewBtn: {
    background: 'none', border: `1px dashed ${COLORS.blue}`, borderRadius: '8px',
    padding: '0.6rem 1rem', cursor: 'pointer', fontFamily: FONTS.body, color: COLORS.blue,
    fontSize: '0.9rem', textAlign: 'center',
  },
  newPetForm: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px',
    padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    boxSizing: 'border-box',
  },
  modal: {
    background: COLORS.white, borderRadius: '12px', padding: '1.5rem',
    width: 'min(480px, 94vw)', maxHeight: '88vh', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)', boxSizing: 'border-box',
  },
  modalTitle:    { fontFamily: FONTS.header, color: COLORS.blue, margin: 0, fontSize: '1.1rem' },
  modalBtns:     { display: 'flex', gap: '0.75rem', marginTop: '0.25rem' },
  saveBtn: {
    padding: '0.5rem 1.25rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '7px', cursor: 'pointer', fontFamily: FONTS.body,
  },
  cancelModalBtn: {
    padding: '0.5rem 1rem', background: COLORS.white, color: COLORS.black,
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '7px', cursor: 'pointer', fontFamily: FONTS.body,
  },
  /* Key overflow fix: minWidth:0 on fieldGroup prevents grid children from blowing out */
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 },
  label:      { fontFamily: FONTS.body, fontSize: '0.8rem', color: '#555', fontWeight: '600' },
  /* width:100% + boxSizing:border-box prevents inputs from overflowing their grid cell */
  input: {
    padding: '0.45rem 0.65rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '0.9rem', outline: 'none',
    fontFamily: FONTS.body, width: '100%', boxSizing: 'border-box',
  },
  select: {
    padding: '0.45rem 0.65rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '0.9rem', outline: 'none',
    fontFamily: FONTS.body, width: '100%', boxSizing: 'border-box', background: COLORS.white,
  },
  scheduleSection: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  scheduleHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  scheduleLabel:   { fontFamily: FONTS.body, fontSize: '0.875rem', fontWeight: '600', color: COLORS.black },
  addEntryBtn: {
    background: 'none', border: `1px solid ${COLORS.blue}`, borderRadius: '5px',
    padding: '0.2rem 0.6rem', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.blue,
  },
  /* minWidth:0 + overflow:hidden prevent listItem from escaping modal bounds */
  listItem: {
    border: '1px solid #e0eaf6', borderRadius: '6px', padding: '0.6rem 0.75rem',
    display: 'flex', flexDirection: 'column', gap: '0.4rem',
    minWidth: 0, overflow: 'hidden',
  },
  listItemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  entryNum:       { fontFamily: FONTS.body, fontSize: '0.8rem', color: '#888' },
  removeBtn: {
    background: 'none', border: 'none', color: COLORS.red,
    cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.25rem',
  },
  daysRow:      { display: 'flex', flexWrap: 'wrap', gap: '0.3rem' },
  dayBtn: {
    padding: '0.2rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem',
    border: `1px solid ${COLORS.lightBlue}`, cursor: 'pointer',
    background: COLORS.white, fontFamily: FONTS.body, color: COLORS.black,
  },
  dayBtnActive: { background: COLORS.blue, color: COLORS.white, border: `1px solid ${COLORS.blue}` },
  navRow:  { display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' },
  backBtn: {
    padding: '0.6rem 1.25rem', background: COLORS.white, color: COLORS.blue,
    border: `2px solid ${COLORS.blue}`, borderRadius: '8px', cursor: 'pointer', fontFamily: FONTS.body,
  },
  nextBtn: {
    padding: '0.6rem 1.5rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: FONTS.body,
  },
};
