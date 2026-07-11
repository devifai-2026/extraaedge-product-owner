// Real-time, cross-tenant API activity dashboard (Recharts). Product-wide —
// every tenant's requests aggregated. Fed by GET /platform/request-log/metrics.
// Auto-refreshes on an interval; window is user-selectable. Used on both the
// Analytics page and the Danger Request Log page.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { requestLogApi } from '../lib/endpoints';

const WINDOWS = [
  { key: '1h', label: '1h' },
  { key: '6h', label: '6h' },
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
];
const REFRESH_MS = 15000;

const fmtTs = (ts, win) => {
  const d = new Date(ts);
  if (win === '7d' || win === '24h') return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit' });
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const COLORS = { requests: '#2563eb', errors: '#dc2626', p95: '#7c3aed', p99: '#c026d3', avg: '#0891b2', s2xx: '#16a34a', s3xx: '#64748b', s4xx: '#d97706', s5xx: '#dc2626' };

export default function MetricsDashboard({ compact = false }) {
  const [win, setWin] = useState('6h');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async (w) => {
    try {
      const r = await requestLogApi.metrics(w);
      setData(r?.data ?? r);
      setErr('');
      setLastUpdated(new Date());
    } catch (e) { setErr(e.message || 'Failed to load metrics'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(win);
    timer.current = setInterval(() => load(win), REFRESH_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [win, load]);

  const s = data?.summary || {};
  const series = (data?.series || []).map((r) => ({ ...r, label: fmtTs(r.ts, win) }));
  const statusSeries = (data?.statusSeries || []).map((r) => ({ ...r, label: fmtTs(r.ts, win) }));
  const top = data?.topEndpoints || [];

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {WINDOWS.map((w) => (
            <button key={w.key} onClick={() => setWin(w.key)}
              style={{ border: '1px solid #cbd5e1', background: win === w.key ? '#0f172a' : '#fff', color: win === w.key ? '#fff' : '#334155', borderRadius: 8, padding: '5px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              {w.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {err ? <span style={{ color: '#dc2626' }}>{err}</span>
            : lastUpdated ? `Live · updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · refreshes ${REFRESH_MS / 1000}s`
              : 'Loading…'}
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
        <Tile label="Requests" value={num(s.requests)} />
        <Tile label="Error rate" value={s.error_rate != null ? `${s.error_rate}%` : '—'} tone={s.error_rate > 5 ? 'bad' : s.error_rate > 2 ? 'warn' : 'good'} />
        <Tile label="p50" value={ms(s.p50_ms)} />
        <Tile label="p95" value={ms(s.p95_ms)} tone={s.p95_ms > 1500 ? 'warn' : 'good'} />
        <Tile label="p99" value={ms(s.p99_ms)} />
        <Tile label="5xx errors" value={num(s.errors)} tone={s.errors > 0 ? 'warn' : 'good'} />
        <Tile label="Active tenants" value={num(s.active_tenants)} />
      </div>

      {loading && !data ? <div style={{ color: '#94a3b8', padding: 20 }}>Loading metrics…</div> : (
        <>
          {/* Latency + throughput row */}
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Panel title="API latency (p95 / p99, ms)">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 11 }} width={44} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="p95_ms" name="p95" stroke={COLORS.p95} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="p99_ms" name="p99" stroke={COLORS.p99} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="avg_ms" name="avg" stroke={COLORS.avg} dot={false} strokeWidth={1} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Throughput & errors (per bucket)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="requests" name="requests" fill={COLORS.requests} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="errors" name="errors" fill={COLORS.errors} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Status classes */}
          <Panel title="Status classes over time" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={statusSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip />
                <Legend />
                <Area type="monotone" stackId="1" dataKey="s2xx" name="2xx" stroke={COLORS.s2xx} fill={COLORS.s2xx} fillOpacity={0.7} />
                <Area type="monotone" stackId="1" dataKey="s3xx" name="3xx" stroke={COLORS.s3xx} fill={COLORS.s3xx} fillOpacity={0.6} />
                <Area type="monotone" stackId="1" dataKey="s4xx" name="4xx" stroke={COLORS.s4xx} fill={COLORS.s4xx} fillOpacity={0.7} />
                <Area type="monotone" stackId="1" dataKey="s5xx" name="5xx" stroke={COLORS.s5xx} fill={COLORS.s5xx} fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          {/* Top endpoints */}
          <Panel title="Busiest endpoints (by requests)">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={th}>Method</th><th style={th}>Endpoint</th>
                    <th style={{ ...th, textAlign: 'right' }}>Requests</th>
                    <th style={{ ...th, textAlign: 'right' }}>Errors</th>
                    <th style={{ ...th, textAlign: 'right' }}>p95 ms</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={td}><code style={{ fontSize: 12, color: '#475569' }}>{r.method}</code></td>
                      <td style={td}>{r.endpoint}</td>
                      <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(r.requests)}</td>
                      <td style={{ ...td, textAlign: 'right', color: r.errors > 0 ? '#dc2626' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{num(r.errors)}</td>
                      <td style={{ ...td, textAlign: 'right', color: r.p95_ms > 1500 ? '#d97706' : '#334155', fontVariantNumeric: 'tabular-nums' }}>{num(r.p95_ms)}</td>
                    </tr>
                  ))}
                  {top.length === 0 && <tr><td colSpan={5} style={{ ...td, color: '#94a3b8' }}>No requests in this window.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

const num = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN'));
const ms = (v) => (v == null ? '—' : `${Number(v).toLocaleString('en-IN')} ms`);
const th = { padding: '8px 10px', fontWeight: 600, fontSize: 12 };
const td = { padding: '7px 10px', color: '#0f172a' };

function Tile({ label, value, tone }) {
  const color = tone === 'bad' ? '#dc2626' : tone === 'warn' ? '#d97706' : tone === 'good' ? '#16a34a' : '#0f172a';
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -0.4, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, ...style }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
