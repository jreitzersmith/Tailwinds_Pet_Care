import { useState } from 'react';

// Steps: 0=service, 1=schedule, 2=pet, 3=confirm
export const STEPS = ['Service', 'Schedule', 'Pet', 'Confirm'];

const INITIAL = {
  // Step 0
  serviceId: null,
  serviceName: '',
  basePrice: 0,
  // Step 1
  bookingDate: '',
  bookingTime: '',
  // Step 2
  petId: null,       // existing pet UUID, or null if adding new
  petIsNew: false,
  newPet: { name: '', species: 'Dog', breed: '', age_years: '', weight_lbs: '', notes: '' },
  // Step 3 (pricing, resolved from address → zone lookup)
  address: '',
  zone: null,
  travelFee: 0,
  totalPrice: 0,
  specialInstructions: '',
};

export default function useBookingForm() {
  const [step, setStep]   = useState(0);
  const [form, setForm]   = useState(INITIAL);
  const [errors, setErrors] = useState({});

  function update(fields) {
    setForm(prev => ({ ...prev, ...fields }));
  }

  function next() {
    setErrors({});
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setErrors({});
    setStep(s => Math.max(s - 1, 0));
  }

  function reset() {
    setStep(0);
    setForm(INITIAL);
    setErrors({});
  }

  return { step, form, errors, setErrors, update, next, back, reset };
}
