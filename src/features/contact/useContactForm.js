import { useState } from 'react';

const INITIAL_STATE = {
  name: '',
  email: '',
  phone: '',
  petType: '',
  service: '',
  message: '',
};

const REQUIRED_FIELDS = ['name', 'email', 'message'];

// Phase 1: submits via mailto.
// Phase 2: replace handleSubmit body with Supabase insert into contact_submissions.
function useContactForm() {
  const [fields, setFields] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function validate() {
    const next = {};
    REQUIRED_FIELDS.forEach((field) => {
      if (!fields[field].trim()) {
        next[field] = 'This field is required.';
      }
    });
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      next.email = 'Please enter a valid email address.';
    }
    return next;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const body = [
      `Name: ${fields.name}`,
      `Email: ${fields.email}`,
      `Phone: ${fields.phone || 'Not provided'}`,
      `Pet Type: ${fields.petType || 'Not specified'}`,
      `Service Interest: ${fields.service || 'Not specified'}`,
      ``,
      `Message:`,
      fields.message,
    ].join('\n');

    const mailto = `mailto:petsitter@tailwindspetcare.com`
      + `?subject=${encodeURIComponent('Inquiry from ' + fields.name)}`
      + `&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
    setSubmitted(true);
    setFields(INITIAL_STATE);
  }

  return { fields, errors, submitted, handleChange, handleSubmit };
}

export default useContactForm;
