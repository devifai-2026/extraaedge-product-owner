// PO Facebook console — pick any tenant, then view the raw inbound webhook
// payloads captured in webhook_events (Facebook Lead Ads bridge / LeadsBridge /
// generic inbound), plus a 30-day activity graph. Read-only. PRODUCT_OWNER only.
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { tenantsApi, platformFacebookApi } from '../lib/endpoints';

const inputStyle = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 };
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 };
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '');

function Events({ tenantId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(''); // '' | pending | processed | failed
  const [range, setRange] = useState('all'); // 24h | 7d | all
  const [expanded, setExpanded] = useState(null);
  const [stats, setStats] = useState(null);

  const sinceFor = (r) => {
    if (r === '24h') return new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    if (r === '7d') return new Date(Date.now() - 7 * 86400 * 1000).toISOString();
    return undefined;
  };
  const load = () => {
    setLoading(true);
    platformFacebookApi.webhookEvents(tenantId, { status: status || undefined, since: sinceFor(range), limit: 500 })
      .then((r) => setEvents(r?.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [tenantId, status, range]);
  useEffect(() => {
    platformFacebookApi.webhookEventStats(tenantId).then((r) => setStats(r?.data || null)).catch(() => setStats(null));
  }, [tenantId]);

  const pill = (text, bg, color) => (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>{text}</span>
  );
  const statusPill = (s) => {
    if (s === 'processed') return pill('processed', '#dcfce7', '#166534');
    if (s === 'failed') return pill('failed', '#fee2e2', '#991b1b');
    return pill(s || 'pending', '#fef9c3', '#854d0e');
  };
  const series = stats?.daily || [];
  const total = series.reduce((a, r) => a + (r.events || 0), 0);

  return (
    <div style={{ ...card, padding: 14 }}>
      {/* Activity graph */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <strong style={{ fontSize: 13 }}>Inbound webhook events · last 30 days</strong>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>🔵 Events · 🔴 Failed</span>
        </div>
        {total === 0 ? (
          <div style={{ color: '#9ca3af', padding: 24, textAlign: 'center', fontSize: 13 }}>No webhook events in the last 30 days.</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={series} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="events" name="Events" fill="#1877F2" radius={[3, 3, 0, 0]} />
              <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
          {[['', 'All'], ['processed', 'Processed'], ['pending', 'Pending'], ['failed', 'Failed']].map(([v, label]) => (
            <button key={v} onClick={() => setStatus(v)} style={{ padding: '6px 12px', border: 0, cursor: 'pointer', background: status === v ? '#0f172a' : '#fff', color: status === v ? '#fff' : '#374151', fontSize: 12 }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
          {[['24h', 'Last 24h'], ['7d', 'Last 7 days'], ['all', 'All']].map(([v, label]) => (
            <button key={v} onClick={() => setRange(v)} style={{ padding: '6px 12px', border: 0, cursor: 'pointer', background: range === v ? '#1877F2' : '#fff', color: range === v ? '#fff' : '#374151', fontSize: 12 }}>{label}</button>
          ))}
        </div>
        <button onClick={load} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>↻ Refresh</button>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{events.length} events</span>
      </div>

      {loading && <div style={{ color: '#9ca3af', padding: 20, textAlign: 'center' }}>Loading…</div>}
      {!loading && events.length === 0 && <div style={{ color: '#9ca3af', padding: 20, textAlign: 'center' }}>No webhook events.</div>}

      {!loading && events.map((e) => {
        const open = expanded === e.id;
        return (
          <div key={e.id} style={{ border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
            <div onClick={() => setExpanded(open ? null : e.id)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', cursor: 'pointer', background: open ? '#f8fafc' : '#fff' }}>
              {pill('▼ IN', '#dbeafe', '#1e40af')}
              <span style={{ fontWeight: 600, fontSize: 13 }}>{e.integration_name || e.integration_type || 'inbound'}</span>
              {e.event_type && <span style={{ fontSize: 12, color: '#6b7280' }}>{e.event_type}</span>}
              {statusPill(e.status)}
              {e.error && <span style={{ fontSize: 11, color: '#991b1b' }}>{e.error}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{fmt(e.received_at)}</span>
            </div>
            {open && (
              <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', background: '#0f172a' }}>
                <div style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>PAYLOAD</div>
                <pre style={{ margin: 0, color: '#e2e8f0', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 340, overflow: 'auto' }}>
                  {JSON.stringify(e.payload_json, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FacebookConsole() {
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState('');
  useEffect(() => { tenantsApi.list({ limit: 200 }).then((r) => setTenants(r?.data || [])).catch(() => {}); }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>📘 Inbound Webhooks (Facebook · JustDial)</h1>
      <p style={{ marginTop: -8, color: '#6b7280', fontSize: 13 }}>Raw inbound webhook payloads captured for any tenant — Facebook Lead Ads bridge, JustDial (Gmail) bridge, LeadsBridge, and generic inbound — with a 30-day activity graph. Each row shows its integration name.</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={inputStyle}>
          <option value="">Select tenant…</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
        </select>
      </div>
      {!tenantId && <div style={{ color: '#9ca3af', padding: 24, textAlign: 'center', ...card }}>Select a tenant to begin.</div>}
      {tenantId && <Events tenantId={tenantId} />}
    </div>
  );
}
