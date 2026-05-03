import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tenantsApi } from '../lib/endpoints';

export default function TenantDetails() {
  const { id } = useParams();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('details');

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

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
        <TabButton active={tab === 'details'} onClick={() => setTab('details')}>Details</TabButton>
        <TabButton active={tab === 'org'} onClick={() => setTab('org')}>Org Tree</TabButton>
      </div>

      {tab === 'details' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
          <Row label="Status" value={tenant.status} />
          <Row label="Company name" value={tenant.company_name || '—'} />
          <Row label="Brand name" value={tenant.brand_name || '—'} />
          <Row label="Database" value={tenant.db_name} mono />
          <Row label="Database user" value={tenant.db_user} mono />
          <Row label="Created" value={tenant.created_at ? new Date(tenant.created_at).toLocaleString() : '—'} />
          <Row label="Updated" value={tenant.updated_at ? new Date(tenant.updated_at).toLocaleString() : '—'} />
        </div>
      )}

      {tab === 'org' && <OrgTreeTab tenantId={id} />}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
        color: active ? '#2563eb' : '#6b7280',
        fontWeight: active ? 600 : 500,
        fontSize: 14,
        cursor: 'pointer',
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}

// Org-tree tab: lazy-loads the tenant's user hierarchy on first open.
// Renders Name + role badge only — no email, phone, or other internal data,
// per the product-owner spec.
function OrgTreeTab({ tenantId }) {
  const [nodes, setNodes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    tenantsApi.orgTree(tenantId)
      .then((r) => { if (alive) setNodes(r?.data || []); })
      .catch((e) => { if (alive) setError(e.message || 'Failed to load org tree'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tenantId]);

  if (loading) return <div style={{ color: '#6b7280', padding: 12 }}>Loading…</div>;
  if (error) return <div style={{ color: '#dc2626', padding: 12 }}>{error}</div>;
  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 32, textAlign: 'center', color: '#6b7280' }}>
        No active users in this tenant.
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      {nodes.map((n) => <OrgNode key={n.id} node={n} depth={0} />)}
    </div>
  );
}

// Recursive tree node. Uses a simple expand/collapse with a chevron and
// indentation. Default state is "expanded" so the product owner can see
// the whole hierarchy at a glance; collapse is just for cleanup.
function OrgNode({ node, depth }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          paddingLeft: 8 + depth * 24,
          borderRadius: 4,
          cursor: hasChildren ? 'pointer' : 'default',
        }}
        onClick={() => hasChildren && setOpen((v) => !v)}
      >
        <span style={{
          display: 'inline-block',
          width: 18,
          color: '#9ca3af',
          fontSize: 11,
          textAlign: 'center',
        }}>
          {hasChildren ? (open ? '▾' : '▸') : ''}
        </span>
        <span style={{ fontWeight: 500, color: '#111', marginRight: 10 }}>
          {node.name || '—'}
        </span>
        <RoleBadge role={node.role} />
      </div>
      {hasChildren && open && node.children.map((c) => (
        <OrgNode key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

const ROLE_STYLE = {
  super_admin:   { label: 'Super admin',   bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  sales_manager: { label: 'Sales manager', bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  counsellor:    { label: 'Counsellor',    bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
};

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || { label: role || 'Unknown', bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 8px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
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
