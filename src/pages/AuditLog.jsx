import { useEffect, useState } from 'react';
import { auditLogApi } from '../lib/endpoints';

export default function AuditLog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try { const res = await auditLogApi.list({ limit: 100 }); setItems(res?.data || []); }
      catch (err) { setError(err.message || 'Failed to load audit log'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Audit log</h1>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'auto' }}>
        {loading && <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}
        {error && <div style={{ padding: 16, color: '#dc2626' }}>{error}</div>}
        {!loading && !error && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                {['When', 'Actor', 'Action', 'Tenant', 'Entity'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No audit entries yet</td></tr>}
              {items.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280' }}>{e.created_at ? new Date(e.created_at).toLocaleString() : '—'}</td>
                  <td style={{ padding: '10px 16px' }}>{e.platform_user_email || e.platform_user_id || '—'}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>{e.action}</td>
                  <td style={{ padding: '10px 16px' }}>{e.tenant_slug || e.tenant_id || '—'}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>{e.entity_type}{e.entity_id ? ` · ${e.entity_id.slice(0, 8)}…` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
