import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import supabase from '../../utils/supabase.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { COLORS, FONTS } from '../../constants.jsx';

const SPECIES     = ['Dog', 'Cat', 'Bird', 'Reptile', 'Fish', 'Small Mammal', 'Other'];
const DIET_TYPES   = ['Kibble', 'Wet Food', 'Raw', 'Mixed', 'Treat', 'Bone/Rawhide', 'Other'];
const DAYS         = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SEVERITIES    = ['Mild', 'Moderate', 'Severe'];
const DOC_TYPES     = [
  { value: 'vaccination',    label: 'Vaccination Record' },
  { value: 'medical_record', label: 'Medical Record' },
  { value: 'insurance',      label: 'Insurance' },
  { value: 'microchip',      label: 'Microchip Papers' },
  { value: 'other',          label: 'Other' },
];

const BLANK_DIET_ENTRY    = { label: '', type: 'Kibble', time: '', amount: '', notes: '' };
const BLANK_WALK_ENTRY    = { label: '', days: [], time: '', duration_minutes: '' };
const BLANK_VACC_ENTRY    = { vaccine: '', date_given: '', next_due: '', notes: '', record_url: '', record_name: '' };
const BLANK_ALLERGY_ENTRY = { allergen: '', severity: 'Mild', notes: '' };

const BLANK = {
  name: '', species: 'Dog', breed: '', age_years: '', weight_lbs: '', notes: '',
  microchip_number: '', microchip_registry: '',
  free_fed: false, diet: [], walking_schedule: [], medications: [], vaccinations: [], allergies: [],
};

