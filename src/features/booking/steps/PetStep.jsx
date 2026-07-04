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
    update({ newPet: { ...fo