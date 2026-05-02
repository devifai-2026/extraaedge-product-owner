import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, authApi } from '../lib/endpoints';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('owner@extraaedge.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      const payload = res?.data ?? res;
      auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        user: payload.platform_user || payload.user,
      });
      navigate('/tenants');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f172a' }}>
      <form onSubmit={submit} style={{ background: '#fff', padding: 32, borderRadius: 12, width: 380, boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>ExtraEdge<span style={{ color: '#2563eb' }}> · PO</span></div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>Product Owner Portal</div>

        <label style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          style={{ width: '100%', padding: 10, marginTop: 4, marginBottom: 16, border: '1px solid #ddd', borderRadius: 6 }} />

        <label style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          style={{ width: '100%', padding: 10, marginTop: 4, marginBottom: 16, border: '1px solid #ddd', borderRadius: 6 }} />

        {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ marginBottom: 16, padding: 10, background: '#fffbe6', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#78350f' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Dev credentials (preview only):</div>
          <div>owner@extraaedge.local / ChangeMe123!</div>
        </div>
        <button type="submit" disabled={submitting} style={{ width: '100%', padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