/** Normalize: old single-object format → array; null/undefined → [] */
function toArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function petToForm(pet) {
  const rawDiet = pet.diet;
  const freeFed = rawDiet && !Array.isArray(rawDiet) && rawDiet.free_fed === true;
  return {
    name:       pet.name,
    species:    pet.species,
    breed:      pet.breed      ?? '',
    age_years:  pet.age_years  ?? '',
    weight_lbs: pet.weight_lbs ?? '',
    notes:      pet.notes      ?? '',
    microchip_number:   pet.microchip_number   ?? '',
    microchip_registry: pet.microchip_registry ?? '',
    free_fed:         freeFed,
    diet:             freeFed ? [] : toArr(rawDiet),
    walking_schedule: toArr(pet.walking_schedule),
    medications:      toArr(pet.medications),
    vaccinations:     toArr(pet.vaccinations),
    allergies:        toArr(pet.allergies),
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
      microchip_number:   form.microchip_number   || null,
      microchip_registry: form.microchip_registry || null,
      diet:             form.free_fed ? { free_fed: true } : form.diet.length ? form.diet : null,
      walking_schedule: form.walking_schedule.length ? form.walking_schedule : null,
      medications:      form.medications,
      vaccinations:     form.vaccinations,
      allergies:        form.allergies,
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
      <UnsortedDocuments userId={user.id} pets={pets} />

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
              userId={user.id} onSelectTab={onSelectTab}
              onChanged={fetchPets} allPets={pets} />
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

// ─── UnsortedDocuments ───────────────────────────────────────────────────────
// Documents filed via SMS/email intake that couldn't be confidently matched
// to a pet. Customer assigns them to one or more pets here (checkboxes,
// since one document can cover several pets — see pet_document_links).
function UnsortedDocuments({ userId, pets }) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [assigning, setAssigning] = useState({});

  useEffect(() => { fetchDocs(); }, [userId]); // eslint-disable-line

  async function fetchDocs() {
    setLoading(true);
    const { data: allDocs } = await supabase.from('pet_documents').select('*')
      .eq('customer_id', userId).order('uploaded_at', { ascending: false });
    const ids = (allDocs || []).map(d => d.id);
    let linkedIds = new Set();
    if (ids.length > 0) {
      const { data: links } = await supabase.from('pet_document_links').select('document_id').in('document_id', ids);
      linkedIds = new Set((links || []).map(l => l.document_id));
    }
    setDocs((allDocs || []).filter(d => !linkedIds.has(d.id)));
    setLoading(false);
  }

  function toggle(docId, petId) {
    setSelected(prev => {
      const cur = new Set(prev[docId] || []);
      if (cur.has(petId)) cur.delete(petId); else cur.add(petId);
      return { ...prev, [docId]: cur };
    });
  }

  async function assign(docId) {
    const petIds = Array.from(selected[docId] || []);
    if (petIds.length === 0) return;
    setAssigning(prev => ({ ...prev, [docId]: true }));
    await supabase.from('pet_document_links').insert(petIds.map(pid => ({ document_id: docId, pet_id: pid })));
    setAssigning(prev => ({ ...prev, [docId]: false }));
    fetchDocs();
  }

  async function remove(docId) {
    if (!window.confirm('Delete this document permanently?')) return;
    await supabase.from('pet_documents').delete().eq('id', docId);
    fetchDocs();
  }

  if (loading || docs.length === 0) return null;

  return (
    <div style={st.unsortedWrap}>
      <h3 style={st.unsortedHead}>📥 Unsorted Documents ({docs.length})</h3>
      <p style={st.dimText}>
        These came in by text or email and need to be assigned to one or more pets.
      </p>
      {docs.map(doc => (
        <div key={doc.id} style={st.unsortedRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <a href={doc.url} target='_blank' rel='noreferrer' style={st.unsortedLink}>
              📄 {doc.title || 'Document'}
            </a>
            <span style={st.unsortedMeta}>
              via {doc.source} · {new Date(doc.uploaded_at).toLocaleDateString()}
            </span>
            <div style={st.unsortedCheckRow}>
              {pets.map(p => (
                <label key={p.id} style={st.unsortedCheckLabel}>
                  <input type='checkbox'
                    checked={(selected[doc.id] || new Set()).has(p.id)}
                    onChange={() => toggle(doc.id, p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <button style={st.addItemBtn} disabled={assigning[doc.id] || !(selected[doc.id]?.size)}
            onClick={() => assign(doc.id)}>
            {assigning[doc.id] ? 'Assigning…' : 'Assign'}
          </button>
          <button style={st.removeBtn} onClick={() => remove(doc.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
UnsortedDocuments.propTypes = { userId: PropTypes.string.isRequired, pets: PropTypes.array.isRequired };

// ─── PetCard ─────────────────────────────────────────────────────────────────
function PetCard({ pet, onEdit, onDelete, userId, onSelectTab, onChanged, allPets }) {
  const [expanded, setExpanded] = useState(false);
  const [copyMsg, setCopyMsg]   = useState(null);
  const dietCount     = toArr(pet.diet).length;
  const walkCount     = toArr(pet.walking_schedule).length;
  const medCount      = toArr(pet.medications).length;
  const vaccCount     = toArr(pet.vaccinations).length;
  const allergyCount  = toArr(pet.allergies).length;

  async function handleShare() {
    if (!pet.share_enabled) {
      await supabase.from('pets').update({ share_enabled: true }).eq('id', pet.id);
    }
    const link = `https://tailwindspetcare.com/passport/${pet.share_token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopyMsg('Link copied!');
    } catch (_) {
      setCopyMsg(link);
    }
    setTimeout(() => setCopyMsg(null), 3500);
    if (onChanged) onChanged();
  }

  async function handleStopSharing() {
    await supabase.from('pets').update({ share_enabled: false }).eq('id', pet.id);
    if (onChanged) onChanged();
  }

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
            {allergyCount > 0 && <span style={st.badgeAlert}>⚠ {allergyCount} allerg{allergyCount > 1 ? 'ies' : 'y'}</span>}
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

      {/* Share Pet Passport */}
      <div style={st.shareRow}>
        <button style={st.shareBtn} onClick={handleShare}>🔗 Share Pet Passport</button>
        {pet.share_enabled && (
          <button style={st.stopShareBtn} onClick={handleStopSharing}>Stop sharing</button>
        )}
        {copyMsg && <span style={st.copyMsg}>{copyMsg}</span>}
      </div>

      {/* Expanded: photos + visits + documents + weight */}
      {expanded && (
        <div style={st.expandedWrap}>
          <PhotoAlbumShell petId={pet.id} />
          <PastVisits petId={pet.id} onSelectTab={onSelectTab} />
          <div style={st.fullWidth}>
            <DocumentsSection petId={pet.id} petName={pet.name} customerId={userId} allPets={allPets} />
          </div>
          <div style={st.fullWidth}><WeightLog petId={pet.id} currentWeight={pet.weight_lbs} /></div>
        </div>
      )}
    </div>
  );
}
PetCard.propTypes = {
  pet: PropTypes.object.isRequired, onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired, userId: PropTypes.string.isRequired,
  onSelectTab: PropTypes.func, onChanged: PropTypes.func,
  allPets: PropTypes.array.isRequired,
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

// ─── DocumentsSection ────────────────────────────────────────────────────────
// General document vault: medical records, insurance, microchip papers, etc.
// One document can be linked to multiple pets via pet_document_links (e.g. a
// shared vet visit receipt or a household insurance policy).
function DocumentsSection({ petId, petName, customerId, allPets }) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState(null);
  const [docType, setDocType]     = useState('medical_record');
  const [title, setTitle]         = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [linkPicks, setLinkPicks] = useState({});

  useEffect(() => { fetchDocs(); }, [petId]); // eslint-disable-line

  async function fetchDocs() {
    setLoading(true);
    const { data: links } = await supabase
      .from('pet_document_links')
      .select('document_id, pet_documents(*)')
      .eq('pet_id', petId);
    const baseDocs = (links || []).map(l => l.pet_documents).filter(Boolean);
    const ids = baseDocs.map(d => d.id);
    const otherByDoc = {};
    if (ids.length > 0) {
      const { data: allLinks } = await supabase
        .from('pet_document_links')
        .select('document_id, pets(id, name)')
        .in('document_id', ids);
      (allLinks || []).forEach(l => {
        if (!l.pets || l.pets.id === petId) return;
        otherByDoc[l.document_id] = [...(otherByDoc[l.document_id] || []), l.pets.name];
      });
    }
    baseDocs.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    setDocs(baseDocs.map(d => ({ ...d, otherPets: otherByDoc[d.id] || [] })));
    setLoading(false);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadErr(null);
    const ext  = file.name.split('.').pop().toLowerCase();
    const path = `${customerId}/doc_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('pet-documents').upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) { setUploadErr(upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('pet-documents').getPublicUrl(path);
    const { data: inserted, error: insErr } = await supabase.from('pet_documents').insert({
      customer_id:  customerId,
      doc_type:     docType,
      title:        title || file.name,
      storage_path: path,
      url:          publicUrl,
      expires_on:   expiresOn || null,
      source:       'portal',
    }).select('id').single();
    if (!insErr && inserted) {
      await supabase.from('pet_document_links').insert({ document_id: inserted.id, pet_id: petId });
    }
    setTitle(''); setExpiresOn(''); setUploading(false);
    fetchDocs();
  }

  async function handleUnlink(docId) {
    await supabase.from('pet_document_links').delete().eq('document_id', docId).eq('pet_id', petId);
    fetchDocs();
  }

  async function handleDeletePermanently(docId) {
    if (!window.confirm('Delete this document permanently for all linked pets?')) return;
    await supabase.from('pet_documents').delete().eq('id', docId);
    fetchDocs();
  }

  async function handleLinkAnother(docId) {
    const otherPetId = linkPicks[docId];
    if (!otherPetId) return;
    await supabase.from('pet_document_links').insert({ document_id: docId, pet_id: otherPetId });
    setLinkPicks(prev => ({ ...prev, [docId]: '' }));
    fetchDocs();
  }

  function expiryLabel(doc) {
    if (!doc.expires_on) return null;
    const days = Math.round((new Date(doc.expires_on) - new Date()) / 86400000);
    if (days < 0) return { text: `Expired ${doc.expires_on}`, color: COLORS.red };
    if (days <= 30) return { text: `Expires ${doc.expires_on}`, color: COLORS.red };
    return { text: `Expires ${doc.expires_on}`, color: '#888' };
  }

  return (
    <div style={st.docsSection}>
      <h4 style={st.sectionHead}>Documents</h4>
      {loading ? <p style={st.dimText}>Loading…</p> : docs.length === 0 ? (
        <p style={st.dimText}>No documents yet. Upload vet records, insurance cards, or microchip papers below.</p>
      ) : (
        <div style={st.docsList}>
          {docs.map(doc => {
            const exp = expiryLabel(doc);
            const linkable = allPets.filter(p => p.id !== petId && !doc.otherPets.includes(p.name));
            return (
              <div key={doc.id} style={st.docRow}>
                <a href={doc.url} target='_blank' rel='noreferrer' style={st.unsortedLink}>
                  📄 {doc.title || 'Document'}
                </a>
                <span style={st.docTypeBadge}>
                  {DOC_TYPES.find(d => d.value === doc.doc_type)?.label || 'Other'}
                </span>
                {exp && <span style={{ ...st.docExpiry, color: exp.color }}>{exp.text}</span>}
                {doc.otherPets.length > 0 && (
                  <span style={st.docSharedBadge}>Also: {doc.otherPets.join(', ')}</span>
                )}
                {linkable.length > 0 && (
                  <>
                    <select style={st.unsortedSelect} value={linkPicks[doc.id] || ''}
                      onChange={e => setLinkPicks(prev => ({ ...prev, [doc.id]: e.target.value }))}>
                      <option value=''>+ Link to another pet…</option>
                      {linkable.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {linkPicks[doc.id] && (
                      <button style={st.addItemBtn} onClick={() => handleLinkAnother(doc.id)}>Link</button>
                    )}
                  </>
                )}
                <button style={st.removeBtn} onClick={() => handleUnlink(doc.id)}>
                  Unlink from {petName}
                </button>
                <button style={st.removeBtn} onClick={() => handleDeletePermanently(doc.id)}>
                  Delete permanently
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={st.docUploadRow}>
        <select style={st.input} value={docType} onChange={e => setDocType(e.target.value)}>
          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input style={st.input} type='text' placeholder='Title (optional)'
          value={title} onChange={e => setTitle(e.target.value)} />
        <input style={st.input} type='date' placeholder='Expires (optional)'
          value={expiresOn} onChange={e => setExpiresOn(e.target.value)} />
        <label style={st.uploadBtn}>
          {uploading ? 'Uploading…' : '📎 Upload File'}
          <input type='file' accept='.pdf,.doc,.docx,image/*'
            onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
        </label>
      </div>
      {uploadErr && <p style={st.formErr}>{uploadErr}</p>}
    </div>
  );
}
DocumentsSection.propTypes = {
  petId: PropTypes.string.isRequired, petName: PropTypes.string.isRequired,
  customerId: PropTypes.string.isRequired, allPets: PropTypes.array.isRequired,
};

// ─── WeightLog ───────────────────────────────────────────────────────────────
function WeightLog({ petId, currentWeight }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight]   = useState('');
  const [date, setDate]       = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving]   = useState(false);

  useEffect(() => { fetchLogs(); }, [petId]); // eslint-disable-line

  function fetchLogs() {
    setLoading(true);
    supabase.from('pet_weight_logs').select('*').eq('pet_id', petId)
      .order('recorded_at', { ascending: false })
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }

  async function handleAdd() {
    if (!weight) return;
    setSaving(true);
    await supabase.from('pet_weight_logs').insert({
      pet_id: petId, weight_lbs: parseFloat(weight), recorded_at: date,
    });
    await supabase.from('pets').update({ weight_lbs: parseFloat(weight) }).eq('id', petId);
    setWeight(''); setSaving(false);
    fetchLogs();
  }

  async function handleDelete(logId) {
    await supabase.from('pet_weight_logs').delete().eq('id', logId);
    fetchLogs();
  }

  return (
    <div style={st.weightSection}>
      <h4 style={st.sectionHead}>Weight History{currentWeight ? ` · currently ${currentWeight} lbs` : ''}</h4>
      {loading ? <p style={st.dimText}>Loading…</p> : logs.length === 0 ? (
        <p style={st.dimText}>No weight entries logged yet.</p>
      ) : (
        <div style={st.weightList}>
          {logs.map(l => (
            <div key={l.id} style={st.weightRow}>
              <span style={st.weightDate}>{l.recorded_at}</span>
              <span style={st.weightValue}>{l.weight_lbs} lbs</span>
              {l.note && <span style={st.weightNote}>{l.note}</span>}
              <button style={st.removeBtn} onClick={() => handleDelete(l.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
      <div style={st.weightAddRow}>
        <input style={st.input} type='number' min='0' step='0.1' placeholder='Weight (lbs)'
          value={weight} onChange={e => setWeight(e.target.value)} />
        <input style={st.input} type='date' value={date} onChange={e => setDate(e.target.value)} />
        <button style={st.addItemBtn} onClick={handleAdd} disabled={saving || !weight}>
          {saving ? 'Saving…' : '+ Log Weight'}
        </button>
      </div>
    </div>
  );
}
WeightLog.propTypes = { petId: PropTypes.string.isRequired, currentWeight: PropTypes.number };

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
  const [dietOpen, setDietOpen]       = useState(toArr(initial?.diet).length > 0 || (initial?.diet?.free_fed === true));
  const [walkOpen, setWalkOpen]       = useState(toArr(initial?.walking_schedule).length > 0);
  const [medsOpen, setMedsOpen]       = useState(toArr(initial?.medications).length > 0);
  const [vaccsOpen, setVaccsOpen]     = useState(toArr(initial?.vaccinations).length > 0);
  const [allergiesOpen, setAllergiesOpen] = useState(toArr(initial?.allergies).length > 0);
  const [freeFed, setFreeFed]         = useState(initial?.diet?.free_fed === true || false);
  const [vaccUploading, setVaccUploading]       = useState({});
  const [vaccUploadErr, setVaccUploadErr]       = useState({});
  const [vaccAIProcessing, setVaccAIProcessing] = useState({});

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); }

  // ── Diet ──────────────────────────────────────────────────────────────────
  function addDiet()            { setDietOpen(true); setForm(p => ({ ...p, diet: [...p.diet, { ...BLANK_DIET_ENTRY }] })); }
  function removeDiet(i)        { setForm(p => ({ ...p, diet: p.diet.filter((_, x) => x !== i) })); }
  function setDiet(i, field, v) {
    setForm(p => { const d = [...p.diet]; d[i] = { ...d[i], [field]: v }; return { ...p, diet: d }; });
  }

  // ── Walking ───────────────────────────────────────────────────────────────
  function addWalk()            { setWalkOpen(true); setForm(p => ({ ...p, walking_schedule: [...p.walking_schedule, { ...BLANK_WALK_ENTRY }] })); }
  function removeWalk(i)        { setForm(p => ({ ...p, walking_schedule: p.walking_schedule.filter((_, x) => x !== i) })); }
  function setWalk(i, field, v) {
    setForm(p => { const w = [...p.walking_schedule]; w[i] = { ...w[i], [field]: v }; return { ...p, walking_schedule: w }; });
  }
  function toggleWalkDay(i, day) {
    const days = form.walking_schedule[i]?.days ?? [];
    setWalk(i, 'days', days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
  }

  // ── Medications ───────────────────────────────────────────────────────────
  function addMed()             { setMedsOpen(true); setForm(p => ({ ...p, medications: [...p.medications, { name: '', dose: '', frequency: 'Once Daily', time1: '', time2: '', details: '' }] })); }
  function removeMed(i)         { setForm(p => ({ ...p, medications: p.medications.filter((_, x) => x !== i) })); }
  function setMed(i, field, v)  { setForm(p => { const m = [...p.medications]; m[i] = { ...m[i], [field]: v }; return { ...p, medications: m }; }); }

  // ── Vaccinations ──────────────────────────────────────────────────────────
  function addVacc()             { setVaccsOpen(true); setForm(p => ({ ...p, vaccinations: [...p.vaccinations, { ...BLANK_VACC_ENTRY }] })); }
  function removeVacc(i)         { setForm(p => ({ ...p, vaccinations: p.vaccinations.filter((_, x) => x !== i) })); }
  function setVacc(i, field, v)  { setForm(p => { const v2 = [...p.vaccinations]; v2[i] = { ...v2[i], [field]: v }; return { ...p, vaccinations: v2 }; }); }

  // ── Allergies ──────────────────────────────────────────────────────────────
  function addAllergy()            { setAllergiesOpen(true); setForm(p => ({ ...p, allergies: [...p.allergies, { ...BLANK_ALLERGY_ENTRY }] })); }
  function removeAllergy(i)        { setForm(p => ({ ...p, allergies: p.allergies.filter((_, x) => x !== i) })); }
  function setAllergy(i, field, v) { setForm(p => { const a = [...p.allergies]; a[i] = { ...a[i], [field]: v }; return { ...p, allergies: a }; }); }

  // ── Vaccination record upload ────────────────────────────────────────────
  async function handleVaccUpload(e, i) {
    const file = e.target.files?.[0];
    if (!file || !petId) return;
    setVaccUploading(prev => ({ ...prev, [i]: true }));
    setVaccUploadErr(prev => ({ ...prev, [i]: null }));
    const ext  = file.name.split('.').pop().toLowerCase();
    const path = `${userId}/${petId}/vacc_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('pet-photos').upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) {
      setVaccUploadErr(prev => ({ ...prev, [i]: upErr.message }));
      setVaccUploading(prev => ({ ...prev, [i]: false }));
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('pet-photos').getPublicUrl(path);
    setVacc(i, 'record_url', publicUrl);
    setVacc(i, 'record_name', file.name);
    setVaccUploading(prev => ({ ...prev, [i]: false }));

    // ── AI extraction ──────────────────────────────────────────────────────
    setVaccAIProcessing(prev => ({ ...prev, [i]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-vacc-record`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ storagePath: path }),
        }
      );
      if (res.ok) {
        const x = await res.json();
        if (x.vaccine)    setVacc(i, 'vaccine',    x.vaccine);
        if (x.date_given) setVacc(i, 'date_given', x.date_given);
        if (x.next_due)   setVacc(i, 'next_due',   x.next_due);
        if (x.notes)      setVacc(i, 'notes',       x.notes);
      }
    } catch (_) { /* AI extraction is best-effort; silently ignore */ }
    finally { setVaccAIProcessing(prev => ({ ...prev, [i]: false })); }
  }

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
        <label style={st.label}>Microchip Number
          <input style={st.input} type='text' value={form.microchip_number}
            onChange={e => set('microchip_number', e.target.value)} placeholder='985121012345678' />
        </label>
        <label style={st.label}>Microchip Registry
          <input style={st.input} type='text' value={form.microchip_registry}
            onChange={e => set('microchip_registry', e.target.value)} placeholder='AKC Reunite, HomeAgain…' />
        </label>
        <label style={{ ...st.label, gridColumn: '1 / -1' }}>Notes
          <input style={st.input} type='text' value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder='Behavioral notes, general care instructions…' />
        </label>
      </div>

      {/* Optional sections */}
      <div style={st.optWrap}>

        {/* Allergies */}
        <div style={st.optSection}>
          <div style={st.optHeaderRow}>
            <button style={st.optToggle} onClick={() => setAllergiesOpen(o => !o)}>
              {allergiesOpen ? '▾' : '▸'} Allergies
              {form.allergies.length > 0 && <span style={st.badgeAlert}>{form.allergies.length}</span>}
            </button>
            <button style={st.addItemBtn} onClick={addAllergy}>+ Add Allergy</button>
          </div>
          {allergiesOpen && (
            <div>
              {form.allergies.map((a, i) => (
                <div key={i} style={st.listItem}>
                  <div style={st.row3}>
                    <label style={st.label}>Allergen
                      <input style={st.input} type='text' value={a.allergen}
                        onChange={e => setAllergy(i, 'allergen', e.target.value)} placeholder='Chicken, bee stings…' />
                    </label>
                    <label style={st.label}>Severity
                      <select style={st.input} value={a.severity} onChange={e => setAllergy(i, 'severity', e.target.value)}>
                        {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </label>
                    <label style={st.label}>Notes
                      <input style={st.input} type='text' value={a.notes ?? ''}
                        onChange={e => setAllergy(i, 'notes', e.target.value)} placeholder='Reaction, treatment…' />
                    </label>
                  </div>
                  <button style={st.removeBtn} onClick={() => removeAllergy(i)}>Remove</button>
                </div>
              ))}
              {form.allergies.length === 0 && (
                <p style={st.dimText}>No allergies on file. This is shown to your sitter for safety.</p>
              )}
            </div>
          )}
        </div>

        {/* Feeding Schedule */}
        <div style={st.optSection}>
          <div style={st.optHeaderRow}>
            <button style={st.optToggle} onClick={() => setDietOpen(o => !o)}>
              {dietOpen ? '▾' : '▸'} Feeding Schedule
              {(form.diet.length > 0 || freeFed) && <span style={st.badge}>{freeFed ? 'Free fed' : form.diet.length}</span>}
            </button>
            <button style={st.addItemBtn} onClick={addDiet}>+ Add Feeding</button>
          </div>
          {dietOpen && (
            <div>
              <label style={st.freeFedRow}>
                <input type='checkbox' checked={freeFed}
                  onChange={e => { setFreeFed(e.target.checked); set('free_fed', e.target.checked); }} />
                Free fed (main food is always available)
              </label>
              {freeFed && (
                <p style={st.dimText}>Add treats, supplements, or any scheduled feedings below.</p>
              )}
              {form.diet.map((entry, i) => (
                <DietEntry key={i} entry={entry} index={i} onChange={setDiet} onRemove={removeDiet} />
              ))}
              {!freeFed && form.diet.length === 0 && (
                <p style={st.dimText}>No feedings added. Click &quot;+ Add Feeding&quot; to build a daily schedule.</p>
              )}
            </div>
          )}
        </div>

        {/* Walking Schedule */}
        <div style={st.optSection}>
          <div style={st.optHeaderRow}>
            <button style={st.optToggle} onClick={() => setWalkOpen(o => !o)}>
              {walkOpen ? '▾' : '▸'} Walking Schedule
              {form.walking_schedule.length > 0 && <span style={st.badge}>{form.walking_schedule.length}</span>}
            </button>
            <button style={st.addItemBtn} onClick={addWalk}>+ Add Walk</button>
          </div>
          {walkOpen && (
            <div>
              {form.walking_schedule.map((entry, i) => (
                <WalkEntry key={i} entry={entry} index={i}
                  onChange={setWalk} onRemove={removeWalk} onToggleDay={toggleWalkDay} />
              ))}
              {form.walking_schedule.length === 0 && (
                <p style={st.dimText}>No walks added. Click &quot;+ Add Walk&quot; to add a morning, evening, etc.</p>
              )}
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
          {medsOpen && form.medications.map((m, i) => {
            const freq = m.frequency || 'Once Daily';
            return (
              <div key={i} style={st.listItem}>
                <div style={st.row2}>
                  <label style={st.label}>Name
                    <input style={st.input} type='text' value={m.name || ''}
                      onChange={e => setMed(i, 'name', e.target.value)} placeholder='Heartgard' />
                  </label>
                  <label style={st.label}>Dose
                    <input style={st.input} type='text' value={m.dose || ''}
                      onChange={e => setMed(i, 'dose', e.target.value)} placeholder='1 tablet' />
                  </label>
                </div>
                <label style={st.label}>Frequency
                  <select style={st.input} value={freq} onChange={e => setMed(i, 'frequency', e.target.value)}>
                    {['Monthly', 'Once Daily', 'Twice Daily', 'Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </label>
                {(freq === 'Once Daily' || freq === 'Twice Daily') && (
                  <div style={st.row2}>
                    <label style={st.label}>{freq === 'Twice Daily' ? 'Time 1' : 'Time'}
                      <input style={st.input} type='time' value={m.time1 || ''}
                        onChange={e => setMed(i, 'time1', e.target.value)} />
                    </label>
                    {freq === 'Twice Daily' && (
                      <label style={st.label}>Time 2
                        <input style={st.input} type='time' value={m.time2 || ''}
                          onChange={e => setMed(i, 'time2', e.target.value)} />
                      </label>
                    )}
                  </div>
                )}
                <label style={st.label}>Details
                  <input style={st.input} type='text' value={m.details || ''}
                    onChange={e => setMed(i, 'details', e.target.value)}
                    placeholder='Instructions, prescribing vet, etc.' />
                </label>
                <button style={st.removeBtn} onClick={() => removeMed(i)}>Remove</button>
              </div>
            );
          })}
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
              {vaccAIProcessing[i] && (
                <p style={st.aiProcessingMsg}>🤖 Extracting details from record…</p>
              )}
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
              <label style={{ ...st.label, marginBottom: '0.4rem' }}>Notes
                <input style={st.input} type='text' value={v.notes ?? ''}
                  onChange={e => setVacc(i, 'notes', e.target.value)}
                  placeholder='Lot number, clinic, additional notes…' />
              </label>
              {/* Vaccination record upload (edit mode only) */}
              {!isNew && petId && (
                <div style={st.vaccFileRow}>
                  {v.record_url ? (
                    <span style={st.vaccFileLink}>
                      📄 <a href={v.record_url} target='_blank' rel='noreferrer' style={{ color: COLORS.blue }}>
                        {v.record_name || 'Vaccination Record'}
                      </a>
                      <button style={st.removeBtn} onClick={() => { setVacc(i, 'record_url', ''); setVacc(i, 'record_name', ''); }}>
                        Remove file
                      </button>
                    </span>
                  ) : (
                    <label style={st.uploadBtn}>
                      {vaccUploading[i] ? 'Uploading…' : '📎 Attach Record (PDF/DOC)'}
                      <input type='file' accept='.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                        onChange={e => handleVaccUpload(e, i)} disabled={vaccUploading[i]} style={{ display: 'none' }} />
                    </label>
                  )}
                  {vaccUploadErr[i] && <p style={st.formErr}>{vaccUploadErr[i]}</p>}
                </div>
              )}
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
      {/* Row 1: Meal Label + Food Type */}
      <div style={st.row2}>
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
      </div>
      {/* Row 2: Time + Amount */}
      <div style={{ ...st.row2, marginTop: '0.4rem' }}>
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
      {/* Notes — always visible */}
      <label style={{ ...st.label, marginTop: '0.4rem' }}>Notes
        <input style={st.input} type='text' value={entry.notes}
          onChange={e => onChange(index, 'notes', e.target.value)}
          placeholder={entry.type === 'Other' ? 'Describe the food or any special instructions…' : 'Additional notes…'} />
      </label>
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
  badgeAlert: {
    display: 'inline-block', background: '#fdeceb', color: COLORS.red,
    fontFamily: FONTS.body, fontSize: '0.72rem', fontWeight: '700', borderRadius: '10px',
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
  shareRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.6rem', flexWrap: 'wrap' },
  shareBtn: {
    padding: '0.3rem 0.65rem', background: COLORS.white, border: `1px solid ${COLORS.blue}`,
    color: COLORS.blue, borderRadius: '6px', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.8rem',
  },
  stopShareBtn: {
    background: 'none', border: 'none', color: '#999', cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: '0.78rem', textDecoration: 'underline',
  },
  copyMsg: { fontFamily: FONTS.body, fontSize: '0.78rem', color: '#2a7a3b' },
  expandedWrap: {
    marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #eef3fa',
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
  },
  fullWidth: { gridColumn: '1 / -1' },
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
  // Unsorted documents
  unsortedWrap: {
    border: `1px solid ${COLORS.blue}`, borderRadius: '10px', padding: '1rem 1.25rem',
    marginBottom: '1rem', background: '#f4f9ff',
  },
  unsortedHead: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1rem', marginBottom: '0.25rem' },
  unsortedRow: {
    display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0',
    borderTop: '1px solid #dde8f4', flexWrap: 'wrap',
  },
  unsortedLink: { fontFamily: FONTS.body, fontSize: '0.88rem', color: COLORS.blue, textDecoration: 'none' },
  unsortedMeta: { display: 'block', fontFamily: FONTS.body, fontSize: '0.75rem', color: '#999' },
  unsortedSelect: {
    padding: '0.35rem 0.5rem', borderRadius: '6px', border: `1px solid ${COLORS.lightBlue}`,
    fontFamily: FONTS.body, fontSize: '0.82rem',
  },
  unsortedCheckRow: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.35rem' },
  unsortedCheckLabel: {
    display: 'flex', alignItems: 'center', gap: '0.25rem',
    fontFamily: FONTS.body, fontSize: '0.8rem', color: '#555',
  },
  // Documents section (per pet)
  docsSection: { marginTop: '0.5rem' },
  docsList: { marginBottom: '0.5rem' },
  docRow: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0',
    borderBottom: '1px solid #f0f4fa', flexWrap: 'wrap',
  },
  docTypeBadge: {
    fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.lightBlue,
    border: `1px solid ${COLORS.lightBlue}`, borderRadius: '8px', padding: '0.05rem 0.4rem',
  },
  docExpiry: { fontFamily: FONTS.body, fontSize: '0.72rem' },
  docSharedBadge: { fontFamily: FONTS.body, fontSize: '0.72rem', color: COLORS.lightBlue, fontStyle: 'italic' },
  docUploadRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' },
  // Weight log
  weightSection: { marginTop: '0.5rem' },
  weightList: { marginBottom: '0.5rem' },
  weightRow: {
    display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.3rem 0',
    borderBottom: '1px solid #f0f4fa', fontFamily: FONTS.body, fontSize: '0.82rem',
  },
  weightDate:  { color: '#555', minWidth: '90px' },
  weightValue: { color: COLORS.black, fontWeight: '600' },
  weightNote:  { color: '#888', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  weightAddRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' },
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
  row2:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.3rem' },
  row4:      { display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 1fr', gap: '0.5rem', marginBottom: '0.3rem' },
  freeFedRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: FONTS.body, fontSize: '0.875rem', color: COLORS.black, marginBottom: '0.5rem', cursor: 'pointer' },
  vaccFileRow: { marginTop: '0.4rem', marginBottom: '0.2rem' },
  aiProcessingMsg: { fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.blue, fontStyle: 'italic', marginBottom: '0.4rem' },
  vaccFileLink: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: FONTS.body, fontSize: '0.82rem' },
  row3:      { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.3rem' },
  microLabel: { fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.black, display: 'block', marginBottom: '0.3rem' },
  daysRow:   { display: 'flex', gap: '0.3rem', flexWrap: 'wrap' },
  dayBtn:    { padding: '0.2rem 0.45rem', border: `1px solid ${COLORS.lightBlue}`, borderRadius: '4px', background: COLORS.white, color: COLORS.lightBlue, fontFamily: FONTS.body, fontSize: '0.77rem', cursor: 'pointer' },
  dayBtnOn:  { background: COLORS.blue, color: COLORS.white, borderColor: COLORS.blue },
  removeBtn: { background: 'none', border: 'none', color: COLORS.red, fontFamily: FONTS.body, fontSize: '0.8rem', cursor: 'pointer', padding: '0.2rem 0', marginTop: '0.3rem' },
};
