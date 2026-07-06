import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase.js';
import { COLORS, FONTS } from '../../constants.jsx';

// ── Variable metadata ─────────────────────────────────────────────────────────
const VARIABLE_META = {
  '{{customer_name}}': { label: 'Customer Name',  sample: 'Jane Smith',                             desc: "Customer's full name" },
  '{{service_name}}':  { label: 'Service Name',   sample: 'Drop-In Visits',                         desc: 'Primary service booked' },
  '{{pet_name}}':      { label: 'Pet Name',        sample: 'Biscuit',                                desc: "Pet's name" },
  '{{date_range}}':    { label: 'Date Range',      sample: 'July 10 – July 12, 2026',               desc: 'Full date range (or single date)' },
  '{{booking_date}}':  { label: 'Booking Date',    sample: 'July 10, 2026',                          desc: 'Start date of service' },
  '{{booking_time}}':  { label: 'Booking Time',    sample: '10:00 AM',                               desc: 'Scheduled time if set — wrap in {{#if booking_time}}…{{/if}} to hide when empty' },
};

// Sample values used for preview rendering
const SAMPLE = Object.fromEntries(
  Object.entries(VARIABLE_META).map(([k, v]) => [k.replace(/\{\{|\}\}/g, ''), v.sample])
);

// Applies {{variable}} substitution + {{#if var}}…{{/if}} conditionals
function applyVars(text, vars) {
  if (!text) return '';
  // Process conditionals first
  let result = text.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) =>
    vars[key] ? inner : ''
  );
  // Replace remaining variables
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ''), result);
}

// ── Settings categories (left sidebar) ───────────────────────────────────────
const CATEGORIES = [
  { key: 'email_templates', label: 'Email Templates', icon: '✉' },
  // Future categories: { key: 'notifications', label: 'Notifications', icon: '🔔' },
  //                    { key: 'general',       label: 'General',       icon: '⚙' },
];

