import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tenantsApi } from '../lib/endpoints';

const statusColor = (s) => ({
  active: '#16a34a', provisioning: '#f59e0b', suspended: '#ef4444', cancelled: '#6b7280',
}[s] || '#6b7280');

export default function Tenants() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await tenantsApi.list({ page, limit, q: q || undefined });
      setItems(res?.data || []);
      setMeta(res?.meta || { total: 0 });
    } catch (err) { setError(err.message || 'Failed to load tenants'); }
    finally { setLoading(false); }
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / limit));

  const suspend = async (id) => { try { await tenantsApi.suspend(id); load(); } catch (e) { alert(e.message); } };
  const resume = async (id) => { try { await tenantsApi.resume(id); load(); } catch (e) { alert(e.message); } };
  // Soft-delete with explicit confirm. We type-check the slug so a misclick
  // doesn't accidentally delete the wrong tenant — the backend keeps the DB
  // anyway, but the UX should still feel deliberate.
  const remove = async (t) => {
    const slug = window.prompt(
      `This will deactivate "${t.name}" and hide it from the platform.\n\n` +
      `The underlying database is preserved. Type the slug "${t.slug}" to confirm:`,
    );
    if (slug == null) return;
    if (slug.trim() !== t.slug) { alert('Slug did not match — delete cancelled.'); return; }
    try { await tenantsApi.delete(t.id); load(); }
    catch (e) { alert(e.message || 'Delete failed'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Tenants <span style={{ color: '#888', fontWeight: 400, fontSize: 14 }}>({meta.total ?? 0})</span></h1>
        <button onClick={() => navigate('/tenants/new')} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Create tenant</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Search by name or slug" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }}
          style={{ flex: 1, padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'auto' }}>
        {loading && <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}
        {error && <div style={{ padding: 16, color: '#dc2626' }}>{error}</div>}
        {!loading && !error && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                {['Name', 'Slug', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (<tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No tenants yet — click + to create one</td></tr>)}
              {items.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <Link to={`/tenants/${t.id}`} style={{ color: '#2563eb', fontWeight: 500 }}>{t.name}</Link>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontFamily: 'monospace' }}>{t.slug}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: `${statusColor(t.status)}20`, color: statusColor(t.status) }}>{t.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    {t.status === 'active' && <button onClick={() => suspend(t.id)} style={{ background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 13, marginRight: 12 }}>Suspend</button>}
                    {t.status === 'suspended' && <button onClick={() => resume(t.id)} style={{ background: 'transparent', color: '#16a34a', border: 'none', cursor: 'pointer', fontSize: 13, marginRight: 12 }}>Resume</button>}
                    {t.status !== 'cancelled' && (
                      <button
                        onClick={() => remove(t)}
                        title="Soft-delete this tenant (DB is preserved)"
                        style={{ background: 'transparent', color: '#991b1b', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: 16 }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: '6px 12px' }}>‹</button>
          <span style={{ padding: '6px 12px' }}>Page {page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: '6px 12px' }}>›</button>
        </div>
      )}
    </div>
  );
}
