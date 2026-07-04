import { useState } from 'react';

// Steps: 0=schedule, 1=pet, 2=service, 3=confirm
export const STEPS = ['Schedule', 'Pet', 'Service', 'Confirm'];

const INITIAL = {
  // Service selection
  serviceId: null,
  serviceName: '',
  basePrice: 0,       // multiplied total (unit × checked count); updated live
  baseUnitPrice: 0,   // per-slot unit price; set on service select
  isQuote: false,
  addonIds: [],
  addonNames: [],
  addonTotal: 0,      // multiplied total for all add-ons
  addonSlots: {},     // { [addonId]: { [date]: { [rowId]: bool } } }
  addonSlotRows: {},  // { [addonId]: [{ id, label }] } — editable row labels per addon
  // Extra services (multi-select categories)
  extraServiceIds:   [],
  extraServiceNames: [],
  extraTotal:        0,
  extraServiceData:  {},
  // Schedule
  bookingDate: '',
  bookingEndDate: '',
  bookingTime: '',
  // Pet
  petId: null, petName: ``,
  petIsNew: false,
  petSchedule: null,
  newPet: {
    name: '', species: 'Dog', breed: '', age_years: '', weight_lbs: '', notes: '',
    diet: [], walking_schedule: [],
  },
  // Slot grid for primary service
  serviceSlotRows: [{ id: 'morning', label: 'Morning' }, { id: 'evening', label: 'Evening' }],
  serviceSlots: {},
  // Confirm — pricing resolved from address
  address: '',
  zone: null,
  travelFee: 0,
  totalPrice: 0,
  specialInstructions: '',
  transportOrigin: '',
  transportDest:   '',
  editBookingId:   null,  // set when editing an existing booking
};

// initialOverride: used when navigating from portal (e.g. "Copy to new dates")
export default function useBookingForm(initialOverride = {}) {
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState({ ...INITIAL, ...initialOverride });
  const [errors, setErrors] = useState({});

  function update(fields) {
    setForm(prev => ({ ...prev, ...fields }));
  }
  function next() { setErrors({}); setStep(s => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setErrors({}); setStep(s => Math.max(s - 1, 0)); }
  function reset() { setStep(0); setForm(INITIAL); setErrors({}); }

  return { step, form, errors, setErrors, update, next, back, reset };
}
