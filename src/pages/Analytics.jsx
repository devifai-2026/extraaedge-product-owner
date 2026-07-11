// Analytics — embeds the ExtraaEdge Grafana observability dashboards (API
// latency/status/throughput + platform analytics). Grafana runs as a separate
// Render service reading the system DB's metrics_* views; here we iframe it in
// kiosk mode. Reload-safe: no dependency on iframe internals, and a graceful
// fallback if the Grafana URL isn't configured yet.
import { useState } from 'react';
import { GRAFANA_URL } from '../lib/config';

const DASHBOARDS = [
  { key: 'api-observability', label: 'API & Platform', uid: 'api-observability', slug: 'api-observability' },
];

export default function Analytics() {
  const [active, setActive] = useState(DASHBOARDS[0]);
  const [loaded, setLoaded] = useState(false);

  if (!GRAFANA_URL) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ margin: '0 0 8px' }}>Analytics</h2>
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: 10, padding: 16, fontSize: 14, maxWidth: 640 }}>
          Grafana isn’t configured yet. Set <code>VITE_GRAFANA_URL</code> to the deployed
          Grafana service (see <code>grafana/README.md</code>) and redeploy.
        </div>
      </div>
    );
  }

  // Kiosk mode hides Grafana's own chrome so it reads as an embedded panel.
  const src = `${GRAFANA_URL}/d/${active.uid}/${active.slug}?kiosk&theme=light`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 32px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 12px', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Analytics</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {DASHBOARDS.length > 1 && DASHBOARDS.map((d) => (
            <button key={d.key} onClick={() => { setActive(d); setLoaded(false); }}
              style={{ border: '1px solid #cbd5e1', background: active.key === d.key ? '#0f172a' : '#fff', color: active.key === d.key ? '#fff' : '#334155', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
              {d.label}
            </button>
          ))}
          <a href={src.replace('?kiosk&', '?')} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Open in Grafana ↗</a>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#f8fafc' }}>
        {!loaded && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>Loading dashboards…</div>}
        <iframe
          key={active.key}
          title="ExtraaEdge Analytics"
          src={src}
          onLoad={() => setLoaded(true)}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
    </div>
  );
}
