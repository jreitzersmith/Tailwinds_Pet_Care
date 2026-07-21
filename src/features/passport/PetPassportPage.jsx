import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr + 'T00:00:00');
  if (isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function vaccStatus(v) {
  const days = daysUntil(v.next_due);
  if (days === null) return null;
  if (days < 0)  return { label: 'Overdue', color: COLORS.red };
  if (days <= 30) return { label: `Due in ${days}d`, color: COLORS.red };
  return { label: 'Current', color: '#2a7a3b' };
}

export default function PetPassportPage() {
  const { token } = useParams();
  const [pet, setPet]       = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: petRows, error: petErr }, { data: photoRows }] = await Promise.all([
        supabase.rpc('get_pet_passport', { token }),
        supabase.rpc('get_pet_passport_photos', { token }),
      ]);
      if (petErr || !petRows || petRows.length === 0) {
        setNotFound(true);
      } else {
        setPet(petRows[0]);
        setPhotos(photoRows || []);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) return <p style={s.msg}>Loading pet passport…</p>;
  if (notFound) {
    return (
      <div style={s.wrap}>
        <p style={s.notFound}>
          This link is invalid, or sharing has been turned off for this pet.
        </p>
      </div>
    );
  }

  const allergies    = Array.isArray(pet.allergies) ? pet.allergies : [];
  const vaccinations = Array.isArray(pet.vaccinations) ? pet.vaccinations : [];
  const medications  = Array.isArray(pet.medications) ? pet.medications : [];
  const hasPreferredVet = pet.preferred_vet_name || pet.preferred_vet_clinic;
  const hasEmergencyVet = pet.emergency_vet_name || pet.emergency_vet_clinic;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.thumb}>
          {pet.profile_image_url
            ? <img src={pet.profile_image_url} style={s.thumbImg} alt={pet.name} />
            : <span style={s.thumbIcon}>🐾</span>}
        </div>
        <div>
          <h1 style={s.name}>{pet.name}</h1>
          <p style={s.meta}>
            {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
            {pet.weight_lbs ? ` · ${pet.weight_lbs} lbs` : ''}
            {pet.age_years ? ` · ${pet.age_years} yrs` : ''}
          </p>
        </div>
        <button style={s.printBtn} onClick={() => window.print()}>🖨 Print</button>
      </div>

      {allergies.length > 0 && (
        <section style={s.alertSection}>
          <h2 style={s.alertHead}>⚠ Allergies</h2>
          {allergies.map((a, i) => (
            <div key={i} style={s.alertRow}>
              <strong>{a.allergen}</strong> — {a.severity}{a.notes ? ` · ${a.notes}` : ''}
            </div>
          ))}
        </section>
      )}

      {(pet.microchip_number || pet.microchip_registry) && (
        <section style={s.section}>
          <h2 style={s.sectionHead}>Microchip</h2>
          <p style={s.plain}>
            {pet.microchip_number || '—'}{pet.microchip_registry ? ` · ${pet.microchip_registry}` : ''}
          </p>
        </section>
      )}

      {(hasPreferredVet || hasEmergencyVet) && (
        <section style={s.section}>
          <h2 style={s.sectionHead}>Veterinary Contacts</h2>
          <div style={s.vetGrid}>
            {hasPreferredVet && (
              <div style={s.vetCard}>
                <span style={s.vetLabel}>Preferred Vet</span>
                <span style={s.vetName}>{pet.preferred_vet_name}</span>
                {pet.preferred_vet_clinic && <span>{pet.preferred_vet_clinic}</span>}
                {pet.preferred_vet_phone && <span>{pet.preferred_vet_phone}</span>}
                {pet.preferred_vet_address && <span>{pet.preferred_vet_address}</span>}
              </div>
            )}
            {hasEmergencyVet && (
              <div style={s.vetCard}>
                <span style={s.vetLabel}>Emergency / After-Hours Vet</span>
                <span style={s.vetName}>{pet.emergency_vet_name}</span>
                {pet.emergency_vet_clinic && <span>{pet.emergency_vet_clinic}</span>}
                {pet.emergency_vet_phone && <span>{pet.emergency_vet_phone}</span>}
                {pet.emergency_vet_address && <span>{pet.emergency_vet_address}</span>}
              </div>
            )}
          </div>
        </section>
      )}

      {vaccinations.length > 0 && (
        <section style={s.section}>
          <h2 style={s.sectionHead}>Vaccinations</h2>
          {vaccinations.map((v, i) => {
            const status = vaccStatus(v);
            return (
              <div key={i} style={s.vaccRow}>
                <span style={s.vaccName}>{v.vaccine || 'Vaccine'}</span>
                <span>Given {v.date_given || '—'}</span>
                <span>Due {v.next_due || '—'}</span>
                {status && <span style={{ ...s.vaccStatus, color: status.color }}>{status.label}</span>}
              </div>
            );
          })}
        </section>
      )}

      {medications.length > 0 && (
        <section style={s.section}>
          <h2 style={s.sectionHead}>Medications</h2>
          {medications.map((m, i) => (
            <div key={i} style={s.medRow}>
              <strong>{m.name}</strong> — {m.dose} · {m.frequency}
              {m.details ? ` · ${m.details}` : ''}
            </div>
          ))}
        </section>
      )}

      {photos.length > 0 && (
        <section style={s.section}>
          <h2 style={s.sectionHead}>Photos</h2>
          <div style={s.photoGrid}>
            {photos.map(p => (
              <img key={p.id} src={p.url} style={s.photoThumb} alt={p.caption || pet.name} />
            ))}
          </div>
        </section>
      )}

      <p style={s.footer}>Shared via Tailwinds Pet Care · tailwindspetcare.com</p>
    </div>
  );
}

