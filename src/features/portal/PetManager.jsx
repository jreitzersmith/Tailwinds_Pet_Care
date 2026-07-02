import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../utils/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../constants.jsx';

const SPECIES    = ['Dog', 'Cat', 'Bird', 'Reptile', 'Fish', 'Small Mammal', 'Other'];
const DIET_TYPES = ['Kibble', 'Wet Food', 'Raw', 'Mixed', 'Treat', 'Bone/Rawhide', 'Other'];
const DAYS       = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BLANK_DIET_ENTRY = { label: '', type: 'Kibble', time: '', amount: '', notes: '' };
const BLANK_WALK_ENTRY = { label: '', days: [], time: '', duration_minutes: '' };

const BLANK = {
  name: '', species: 'Dog', breed: '', age_years: '', weight_lbs: '', notes: '',
  diet: [], walking_schedule: [], medications: [], vaccinations: [],
};

/** Normalize: old single-object format → array; null/undefined → [] */
function toArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function petToForm(pet) {
  return {
    name:       pet.name,
    species:    pet.species,
    breed:      pet.breed      ?? '',
    age_years:  pet.age_years  ?? '',
    weight_lbs: pet.weight_lbs ?? '',
    notes:      pet.notes      ?? '',
    diet:             toArr(pet.diet),
    walking_schedule: toArr(pet.walking_schedule),
    medications:      toArr(pet.medications),
    vaccinations:     toArr(pet.vaccinations),
  };
}

// ─── PetManager ──────────────────────────────────────────────────────────────
export default function PetManager({ onSelectTab }) {
  const { user } = useAuth();
  const [pets, setPets]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [editing, setEditing]     = useState(null);
  const [editingPet, setEditingPet] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => { fetchPets(); }, [user.id]); // eslint-disable-line

  async function fetchPets() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('pets').select('*').eq('customer_id', user.id).order('name');
    if (err) { setError(err.message); } else { setPets(data); }
    setLoading(false);
  }

  function startAdd() { setEditingPet(null); setEditing('new'); setSaveError(null); }
  function startEdit(pet) { setEditingPet(pet); setEditing(pet.id); setSaveError(null); }

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
      diet:             form.diet.length             ? form.diet             : null,
      walking_schedule: form.walking_schedule.length ? form.walking_schedule : null,
      medications:      form.medications,
      vaccinations:     form.vaccinations,
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
      {pets.length === 0 && editing !== 'new' && <p style={st.empty}>No pets added yet.</p>}

      {pets.map(pet => (
        <div key={pet.id} style={st.petRow}>
          {editing === pet.id ? (
            <PetForm initial={editingPet} onSave={handleSave}
              onCancel={() => { setEditing(null); setEditingPet(null); }}
              saving={saving} error={saveError} petId={pet.id} userId={user.id} />
          ) : (
            <PetCard pet={pet} onEdit={() => startEdit(pet)}
              onDelete={() => handleDelete(pet.id)}
              userId={user.id} onSelectTab={onSelectTab} />
          )}
        </div>
      ))}

      {editing === 'new' && (
        <div style={st.petRow}>
          <PetForm initial={null} onSave={handleSave}
            onCancel={() => setEditing(null)}
            saving={saving} error={saveError} isNew userId={user.id} />
        </div>
      )}
      {editing !== 'new' && <button style={st.addBtn} onClick={startAdd}>+ Add a Pet</button>}
    </div>
  );
}

PetManager.propTypes = { onSelectTab: PropTypes.func };

