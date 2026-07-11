import { useEffect, useState, useCallback } from 'react';
import { requestLogApi } from '../lib/endpoints';
import MetricsDashboard from '../components/MetricsDashboard';

// Local date (YYYY-MM-DD) → ISO start/end of that day.
const dayStartISO = (d) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined);
const dayEndISO = (d) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined);
const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const statusColor = (s) => {
  if (s == null) return '#6b7280';
  if (s >= 500) return '#b91c1c';
  if (s >= 400) return '#d97706';
  if (s >= 300) return '#7c3aed';
  return '#16a34a';
};
const methodColor = (m) => ({ GET: '#2563eb', POST: '#16a34a', PUT: '#d97706', PATCH: '#7c3aed', DELETE: '#dc2626' }[m] || '#6b7280');

const isEmptyObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0;

const JsonBlock = ({ label, value, text }) => {
  const empty = (value == null || isEmptyObj(value)) && !text;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      {empty ? (
        <div style={{ padding: 10, background: '#f3f4f6', color: '#9ca3af', borderRadius: 6, fontSize: 12, fontStyle: 'italic' }}>
          (empty — no body sent)
        </div>
      ) : (
        <pre style={{
          margin: 0, padding: 10, background: '#0f172a', color: '#e2e8f0', borderRadius: 6,
          fontSize: 12, overflow: 'auto', maxHeight: 320, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {text || JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
};

function Row({ entry }) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !full) {
      setLoadingFull(true);
      try { const res = await requestLogApi.get(entry.id); setFull(res?.data || null); }
      catch { setFull({ _error: 'Failed to load full payload' }); }
      finally { setLoadingFull(false); }
    }
  };

  return (
    <>
      <tr onClick={toggle} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: entry.is_error ? '#fef2f2' : '#fff' }}>
        <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{new Date(entry.created_at).toLocaleString()}</td>
        <td style={{ padding: '8px 12px' }}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: methodColor(entry.method) }}>{entry.method}</span></td>
        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.path}>{entry.path}</td>
        <td style={{ padding: '8px 12px' }}><span style={{ fontWeight: 700, fontSize: 12, color: statusColor(entry.status_code) }}>{entry.status_code ?? '—'}</span></td>
        <td style={{ padding: '8px 12px', fontSize: 12 }}>{entry.actor_email || '—'}</td>
        <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{entry.tenant_slug || '—'}</td>
        <td style={{ padding: '8px 12px', fontSize: 12 }}>{entry.category ? <span style={{ background: '#eef2ff', color: '#4338ca', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{entry.category}</span> : '—'}</td>
        <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{entry.duration_ms != null ? `${entry.duration_ms}ms` : '—'}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
            {loadingFull && <div style={{ color: '#6b7280' }}>Loading full payload…</div>}
            {full?._error && <div style={{ color: '#dc2626' }}>{full._error}</div>}
            {full && !full._error && (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#374151' }}>
                  <span><b>Request ID:</b> <code>{full.request_id || '—'}</code></span>
                  <span><b>Actor:</b> {full.actor_email || '—'} ({full.actor_role || '—'})</span>
                  <span><b>Platform actor:</b> {full.is_platform_actor ? 'yes' : 'no'}</span>
                  <span><b>Tenant:</b> {full.tenant_slug || '—'}</span>
                  <span><b>IP:</b> {full.ip || '—'}</span>
                  {full.body_truncated && <span style={{ color: '#d97706' }}><b>⚠ body truncated</b></span>}
                </div>
                {full.is_error && (
                  <div style={{ marginTop: 8, padding: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#b91c1c' }}>
                    <b>Error {full.error_code || ''}:</b> {full.error_message || '(no message)'}
                  </div>
                )}
                <JsonBlock label="Query" value={full.query_json} />
                <JsonBlock label="Request body" value={full.request_body} text={full.request_body_text} />
                <JsonBlock label="Response body" value={full.response_body} text={full.response_body_text} />
                <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>User-Agent: {full.user_agent || '—'}</div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function DangerRequestLog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGraphs, setShowGraphs] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [facets, setFacets] = useState({ methods: [], categories: [], tenants: [] });
  const [filters, setFilters] = useState({
    date_from: todayStr(), date_to: todayStr(),
    tenant_slug: '', actor_email: '', method: '', category: '',
    status_class: '', errors_only: false, path: '',
  });
  const limit = 50;

  useEffect(() => { requestLogApi.facets().then((r) => setFacets(r?.data || {})).catch(() => {}); }, []);

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError('');
    try {
      const params = {
        page: p, limit,
        date_from: dayStartISO(filters.date_from),
        date_to: dayEndISO(filters.date_to),
        tenant_slug: filters.tenant_slug || undefined,
        actor_email: filters.actor_email || undefined,
        method: filters.method || undefined,
        category: filters.category || undefined,
        status_class: filters.status_class || undefined,
        errors_only: filters.errors_only ? 'true' : undefined,
        path: filters.path || undefined,
      };
      const res = await requestLogApi.list(params);
      setItems(res?.data || []);
      setTotal(res?.meta?.total ?? 0);
      setPage(p);
    } catch (err) { setError(err.message || 'Failed to load request log'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, []);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const inputStyle = { padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 };

  return (
    <div>
      <h1 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🚨 Danger Request Log</span>
      </h1>
      <p style={{ marginTop: -8, color: '#6b7280', fontSize: 13 }}>
        Full cross-tenant API activity — every request with its account, payload, response & status. Use this to trace client-escalated bugs (e.g. failed bulk uploads).
      </p>

      {/* Live activity graphs (product-wide, all tenants) */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setShowGraphs((v) => !v)}
          style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#334155', marginBottom: showGraphs ? 12 : 0 }}>
          {showGraphs ? '▾ Hide activity graphs' : '▸ Show activity graphs'}
        </button>
        {showGraphs && <MetricsDashboard compact />}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: '#6b7280', gap: 3 }}>From
          <input type="date" value={filters.date_from} onChange={set('date_from')} style={inputStyle} /></label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: '#6b7280', gap: 3 }}>To
          <input type="date" value={filters.date_to} onChange={set('date_to')} style={inputStyle} /></label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: '#6b7280', gap: 3 }}>Tenant
          <select value={filters.tenant_slug} onChange={set('tenant_slug')} style={inputStyle}>
            <option value="">All</option>
            {facets.tenants?.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: '#6b7280', gap: 3 }}>Account email
          <input value={filters.actor_email} onChange={set('actor_email')} placeholder="user@…" style={inputStyle} /></label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: '#6b7280', gap: 3 }}>Method
          <select value={filters.method} onChange={set('method')} style={inputStyle}>
            <option value="">Any</option>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select></label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: '#6b7280', gap: 3 }}>Category
          <select value={filters.category} onChange={set('category')} style={inputStyle}>
            <option value="">Any</option>
            {facets.categories?.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: '#6b7280', gap: 3 }}>Status
          <select value={filters.status_class} onChange={set('status_class')} style={inputStyle}>
            <option value="">Any</option>
            <option value="2">2xx</option><option value="3">3xx</option>
            <option value="4">4xx</option><option value="5">5xx</option>
          </select></label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: '#6b7280', gap: 3 }}>Path contains
          <input value={filters.path} onChange={set('path')} placeholder="/bulk/leads" style={inputStyle} /></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
          <input type="checkbox" checked={filters.errors_only} onChange={set('errors_only')} /> Errors only
        </label>
        <button onClick={() => load(1)} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Apply</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'auto' }}>
        {loading && <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}
        {error && <div style={{ padding: 16, color: '#dc2626' }}>{error}</div>}
        {!loading && !error && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>{['When', 'Method', 'Path', 'Status', 'Account', 'Tenant', 'Category', 'Took'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No requests match these filters</td></tr>}
              {items.map((e) => <Row key={e.id} entry={e} />)}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !error && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13, color: '#6b7280' }}>
          <span>{total} requests · page {page}/{totalPages}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button disabled={page <= 1} onClick={() => load(page - 1)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: page <= 1 ? '#f3f4f6' : '#fff', cursor: page <= 1 ? 'default' : 'pointer' }}>Prev</button>
            <button disabled={page >= totalPages} onClick={() => load(page + 1)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: page >= totalPages ? '#f3f4f6' : '#fff', cursor: page >= totalPages ? 'default' : 'pointer' }}>Next</button>
          </span>
        </div>
      )}
    </div>
  );
}
