import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { tenantsApi } from '../lib/endpoints';

export default function CreateTenant() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', slug: '', company_name: '', brand_name: '',
    first_admin: { name: '', email: '', phone: '', password: '' },
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const setField = (k, v) => setForm({ ...form, [k]: v });
  const setAdmin = (k, v) => setForm({ ...form, first_admin: { ...form.first_admin, [k]: v } });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    // Pre-flight checks that mirror the backend zod schema so the user gets
    // immediate feedback instead of a round-trip 400.
    if ((form.first_admin.password || '').length < 10) {
      setError('Initial password must be at least 10 characters.');
      setSubmitting(false);
      return;
    }
    if (!/^[a-z0-9-]{2,40}$/.test(form.slug)) {
      setError('Slug must be 2–40 lowercase letters, digits or hyphens (no spaces or special chars).');
      setSubmitting(false);
      return;
    }
    try {
      // Strip empty-string optionals so the backend zod validator (which has
      // `.email()` / `.url()` constraints) doesn't reject them. Otherwise an
      // empty optional `email: ''` fails the email format check.
      const stripped = (obj) => Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== '' && v != null)
      );
      const payload = {
        ...stripped(form),
        company_name: form.company_name || form.name,
        brand_name: form.brand_name || form.name,
        first_admin: stripped(form.first_admin),
      };
      const res = await tenantsApi.create(payload);
      const id = res?.data?.id;
      navigate(id ? `/tenants/${id}` : '/tenants');
    } catch (err) {
      // Surface zod validation details when available so the user can fix the form.
      // Backend returns: { error: { code, message, details: [{ path: 'a.b', message }] } }
      const details = err?.data?.error?.details;
      const detailText = Array.isArray(details) && details.length > 0
        ? details.map((d) => {
            const path = Array.isArray(d.path) ? d.path.join('.') : (d.path || 'field');
            return `${path}: ${d.message}`;
          }).join('\n')
        : null;
      setError(detailText || err?.data?.error?.message || err.message || 'Failed to create tenant');
      // eslint-disable-next-line no-console
      console.error('Tenant create failed:', err?.status, err?.data || err?.message);
    } finally {
      setSubmitting(false);
    }
  };

  const slugFromName = (n) => n.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-').slice(0, 40);

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 8 }}><Link to="/tenants" style={{ color: '#2563eb', fontSize: 13 }}>← Back to tenants</Link></div>
      <h1 style={{ marginTop: 0 }}>Create tenant</h1>
      <form onSubmit={submit} style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <h3 style={{ marginTop: 0, fontSize: 14, color: '#6b7280' }}>Tenant info</h3>
        <Field label="Institute name" value={form.name} onChange={(v) => { const slug = !form.slug ? slugFromName(v) : form.slug; setForm({ ...form, name: v, slug }); }} required />
        <Field label="Slug (lowercase, used in URLs)" value={form.slug} onChange={(v) => setField('slug', v.toLowerCase())} required hint="e.g. acme-institute" />
        <Field label="Company name (optional)" value={form.company_name} onChange={(v) => setField('company_name', v)} />
        <Field label="Brand name (optional)" value={form.brand_name} onChange={(v) => setField('brand_name', v)} />

        <h3 style={{ marginTop: 24, fontSize: 14, color: '#6b7280' }}>Institute Owner (Super Admin)</h3>
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: 12, fontSize: 13, color: '#78350f', marginBottom: 12 }}>
          The Super Admin is the institute owner — they have full platform configuration and oversight.
          They can later create Sales Managers and Counsellors from the tenant CRM.
        </div>
        <Field label="Owner full name" value={form.first_admin.name} onChange={(v) => setAdmin('name', v)} required />
        <Field label="Owner email" type="email" value={form.first_admin.email} onChange={(v) => setAdmin('email', v)} required />
        <Field label="Owner phone (optional)" value={form.first_admin.phone} onChange={(v) => setAdmin('phone', v)} />
        <Field label="Initial password" type="password" value={form.first_admin.password} onChange={(v) => setAdmin('password', v)} required hint="Owner will be asked to change this on first login" />

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 16,
              padding: '12px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderLeft: '4px solid #dc2626',
              color: '#991b1b',
              fontSize: 13,
              borderRadius: 6,
              whiteSpace: 'pre-line', // honours \n in joined details
              fontFamily: 'inherit',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Could not create tenant</div>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button type="submit" disabled={submitting} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Provisioning…' : 'Create tenant'}
          </button>
          <button type="button" onClick={() => navigate('/tenants')} style={{ background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>This creates a new database, runs migrations, and seeds defaults. Takes ~5-10 seconds.</div>
      </form>
    </div>
  );
}

function Field({ label, hint, type = 'text', value, onChange, required }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{label}{required && <span style={{ color: '#dc2626' }}> *</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        style={{ width: '100%', padding: 10, marginTop: 4, border: '1px solid #d1d5db', borderRadius: 6 }} />
      {hint && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
