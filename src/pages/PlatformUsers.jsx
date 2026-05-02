import { useEffect, useState } from 'react';
import { platformUsersApi } from '../lib/endpoints';

export default function PlatformUsers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'support_admin' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { const res = await platformUsersApi.list(); setItems(res?.data || []); }
    catch (err) { setError(err.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await platformUsersApi.create(form); setShowForm(false); setForm({ name: '', email: '', password: '', role: 'support_admin' }); load(); }
    catch (err) { alert(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Platform users</h1>
        <button onClick={() => setShowForm((v) => !v)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Invite user</button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Field label="Initial password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
            <div>
              <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ width: '100%', padding: 10, marginTop: 4, border: '1px solid #d1d5db', borderRadius: 6 }}>
                <option value="support_admin">Support admin</option>
                <option value="product_owner">Product owner</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={submitting} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>{submitting ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'auto' }}>
        {loading && <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}
        {error && <div style={{ padding: 16, color: '#dc2626' }}>{error}</div>}
        {!loading && !error && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                {['Name', 'Email', 'Role', 'Active', 'Created'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No platform users</td></tr>}
              {items.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px' }}>{u.name}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7280' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px' }}><span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{u.role}</span></td>
                  <td style={{ padding: '10px 16px' }}>{u.is_active ? '✅' : '⛔'}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{label}{required && <span style={{ color: '#dc2626' }}> *</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        style={{ width: '100%', padding: 10, marginTop: 4, border: '1px solid #d1d5db', borderRadius: 6 }} />
    </div>
  );
}