// ─── PetCard ─────────────────────────────────────────────────────────────────
function PetCard({ pet, onEdit, onDelete, userId, onSelectTab }) {
  const [expanded, setExpanded] = useState(false);
  const dietCount  = toArr(pet.diet).length;
  const walkCount  = toArr(pet.walking_schedule).length;
  const medCount   = toArr(pet.medications).length;
  const vaccCount  = toArr(pet.vaccinations).length;

  return (
    <div>
      <div style={st.petInfo}>
        {/* Profile thumbnail */}
        <div style={st.thumb}>
          {pet.profile_image_url
            ? <img src={pet.profile_image_url} style={st.thumbImg} alt={pet.name} />
            : <span style={st.thumbIcon}>🐾</span>}
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={st.petName}>{pet.name}</span>
          <span style={st.petMeta}>
            {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
            {pet.weight_lbs ? ` · ${pet.weight_lbs} lbs` : ''}
            {pet.age_years  ? ` · ${pet.age_years} yrs`  : ''}
          </span>
          {pet.notes && <span style={st.petNote}>{pet.notes}</span>}
          <div style={st.badgeRow}>
            {dietCount  > 0 && <span style={st.badge}>{dietCount} feeding{dietCount > 1 ? 's' : ''}</span>}
            {walkCount  > 0 && <span style={st.badge}>{walkCount} walk{walkCount > 1 ? 's' : ''}</span>}
            {medCount   > 0 && <span style={st.badge}>{medCount} med{medCount > 1 ? 's' : ''}</span>}
            {vaccCount  > 0 && <span style={st.badge}>{vaccCount} vacc{vaccCount > 1 ? 's' : ''}</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={st.petActions}>
          <button style={st.editBtn} onClick={onEdit}>Edit</button>
          <button style={st.deleteBtn} onClick={onDelete}>Remove</button>
          <button style={st.expandBtn} onClick={() => setExpanded(e => !e)}>
            {expanded ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {/* Expanded: photos + visits */}
      {expanded && (
        <div style={st.expandedWrap}>
          <PhotoAlbumShell petId={pet.id} />
          <PastVisits petId={pet.id} onSelectTab={onSelectTab} />
        </div>
      )}
    </div>
  );
}
PetCard.propTypes = {
  pet: PropTypes.object.isRequired, onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired, userId: PropTypes.string.isRequired,
  onSelectTab: PropTypes.func,
};

// ─── PhotoAlbumShell ─────────────────────────────────────────────────────────
// Display only — upload is reserved for a future sitter admin view.
function PhotoAlbumShell({ petId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('pet_photos').select('*').eq('pet_id', petId)
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => { setPhotos(data || []); setLoading(false); });
  }, [petId]);

  return (
    <div style={st.albumSection}>
      <h4 style={st.sectionHead}>Photos</h4>
      {loading ? <p style={st.dimText}>Loading…</p> : photos.length === 0 ? (
        <p style={st.dimText}>Photos from your sitter will appear here after visits.</p>
      ) : (
        <div style={st.photoGrid}>
          {photos.map(p => (
            <img key={p.id} src={p.url} style={st.photoThumb} alt={p.caption || 'Visit photo'} />
          ))}
        </div>
      )}
    </div>
  );
}
PhotoAlbumShell.propTypes = { petId: PropTypes.string.isRequired };

// ─── PastVisits ──────────────────────────────────────────────────────────────
function PastVisits({ petId, onSelectTab }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.from('bookings')
      .select('id, booking_date, status, services(name)')
      .eq('pet_id', petId)
      .order('booking_date', { ascending: false })
      .limit(10)
      .then(({ data }) => { setBookings(data || []); setLoading(false); });
  }, [petId]);

  function goToBooking(bookingDate) {
    if (!onSelectTab) return;
    const isPast = new Date(bookingDate) < new Date();
    onSelectTab(isPast ? 1 : 0);
  }

  return (
    <div style={st.visitsSection}>
      <h4 style={st.sectionHead}>Visits</h4>
      {loading ? <p style={st.dimText}>Loading…</p> : bookings.length === 0 ? (
        <p style={st.dimText}>No bookings for this pet yet.</p>
      ) : (
        <div>
          {bookings.map(b => (
            <div key={b.id} style={st.visitRow}>
              <span style={st.visitDate}>{b.booking_date}</span>
              <span style={st.visitService}>{b.services?.name ?? '—'}</span>
              <span style={{ ...st.visitStatus, color: statusColor(b.status) }}>{b.status}</span>
              <button style={st.visitLink} onClick={() => goToBooking(b.booking_date)}>
                View →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
PastVisits.propTypes = { petId: PropTypes.string.isRequired, onSelectTab: PropTypes.func };

function statusColor(s) {
  return s === 'completed' ? '#2a7a3b' : s === 'cancelled' ? COLORS.red
    : s === 'confirmed' ? COLORS.blue : '#888';
}

// ─── PetForm ─────────────────────────────────────────────────────────────────
function PetForm({ initial, onSave, onCancel, saving, error, isNew, petId, userId }) {
  const [form, setForm]       = useState(() => initial ? petToForm(initial) : { ...BLANK });
  const [profileUrl, setProfileUrl]   = useState(initial?.profile_image_url ?? null);
  const [uploading, setUploading]     = useState(false);
  const [uploadErr, setUploadErr]     = useState(null);
  const [medsOpen, setMedsOpen]       = useState(toArr(initial?.medications).length > 0);
  const [vaccsOpen, setVaccsOpen]     = useState(toArr(initial?.vaccinations).length > 0);

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); }

  // ── Diet ──────────────────────────────────────────────────────────────────
  function addDiet()            { setForm(p => ({ ...p, diet: [...p.diet, { ...BLANK_DIET_ENTRY }] })); }
  function removeDiet(i)        { setForm(p => ({ ...p, diet: p.diet.filter((_, x) => x !== i) })); }
  function setDiet(i, field, v) {
    setForm(p => { const d = [...p.diet]; d[i] = { ...d[i], [field]: v }; return { ...p, diet: d }; });
  }

  // ── Walking ───────────────────────────────────────────────────────────────
  function addWalk()            { setForm(p => ({ ...p, walking_schedule: [...p.walking_schedule, { ...BLANK_WALK_ENTRY }] })); }
  function removeWalk(i)        { setForm(p => ({ ...p, walking_schedule: p.walking_schedule.filter((_, x) => x !== i) })); }
  function setWalk(i, field, v) {
    setForm(p => { const w = [...p.walking_schedule]; w[i] = { ...w[i], [field]: v }; return { ...p, walking_schedule: w }; });
  }
  function toggleWalkDay(i, day) {
    const days = form.walking_schedule[i]?.days ?? [];
    setWalk(i, 'days', days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
  }

  // ── Medications ───────────────────────────────────────────────────────────
  function addMed()             { setMedsOpen(true); setForm(p => ({ ...p, medications: [...p.medications, { name: '', dose: '', frequency: '' }] })); }
  function removeMed(i)         { setForm(p => ({ ...p, medications: p.medications.filter((_, x) => x !== i) })); }
  function setMed(i, field, v)  { setForm(p => { const m = [...p.medications]; m[i] = { ...m[i], [field]: v }; return { ...p, medications: m }; }); }

  // ── Vaccinations ──────────────────────────────────────────────────────────
  function addVacc()             { setVaccsOpen(true); setForm(p => ({ ...p, vaccinations: [...p.vaccinations, { vaccine: '', date_given: '', next_due: '' }] })); }
  function removeVacc(i)         { setForm(p => ({ ...p, vaccinations: p.vaccinations.filter((_, x) => x !== i) })); }
  function setVacc(i, field, v)  { setForm(p => { const v2 = [...p.vaccinations]; v2[i] = { ...v2[i], [field]: v }; return { ...p, vaccinations: v2 }; }); }

  // ── Profile image upload ──────────────────────────────────────────────────
  async function handleProfileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !petId) return;
    setUploading(true); setUploadErr(null);
    const ext  = file.name.split('.').pop().toLowerCase();
    const path = `${userId}/${petId}/profile.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('pet-photos').upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploadErr(upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('pet-photos').getPublicUrl(path);
    await supabase.from('pets').update({ profile_image_url: publicUrl }).eq('id', petId);
    setProfileUrl(publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <h3 style={st.formHead}>{isNew ? 'New Pet' : 'Edit Pet'}</h3>
      {error && <p style={st.formErr}>{error}</p>}

      {/* Profile image — edit mode only (pet must exist to have an ID) */}
      {!isNew && petId && (
        <div style={st.profileRow}>
          <div style={st.profileThumb}>
            {profileUrl
              ? <img src={profileUrl} style={st.profileImg} alt='Profile' />
              : <span style={st.profileIcon}>🐾</span>}
          </div>
          <div>
            <label style={st.uploadBtn}>
              {uploading ? 'Uploading…' : profileUrl ? 'Change Photo' : 'Add Profile Photo'}
              <input type='file' accept='image/*' onChange={handleProfileUpload}
                disabled={uploading} style={{ display: 'none' }} />
            </label>
            {uploadErr && <p style={st.formErr}>{uploadErr}</p>}
          </div>
        </div>
      )}

      {/* Basic required fields */}
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

      {/* Optional sections */}
      <div style={st.optWrap}>

        {/* Feeding Schedule */}
        <div style={st.optSection}>
          <div style={st.optHeaderRow}>
            <span style={st.optTitle}>
              Feeding Schedule
              {form.diet.length > 0 && <span style={st.badge}>{form.diet.length}</span>}
            </span>
            <button style={st.addItemBtn} onClick={addDiet}>+ Add Feeding</button>
          </div>
          {form.diet.map((entry, i) => (
            <DietEntry key={i} entry={entry} index={i} onChange={setDiet} onRemove={removeDiet} />
          ))}
          {form.diet.length === 0 && (
            <p style={st.dimText}>No feedings added. Click &quot;+ Add Feeding&quot; to build a daily schedule.</p>
          )}
        </div>

        {/* Walking Schedule */}
        <div style={st.optSection}>
          <div style={st.optHeaderRow}>
            <span style={st.optTitle}>
              Walking Schedule
              {form.walking_schedule.length > 0 && <span style={st.badge}>{form.walking_schedule.length}</span>}
            </span>
            <button style={st.addItemBtn} onClick={addWalk}>+ Add Walk</button>
          </div>
          {form.walking_schedule.map((entry, i) => (
            <WalkEntry key={i} entry={entry} index={i}
              onChange={setWalk} onRemove={removeWalk} onToggleDay={toggleWalkDay} />
          ))}
          {form.walking_schedule.length === 0 && (
            <p style={st.dimText}>No walks added. Click &quot;+ Add Walk&quot; to add a morning, evening, etc.</p>
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
  initial: PropTypes.object, onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired, saving: PropTypes.bool, error: PropTypes.string,
  isNew: PropTypes.bool, petId: PropTypes.string, userId: PropTypes.string,
};

// ─── DietEntry ────────────────────────────────────────────────────────────────
function DietEntry({ entry, index, onChange, onRemove }) {
  return (
    <div style={st.listItem}>
      <div style={st.row4}>
        <label style={st.label}>Meal Label
          <input style={st.input} type='text' value={entry.label}
            onChange={e => onChange(index, 'label', e.target.value)}
            placeholder='Breakfast, Dinner, Treat time…' />
        </label>
        <label style={st.label}>Food Type
          <select style={st.input} value={entry.type}
            onChange={e => onChange(index, 'type', e.target.value)}>
            {DIET_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label style={st.label}>Time
          <input style={st.input} type='time' value={entry.time}
            onChange={e => onChange(index, 'time', e.target.value)} />
        </label>
        <label style={st.label}>Amount
          <input style={st.input} type='text' value={entry.amount}
            onChange={e => onChange(index, 'amount', e.target.value)}
            placeholder='1 cup, 1 can…' />
        </label>
      </div>
      {entry.type === 'Other' && (
        <label style={{ ...st.label, marginTop: '0.4rem' }}>Description
          <input style={st.input} type='text' value={entry.notes}
            onChange={e => onChange(index, 'notes', e.target.value)}
            placeholder='Describe the food or any special instructions…' />
        </label>
      )}
      <button style={st.removeBtn} onClick={() => onRemove(index)}>Remove</button>
    </div>
  );
}
DietEntry.propTypes = {
  entry: PropTypes.object.isRequired, index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired, onRemove: PropTypes.func.isRequired,
};

// ─── WalkEntry ────────────────────────────────────────────────────────────────
function WalkEntry({ entry, index, onChange, onRemove, onToggleDay }) {
  return (
    <div style={st.listItem}>
      <div style={st.row3}>
        <label style={st.label}>Walk Label
          <input style={st.input} type='text' value={entry.label}
            onChange={e => onChange(index, 'label', e.target.value)}
            placeholder='Morning, Evening…' />
        </label>
        <label style={st.label}>Time
          <input style={st.input} type='time' value={entry.time}
            onChange={e => onChange(index, 'time', e.target.value)} />
        </label>
        <label style={st.label}>Duration (min)
          <input style={st.input} type='number' min='5' value={entry.duration_minutes}
            onChange={e => onChange(index, 'duration_minutes', e.target.value)} />
        </label>
      </div>
      <div style={{ marginBottom: '0.4rem' }}>
        <span style={st.microLabel}>Days</span>
        <div style={st.daysRow}>
          {DAYS.map(d => (
            <button key={d} type='button'
              style={{ ...st.dayBtn, ...(entry.days?.includes(d) ? st.dayBtnOn : {}) }}
              onClick={() => onToggleDay(index, d)}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <button style={st.removeBtn} onClick={() => onRemove(index)}>Remove</button>
    </div>
  );
}
WalkEntry.propTypes = {
  entry: PropTypes.object.isRequired, index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired, onRemove: PropTypes.func.isRequired,
  onToggleDay: PropTypes.func.isRequired,
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const st = {
  msg:    { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  error:  { fontFamily: FONTS.body, color: COLORS.red, padding: '1rem' },
  empty:  { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '2rem' },
  petRow: {
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '10px',
    padding: '1rem 1.25rem', marginBottom: '0.75rem', background: COLORS.white,
  },
  petInfo:    { display: 'flex', alignItems: 'flex-start', gap: '0.75rem' },
  thumb:      {
    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
    background: '#e8f4fc', display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', border: `1px solid ${COLORS.lightBlue}`,
  },
  thumbImg:   { width: '100%', height: '100%', objectFit: 'cover' },
  thumbIcon:  { fontSize: '1.3rem' },
  petName:    { display: 'block', fontFamily: FONTS.body, fontWeight: '600', color: COLORS.black },
  petMeta:    { display: 'block', fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue },
  petNote:    { display: 'block', fontFamily: FONTS.body, fontSize: '0.8rem', color: '#777', marginTop: '0.15rem' },
  badgeRow:   { display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' },
  badge: {
    display: 'inline-block', background: '#e8f4fc', color: COLORS.blue,
    fontFamily: FONTS.body, fontSize: '0.72rem', borderRadius: '10px',
    padding: '0.1rem 0.5rem',
  },
  petActions: { display: 'flex', gap: '0.4rem', marginLeft: 'auto', flexShrink: 0 },
  editBtn: {
    padding: '0.3rem 0.65rem', background: COLORS.white, border: `1px solid ${COLORS.blue}`,
    color: COLORS.blue, borderRadius: '6px', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.82rem',
  },
  deleteBtn: {
    padding: '0.3rem 0.65rem', background: COLORS.white, border: `1px solid ${COLORS.red}`,
    color: COLORS.red, borderRadius: '6px', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.82rem',
  },
  expandBtn: {
    padding: '0.3rem 0.5rem', background: 'none', border: `1px solid #dde8f4`,
    color: COLORS.lightBlue, borderRadius: '6px', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  addBtn: {
    marginTop: '0.5rem', background: 'none', border: 'none', color: COLORS.blue,
    fontFamily: FONTS.body, fontSize: '0.95rem', cursor: 'pointer', padding: '0.5rem 0',
  },
  expandedWrap: {
    marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #eef3fa',
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
  },
  albumSection: {},
  visitsSection: {},
  sectionHead: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '0.9rem', marginBottom: '0.5rem' },
  dimText:    { fontFamily: FONTS.body, fontSize: '0.82rem', color: '#aaa', fontStyle: 'italic' },
  photoGrid:  { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  photoThumb: { width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px', border: `1px solid #dde8f4` },
  visitRow:   { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid #f0f4fa' },
  visitDate:    { fontFamily: FONTS.body, fontSize: '0.8rem', color: '#555', minWidth: '90px' },
  visitService: { fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.black, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  visitStatus:  { fontFamily: FONTS.body, fontSize: '0.75rem', fontWeight: '600' },
  visitLink: {
    background: 'none', border: 'none', color: COLORS.blue, cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: '0.78rem', padding: 0, flexShrink: 0,
  },
  // Form styles
  formHead: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1rem', marginBottom: '0.75rem' },
  formErr:  { fontFamily: FONTS.body, color: COLORS.red, fontSize: '0.9rem', marginBottom: '0.5rem' },
  profileRow: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '0.75rem', background: '#f8fbff', borderRadius: '8px' },
  profileThumb: {
    width: '60px', height: '60px', borderRadius: '50%', background: '#e8f4fc',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    border: `2px solid ${COLORS.lightBlue}`, flexShrink: 0,
  },
  profileImg:  { width: '100%', height: '100%', objectFit: 'cover' },
  profileIcon: { fontSize: '1.6rem' },
  uploadBtn: {
    display: 'inline-block', padding: '0.4rem 0.9rem', background: COLORS.white,
    border: `1px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: '6px',
    cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' },
  label:    { display: 'flex', flexDirection: 'column', gap: '0.3rem', fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black },
  input:    { padding: '0.5rem 0.7rem', borderRadius: '6px', border: `1px solid ${COLORS.lightBlue}`, fontSize: '0.9rem', outline: 'none', fontFamily: FONTS.body },
  formActions: { display: 'flex', gap: '0.75rem', marginTop: '1rem' },
  saveBtn: { padding: '0.5rem 1.5rem', background: COLORS.blue, color: COLORS.white, border: 'none', borderRadius: '7px', cursor: 'pointer', fontFamily: FONTS.body },
  cancelBtn: { padding: '0.5rem 1rem', background: COLORS.white, color: COLORS.lightBlue, border: `1px solid ${COLORS.lightBlue}`, borderRadius: '7px', cursor: 'pointer', fontFamily: FONTS.body },
  optWrap:     { borderTop: '1px solid #eef3fa', paddingTop: '0.75rem', marginTop: '0.5rem' },
  optSection:  { marginBottom: '0.75rem' },
  optHeaderRow:{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' },
  optTitle: { fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' },
  optToggle: { background: 'none', border: 'none', color: COLORS.blue, fontFamily: FONTS.body, fontSize: '0.875rem', cursor: 'pointer', padding: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' },
  addItemBtn: { background: 'none', border: `1px solid ${COLORS.blue}`, color: COLORS.blue, fontFamily: FONTS.body, fontSize: '0.8rem', cursor: 'pointer', borderRadius: '5px', padding: '0.2rem 0.6rem' },
  listItem:  { background: '#f8fbff', borderRadius: '6px', padding: '0.6rem 0.75rem', marginBottom: '0.4rem' },
  row4:      { display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 1fr', gap: '0.5rem', marginBottom: '0.3rem' },
  row3:      { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.3rem' },
  microLabel: { fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.black, display: 'block', marginBottom: '0.3rem' },
  daysRow:   { display: 'flex', gap: '0.3rem', flexWrap: 'wrap' },
  dayBtn:    { padding: '0.2rem 0.45rem', border: `1px solid ${COLORS.lightBlue}`, borderRadius: '4px', background: COLORS.white, color: COLORS.lightBlue, fontFamily: FONTS.body, fontSize: '0.77rem', cursor: 'pointer' },
  dayBtnOn:  { background: COLORS.blue, color: COLORS.white, borderColor: COLORS.blue },
  removeBtn: { background: 'none', border: 'none', color: COLORS.red, fontFamily: FONTS.body, fontSize: '0.8rem', cursor: 'pointer', padding: '0.2rem 0', marginTop: '0.3rem' },
};
