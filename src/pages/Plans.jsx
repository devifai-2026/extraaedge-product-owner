import { useEffect, useState } from 'react';
import { plansApi } from '../lib/endpoints';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try { const res = await plansApi.list(); setPlans(res?.data || []); }
      catch (err) { setError(err.message || 'Failed to load plans'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Plans</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {loading && <div>Loading…</div>}
        {error && <div style={{ color: '#dc2626' }}>{error}</div>}
        {!loading && !error && plans.length === 0 && <div style={{ color: '#6b7280' }}>No plans defined yet.</div>}
        {plans.map((p) => (
          <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{p.code}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 16 }}>
              ₹{p.price_monthly ?? 0}<span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280' }}> / month</span>
            </div>
            <ul style={{ paddingLeft: 18, color: '#374151', fontSize: 14, marginTop: 12 }}>
              {(p.features || []).map((f) => (<li key={f}>{f}</li>))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
