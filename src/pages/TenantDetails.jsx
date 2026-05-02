import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tenantsApi } from '../lib/endpoints';

export default function TenantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { const res = await tenantsApi.get(id); setTenant(res?.data || null); }
    catch (err) { setError(err.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const suspend = async () => { if (!confirm(`Suspend ${tenant?.name}?`)) return; try { await tenantsApi.suspend(id); load(); } catch (e) { alert(e.message); } };
  const resume = async () => { try { await tenantsApi.resume(id); load(); } catch (e) { alert(e.message); } };

  if (loading) return <div>Loading…</div>;
  if (error) return <div style={{ color: '#dc2626' }}>{error}</div>;
  if (!tenant) return <div>Tenant not found</div>;

  return (
    <div>
      <div style={{ marginBottom: 8 }}><Link to="/tenants" style={{ color: '#2563eb', fontSize: 13 }}>← Back to tenants</Link></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>{tenant.name}</h1>
          <div style={{ color: '#6b7280', marginTop: 4 }}>{tenant.slug}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tenant.status === 'active' && <button onClick={suspend} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>Suspend</button>}
          {tenant.status === 'suspended' && <button onClick={resume} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>Resume</button>}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
        <Row label="Status" value={tenant.status} />
        <Row label="Company name" value={tenant.company_name || '—'} />
        <Row label="Brand name" value={tenant.brand_name || '—'} />
        <Row label="Database" value={tenant.db_name} mono />
        <Row label="Database user" value={tenant.db_user} mono />
        <Row label="Created" value={tenant.created_at ? new Date(tenant.created_at).toLocaleString() : '—'} />
        <Row label="Updated" value={tenant.updated_at ? new Date(tenant.updated_at).toLocaleString() : '—'} />
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ color: '#6b7280', fontSize: 13 }}>{label}</div>
      <div style={{ fontFamily: mono ? 'monospace' : undefined }}>{value}</div>
    </div>
  );
}