const s = {
  wrap:  { maxWidth: '640px', margin: '0 auto', padding: '2rem 1.25rem 3rem' },
  msg:   { fontFamily: FONTS.body, color: COLORS.lightBlue, textAlign: 'center', padding: '3rem' },
  notFound: { fontFamily: FONTS.body, color: '#777', textAlign: 'center', padding: '3rem' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  thumb: {
    width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
    background: '#e8f4fc', display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', border: `1px solid ${COLORS.lightBlue}`,
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbIcon: { fontSize: '1.8rem' },
  name: { fontFamily: FONTS.header, color: COLORS.blue, margin: 0, fontSize: '1.6rem' },
  meta: { fontFamily: FONTS.body, color: '#777', margin: '0.2rem 0 0' },
  printBtn: {
    marginLeft: 'auto', padding: '0.4rem 0.8rem', background: COLORS.white,
    border: `1px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: '6px',
    cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.85rem',
  },
  alertSection: {
    background: '#fdeceb', border: `1px solid ${COLORS.red}`, borderRadius: '8px',
    padding: '1rem 1.25rem', marginBottom: '1.5rem',
  },
  alertHead: { fontFamily: FONTS.header, color: COLORS.red, fontSize: '1.05rem', marginTop: 0, marginBottom: '0.5rem' },
  alertRow: { fontFamily: FONTS.body, fontSize: '0.9rem', color: '#333', marginBottom: '0.3rem' },
  section: { marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #eef3fa' },
  sectionHead: { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1.05rem', marginBottom: '0.5rem' },
  plain: { fontFamily: FONTS.body, fontSize: '0.92rem', color: '#333' },
  vetGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  vetCard: {
    display: 'flex', flexDirection: 'column', gap: '0.15rem',
    fontFamily: FONTS.body, fontSize: '0.88rem', color: '#333',
    background: '#f8fbff', borderRadius: '8px', padding: '0.75rem 1rem',
  },
  vetLabel: { fontSize: '0.75rem', color: COLORS.lightBlue, fontWeight: '700', marginBottom: '0.2rem' },
  vetName: { fontWeight: '600', color: COLORS.black },
  vaccRow: {
    display: 'flex', gap: '1rem', flexWrap: 'wrap', fontFamily: FONTS.body,
    fontSize: '0.88rem', color: '#333', padding: '0.3rem 0', borderBottom: '1px solid #f5f8fc',
  },
  vaccName: { fontWeight: '600', minWidth: '100px' },
  vaccStatus: { fontWeight: '700', marginLeft: 'auto' },
  medRow: { fontFamily: FONTS.body, fontSize: '0.9rem', color: '#333', marginBottom: '0.3rem' },
  photoGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  photoThumb: { width: '90px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #dde8f4' },
  footer: { fontFamily: FONTS.body, fontSize: '0.75rem', color: '#bbb', textAlign: 'center', marginTop: '2rem' },
};
