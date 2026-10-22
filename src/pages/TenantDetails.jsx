import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tenantsApi, impersonationApi } from '../lib/endpoints';
import { handoffUrl } from './Tenants';

export default function TenantDetails() {
  const { id } = useParams();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('details');
  const [entering, setEntering] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { const res = await tenantsApi.get(id); setTenant(res?.data || null); }
    catch (err) { setError(err.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // Open this tenant's admin console as their super admin — see Tenants.jsx
  // for why the tab is opened before the await.
  const loginAsAdmin = async () => {
    setEntering(true);
    const tab = window.open('', '_blank');
    try {
      const res = await impersonationApi.tenantAdmin(id);
      const url = handoffUrl(res);
      if (!url) throw new Error('No login link returned');
      if (tab) tab.location = url; else window.location.href = url;
    } catch (e) {
      if (tab) tab.close();
      alert(e.message || 'Could not open that tenant');
    } finally { setEntering(false); }
  };

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
          {tenant.status === 'active' && (
            <button
              onClick={loginAsAdmin}
              disabled={entering}
              title="Open this tenant's admin console as their super admin"
              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
            >
              {entering ? 'Opening…' : 'Login as admin'}
            </button>
          )}
          {tenant.status === 'active' && <button onClick={suspend} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>Suspend</button>}
          {tenant.status === 'suspended' && <button onClick={resume} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>Resume</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
        <TabButton active={tab === 'details'} onClick={() => setTab('details')}>Details</TabButton>
        <TabButton active={tab === 'org'} onClick={() => setTab('org')}>Org Tree</TabButton>
        <TabButton active={tab === 'access'} onClick={() => setTab('access')}>Login &amp; Access</TabButton>
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
      {tab === 'access' && <AccessTab tenantId={id} tenant={tenant} onChanged={load} />}
    </div>
  );
}

// Login mode + the tenant admin's password.
//
// These two live together because they answer one question: "how does this
// customer get into their account?" Switching a tenant to password-only is
// useless if nobody can tell them what the password is, and minting a password
// is pointless if the login screen only offers an OTP box.
function AccessTab({ tenantId, tenant, onChanged }) {
  const [mode, setMode] = useState(tenant?.auth_mode || 'both');
  const [savingMode, setSavingMode] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [adminErr, setAdminErr] = useState('');
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  // The generated password, shown ONCE after a rotate. argon2 is one-way, so
  // there is no way back to this value — closing the panel loses it and the
  // only recovery is another rotate. The UI says so rather than implying the
  // password can be looked up later.
  const [issued, setIssued] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    tenantsApi.admin(tenantId)
      .then((r) => { if (alive) { setAdmin(r?.data || null); setAdminErr(''); } })
      .catch((e) => { if (alive) setAdminErr(e.message || 'Could not load the admin account'); });
    return () => { alive = false; };
  }, [tenantId]);

  const saveMode = async (next) => {
    setSavingMode(true);
    try {
      await tenantsApi.setAuthMode(tenantId, next);
      setMode(next);
      onChanged?.();
    } catch (e) { alert(e.message || 'Could not change the login mode'); }
    finally { setSavingMode(false); }
  };

  const rotate = async () => {
    const label = admin?.has_password ? 'Replace' : 'Set';
    if (!confirm(`${label} the password for ${admin?.email}?\n\nTheir current password stops working immediately.`)) return;
    setBusy(true);
    try {
      const r = await tenantsApi.setAdminPassword(tenantId, custom.trim() || undefined);
      const d = r?.data ?? r;
      setIssued(d);
      setCustom('');
      setCopied(false);
      setAdmin((a) => ({ ...(a || {}), has_password: true }));
    } catch (e) { alert(e.message || 'Could not set the password'); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    const text = `Login: ${window.location.origin.replace('//po.', '//app.')}/login\nInstitute code: ${issued.tenant_slug}\nEmail: ${issued.user.email}\nPassword: ${issued.password}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard blocked */ }
  };

  const MODES = [
    { key: 'password', title: 'Password only', hint: 'Users sign in with email + password. No OTP is offered or accepted.' },
    { key: 'otp', title: 'WhatsApp OTP only', hint: 'Users sign in with a one-time code. Password login is refused.' },
    { key: 'both', title: 'Both', hint: 'The login screen offers either.' },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15 }}>How this institute signs in</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
          Applies to every user in this tenant, and takes effect on their next sign-in.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {MODES.map((m) => (
            <label
              key={m.key}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
                border: `1px solid ${mode === m.key ? '#2563eb' : '#e5e7eb'}`,
                background: mode === m.key ? '#eff6ff' : '#fff',
                borderRadius: 6, cursor: savingMode ? 'wait' : 'pointer',
              }}
            >
              <input
                type="radio"
                name="auth_mode"
                checked={mode === m.key}
                disabled={savingMode}
                onChange={() => saveMode(m.key)}
                style={{ marginTop: 3 }}
              />
              <span>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 13.5 }}>{m.title}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: '#6b7280' }}>{m.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15 }}>Super admin password</h3>
        {adminErr && <div style={{ color: '#dc2626', fontSize: 13 }}>{adminErr}</div>}
        {!admin && !adminErr && <div style={{ fontSize: 13, color: '#6b7280' }}>Loading…</div>}
        {admin && (
          <>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              {admin.name} · {admin.email} —{' '}
              {admin.has_password ? 'has a password set' : 'no password set yet'}
              {admin.last_login_at
                ? ` · last signed in ${new Date(admin.last_login_at).toLocaleDateString()}`
                : ' · has never signed in'}
            </p>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Leave blank to generate one"
                style={{ flex: '1 1 260px', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
              />
              <button
                onClick={rotate}
                disabled={busy || (custom.trim().length > 0 && custom.trim().length < 10)}
                style={{
                  background: '#2563eb', color: '#fff', border: 0, padding: '9px 16px',
                  borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontWeight: 600, fontSize: 13,
                }}
              >
                {busy ? 'Working…' : admin.has_password ? 'Rotate password' : 'Set password'}
              </button>
            </div>
            {custom.trim().length > 0 && custom.trim().length < 10 && (
              <div style={{ fontSize: 12, color: '#b45309', marginTop: 6 }}>
                A password you choose must be at least 10 characters.
              </div>
            )}

            {issued && (
              <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#166534', marginBottom: 8 }}>
                  Password {issued.generated ? 'generated' : 'set'} — copy it now
                </div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, lineHeight: 1.8 }}>
                  Institute code: <b>{issued.tenant_slug}</b><br />
                  Email: <b>{issued.user.email}</b><br />
                  Password: <b>{issued.password}</b>
                </div>
                <button
                  onClick={copy}
                  style={{
                    marginTop: 10, background: '#fff', border: '1px solid #bbf7d0',
                    color: '#166534', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  }}
                >
                  {copied ? 'Copied' : 'Copy login details'}
                </button>
                <div style={{ fontSize: 11.5, color: '#15803d', marginTop: 8 }}>
                  This is the only time it can be shown — it is stored one-way, so it cannot be
                  looked up later. If it is lost, rotate again.
                </div>
              </div>
            )}
          </>
        )}
      </div>
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
