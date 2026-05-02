import { useState } from 'react';
import { auth, authApi } from '../lib/endpoints';
import { api } from '../lib/api';

export default function Profile() {
  const user = auth.getUser();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr(''); setSubmitting(true);
    try {
      await api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword });
      setMsg('Password updated. You may be asked to log in again.');
      setOldPassword(''); setNewPassword('');
    } catch (e) {
      setErr(e.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ marginTop: 0 }}>My profile</h1>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <Row label="Name" value={user?.name} />
        <Row label="Email" value={user?.email} />
        <Row label="Role" value={user?.role} />
        <Row label="ID" value={user?.id} mono />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Change password</h3>
        <form onSubmit={submit}>
          <input type="password" placeholder="Current password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required
            style={{ width: '100%', padding: 10, marginBottom: 8, border: '1px solid #d1d5db', borderRadius: 6 }} />
          <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
            style={{ width: '100%', padding: 10, marginBottom: 8, border: '1px solid #d1d5db', borderRadius: 6 }} />
          {msg && <div style={{ color: '#16a34a', fontSize: 13, marginBottom: 8 }}>{msg}</div>}
          {err && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{err}</div>}
          <button type="submit" disabled={submitting} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 6, cursor: 'pointer' }}>
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ color: '#6b7280', fontSize: 13 }}>{label}</div>
      <div style={{ fontFamily: mono ? 'monospace' : undefined }}>{value || '—'}</div>
    </div>
  );
}