// ── Email Templates editor ────────────────────────────────────────────────────
function EmailTemplatesEditor() {
  const [templates,    setTemplates]    = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [draft,        setDraft]        = useState({ subject: '', body_html: '' });
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState(null); // { ok: bool, text: string }
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [activeTab,    setActiveTab]    = useState('subject'); // 'subject' | 'body' | 'preview'

  useEffect(() => {
    supabase
      .from('email_templates')
      .select('id, slug, name, description, subject, body_html, variables, is_active')
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) {
          setTemplates(data);
          if (data.length > 0) selectTemplate(data[0], data);
        }
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTemplate(t, list) {
    setSelectedSlug(t.slug);
    setDraft({ subject: t.subject, body_html: t.body_html });
    setSaveMsg(null);
    setActiveTab('body');
    // If list not provided, use current state
    if (!list) setTemplates(prev => prev);
  }

  const selected = templates.find(t => t.slug === selectedSlug);

  async function handleSave() {
    if (!selected) return;
    setSaving(true); setSaveMsg(null);
    const { error } = await supabase
      .from('email_templates')
      .update({
        subject:   draft.subject,
        body_html: draft.body_html,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', selected.slug);
    setSaving(false);
    if (error) {
      setSaveMsg({ ok: false, text: `Save failed: ${error.message}` });
    } else {
      setSaveMsg({ ok: true, text: 'Template saved.' });
      setTemplates(prev => prev.map(t =>
        t.slug === selected.slug ? { ...t, ...draft } : t
      ));
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  async function handleToggleActive() {
    if (!selected) return;
    const next = !selected.is_active;
    const { error } = await supabase
      .from('email_templates')
      .update({ is_active: next })
      .eq('slug', selected.slug);
    if (!error) {
      setTemplates(prev => prev.map(t =>
        t.slug === selected.slug ? { ...t, is_active: next } : t
      ));
    }
  }

  const previewSubject  = applyVars(draft.subject, SAMPLE);
  const previewBody     = applyVars(draft.body_html, SAMPLE);

  if (loading) return <p style={ts.msg}>Loading templates…</p>;

  return (
    <div style={ts.container}>
      {/* Template list */}
      <div style={ts.templateList}>
        {templates.map(t => (
          <button
            key={t.slug}
            style={{ ...ts.templateBtn, ...(t.slug === selectedSlug ? ts.templateBtnActive : {}) }}
            onClick={() => selectTemplate(t)}
          >
            <span style={ts.templateBtnName}>{t.name}</span>
            <span style={{ ...ts.templateBtnStatus, color: t.is_active ? '#28A745' : COLORS.lightBlue }}>
              {t.is_active ? 'Active' : 'Disabled'}
            </span>
          </button>
        ))}
      </div>

      {/* Editor pane */}
      {selected ? (
        <div style={ts.editorPane}>
          {/* Header */}
          <div style={ts.editorHeader}>
            <div>
              <h3 style={ts.editorTitle}>{selected.name}</h3>
              {selected.description && (
                <p style={ts.editorDesc}>{selected.description}</p>
              )}
            </div>
            <button
              style={{ ...ts.toggleActiveBtn, color: selected.is_active ? COLORS.red : '#28A745' }}
              onClick={handleToggleActive}
            >
              {selected.is_active ? 'Disable' : 'Enable'}
            </button>
          </div>

          {/* Variables reference */}
          <details style={ts.varDetails}>
            <summary style={ts.varSummary}>Available Variables</summary>
            <div style={ts.varGrid}>
              {(selected.variables || []).map(v => {
                const meta = VARIABLE_META[v] || {};
                return (
                  <div key={v} style={ts.varRow}>
                    <code
                      style={ts.varCode}
                      title='Click to copy'
                      onClick={() => navigator.clipboard?.writeText(v)}
                    >
                      {v}
                    </code>
                    <span style={ts.varDesc}>{meta.desc || v}</span>
                  </div>
                );
              })}
              <div style={{ ...ts.varRow, gridColumn: '1 / -1' }}>
                <code style={{ ...ts.varCode, whiteSpace: 'nowrap' }}>{'{{#if booking_time}}…{{/if}}'}</code>
                <span style={ts.varDesc}>Conditional block — renders only when the variable has a value</span>
              </div>
            </div>
          </details>

          {/* Tab bar */}
          <div style={ts.tabBar}>
            {[['subject','Subject Line'],['body','HTML Body'],['preview','Preview']].map(([key, label]) => (
              <button
                key={key}
                style={{ ...ts.tab, ...(activeTab === key ? ts.tabActive : {}) }}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Subject tab */}
          {activeTab === 'subject' && (
            <div style={ts.fieldWrap}>
              <input
                style={ts.subjectInput}
                value={draft.subject}
                onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                placeholder='Email subject line…'
              />
              <p style={ts.fieldHint}>
                Preview: <em>{previewSubject}</em>
              </p>
            </div>
          )}

          {/* Body tab */}
          {activeTab === 'body' && (
            <textarea
              style={ts.bodyTextarea}
              value={draft.body_html}
              onChange={e => setDraft(d => ({ ...d, body_html: e.target.value }))}
              spellCheck={false}
            />
          )}

          {/* Preview tab */}
          {activeTab === 'preview' && (
            <div style={ts.previewWrap}>
              <div style={ts.previewSubjectBar}>
                <span style={ts.previewSubjectLabel}>Subject:</span>
                <span style={ts.previewSubjectValue}>{previewSubject}</span>
              </div>
              <div style={ts.previewNote}>
                Rendered with sample values — actual emails will use real booking data.
              </div>
              <div
                style={ts.previewFrame}
                dangerouslySetInnerHTML={{ __html: previewBody }}
              />
            </div>
          )}

          {/* Footer */}
          <div style={ts.footer}>
            {saveMsg && (
              <span style={{ ...ts.saveMsg, color: saveMsg.ok ? '#155724' : COLORS.red }}>
                {saveMsg.text}
              </span>
            )}
            <button style={ts.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </div>
      ) : (
        <div style={ts.editorPane}>
          <p style={ts.msg}>Select a template to edit it.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Settings Panel ───────────────────────────────────────────────────────
export default function AdminSettingsPanel() {
  const [category, setCategory] = useState('email_templates');

  return (
    <div style={ps.page}>
      {/* Settings sidebar */}
      <div style={ps.sidebar}>
        <p style={ps.sidebarHeading}>Settings</p>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            style={{ ...ps.catBtn, ...(category === c.key ? ps.catBtnActive : {}) }}
            onClick={() => setCategory(c.key)}
          >
            <span style={ps.catIcon}>{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Settings content */}
      <div style={ps.content}>
        {category === 'email_templates' && <EmailTemplatesEditor />}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ps = {
  page:    { display: 'flex', gap: '1.5rem', alignItems: 'flex-start', minHeight: '500px' },
  sidebar: { flex: '0 0 180px', display: 'flex', flexDirection: 'column', gap: '2px' },
  sidebarHeading: {
    fontFamily: FONTS.body, fontSize: '0.7rem', color: COLORS.lightBlue,
    textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem',
  },
  catBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.5rem 0.75rem', border: 'none', background: 'none',
    borderRadius: '6px', fontFamily: FONTS.body, fontSize: '0.875rem',
    color: COLORS.lightBlue, cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  catBtnActive: { background: '#eef7ff', color: COLORS.blue, fontWeight: '600' },
  catIcon: { fontSize: '1rem' },
  content: { flex: 1, minWidth: 0 },
};

const ts = {
  container:    { display: 'flex', gap: '1rem', alignItems: 'flex-start' },
  templateList: {
    flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: '4px',
    borderRight: `1px solid #e0ebf5`, paddingRight: '1rem',
  },
  templateBtn: {
    display: 'flex', flexDirection: 'column', gap: '2px',
    padding: '0.6rem 0.75rem', border: '1px solid transparent',
    borderRadius: '8px', background: 'none', cursor: 'pointer', textAlign: 'left',
    fontFamily: FONTS.body,
  },
  templateBtnActive:  { background: '#eef7ff', border: `1px solid ${COLORS.lightBlue}` },
  templateBtnName:    { fontSize: '0.875rem', color: COLORS.black, fontWeight: '600' },
  templateBtnStatus:  { fontSize: '0.72rem' },

  editorPane:   { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  editorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' },
  editorTitle:  { fontFamily: FONTS.header, color: COLORS.blue, fontSize: '1rem', margin: '0 0 0.2rem' },
  editorDesc:   { fontFamily: FONTS.body, fontSize: '0.8rem', color: '#777', margin: 0 },
  toggleActiveBtn: {
    padding: '0.3rem 0.85rem', border: '1px solid currentColor', borderRadius: '6px',
    background: 'none', fontFamily: FONTS.body, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0,
  },

  varDetails: { border: `1px solid #e0ebf5`, borderRadius: '8px', padding: '0.5rem 0.75rem' },
  varSummary: {
    fontFamily: FONTS.body, fontSize: '0.8rem', color: COLORS.lightBlue,
    cursor: 'pointer', userSelect: 'none', listStyle: 'none',
  },
  varGrid: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 1rem', marginTop: '0.5rem', alignItems: 'center' },
  varRow:  { display: 'contents' },
  varCode: {
    fontFamily: 'monospace', fontSize: '0.78rem', background: '#f0f6fd',
    padding: '2px 6px', borderRadius: '4px', color: COLORS.blue,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  varDesc: { fontFamily: FONTS.body, fontSize: '0.78rem', color: '#666' },

  tabBar:   { display: 'flex', borderBottom: `2px solid #e0ebf5`, gap: '0' },
  tab: {
    padding: '0.4rem 1.1rem', background: 'none', border: 'none',
    fontFamily: FONTS.body, fontSize: '0.85rem', color: COLORS.lightBlue,
    cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-2px',
  },
  tabActive: { color: COLORS.blue, borderBottomColor: COLORS.blue, fontWeight: '600' },

  fieldWrap:    { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  subjectInput: {
    padding: '0.55rem 0.75rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontSize: '0.95rem',
    outline: 'none', fontFamily: FONTS.body, width: '100%', boxSizing: 'border-box',
  },
  fieldHint: { fontFamily: FONTS.body, fontSize: '0.78rem', color: '#999', margin: 0 },

  bodyTextarea: {
    width: '100%', boxSizing: 'border-box', minHeight: '420px',
    padding: '0.6rem 0.75rem', borderRadius: '6px',
    border: `1px solid ${COLORS.lightBlue}`, fontFamily: 'monospace',
    fontSize: '0.8rem', color: COLORS.black, resize: 'vertical', outline: 'none',
    lineHeight: 1.5,
  },

  previewWrap:         { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  previewSubjectBar:   { display: 'flex', gap: '0.5rem', alignItems: 'baseline', padding: '0.5rem 0.75rem', background: '#f8fbff', borderRadius: '6px', border: `1px solid #e0ebf5` },
  previewSubjectLabel: { fontFamily: FONTS.body, fontSize: '0.75rem', color: COLORS.lightBlue, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 },
  previewSubjectValue: { fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.black, fontWeight: '600' },
  previewNote: { fontFamily: FONTS.body, fontSize: '0.75rem', color: '#aaa', fontStyle: 'italic', textAlign: 'center' },
  previewFrame: { border: `1px solid #e0ebf5`, borderRadius: '8px', padding: '1rem', background: '#fff', overflow: 'auto' },

  footer:  { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', paddingTop: '0.5rem', borderTop: `1px solid #e0ebf5` },
  saveMsg: { fontFamily: FONTS.body, fontSize: '0.85rem', fontWeight: '600' },
  saveBtn: {
    padding: '0.55rem 1.75rem', background: COLORS.blue, color: COLORS.white,
    border: 'none', borderRadius: '8px', fontFamily: FONTS.body,
    fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
  },

  msg: { fontFamily: FONTS.body, color: COLORS.lightBlue, padding: '2rem', textAlign: 'center' },
};
