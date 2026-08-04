// Recorder App metrics — per tenant: which counsellors set up the Android
// recorder APK (mobile-OTP logins) and, per sign-up number, how many
// device_recordings rows each daily sync inserted.
import { useEffect, useState } from 'react';
import { recorderMetricsApi } from '../lib/endpoints';

const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 };
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' };
const kpi = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', minWidth: 160 };

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};
const fmtDay = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const fmtHour = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;

// A phone that hasn't checked in for a day is the signal something is wrong —
// the app heartbeats every 15 minutes, so a gap this size is never normal.
const STALE_MS = 24 * 60 * 60 * 1000;
const isStale = (lastSeen) => !lastSeen || (Date.now() - new Date(lastSeen).getTime()) > STALE_MS;

// Only the permissions that can actually be OFF. INTERNET, FOREGROUND_SERVICE
// and RECEIVE_BOOT_COMPLETED are install-time grants that are always held, so
// rendering them would be permanently-green noise burying the real ones.
const PERMISSIONS = [
  // First because it's the one that matters: without All-files access the
  // scanner finds nothing, and the app looks perfectly healthy while
  // uploading nothing at all.
  { key: 'all_files', label: 'All files' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'battery_unrestricted', label: 'Battery' },
];

const chip = (granted) => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  marginRight: 4,
  background: granted ? '#dcfce7' : '#f1f5f9',
  color: granted ? '#166534' : '#94a3b8',
  border: `1px solid ${granted ? '#bbf7d0' : '#e2e8f0'}`,
});

// Where a requested pull has got to. The device may be offline, so "asked for"
// and "done" are genuinely different states and collapsing them would make the
// button look broken during the normal wait.
const syncState = (d) => {
  if (!d.sync_requested_at) return null;
  if (d.sync_completed_at && new Date(d.sync_completed_at) >= new Date(d.sync_requested_at)) {
    const r = d.sync_result || {};
    return { tone: '#166534', bg: '#dcfce7', text: `Pulled ${r.uploaded ?? 0} of ${r.scanned ?? 0}` };
  }
  if (d.sync_started_at) return { tone: '#1e40af', bg: '#dbeafe', text: 'Phone is uploading…' };
  return { tone: '#92400e', bg: '#fef3c7', text: 'Waiting for the phone' };
};

export default function RecorderMetrics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDaily, setOpenDaily] = useState({}); // slug -> bool
  const [pulling, setPulling] = useState({});      // device id -> bool

  const requestPull = async (tenantId, device) => {
    setPulling((p) => ({ ...p, [device.id]: true }));
    try {
      await recorderMetricsApi.requestSync(tenantId, device.id);
      await load();
    } catch (e) {
      setError(e?.message || 'Could not reach that device');
    } finally {
      setPulling((p) => ({ ...p, [device.id]: false }));
    }
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const r = await recorderMetricsApi.get();
      setData(r?.data ?? null);
    } catch (e) {
      setError(e.message || 'Failed to load recorder metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = data?.totals;
  const tenants = (data?.tenants ?? []).filter(
    (t) => t.accounts.length || t.uploaders.length || t.recorder_folder_path || t.error,
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>📱 Recorder App</h1>
        <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ color: '#64748b' }}>Loading…</div>}

      {totals && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={kpi}><div style={{ fontSize: 12, color: '#64748b' }}>APK accounts set up</div><div style={{ fontSize: 26, fontWeight: 700 }}>{totals.app_accounts}</div></div>
          {/* Healthy = checked in today AND holding All-files access. The gap
              between this and the total is the list of phones to chase, which
              is the only number worth putting at the top. */}
          <div style={kpi}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Devices healthy</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: totals.devices && totals.devices_healthy < totals.devices ? '#b45309' : undefined }}>
              {totals.devices_healthy}<span style={{ fontSize: 15, color: '#94a3b8' }}> / {totals.devices}</span>
            </div>
          </div>
          <div style={kpi}><div style={{ fontSize: 12, color: '#64748b' }}>Recordings uploaded</div><div style={{ fontSize: 26, fontWeight: 700 }}>{totals.rows_inserted}</div></div>
          <div style={kpi}><div style={{ fontSize: 12, color: '#64748b' }}>Tenants configured</div><div style={{ fontSize: 26, fontWeight: 700 }}>{totals.tenants_configured}<span style={{ fontSize: 14, color: '#94a3b8' }}> / {totals.tenants}</span></div></div>
        </div>
      )}

      {!loading && tenants.length === 0 && (
        <div style={{ color: '#64748b' }}>No recorder-app activity on any tenant yet.</div>
      )}

      {tenants.map((t) => (
        <div key={t.slug} style={card}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>{t.name} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({t.slug})</span></h2>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
              {t.recorder_folder_path
                ? <>📁 {t.recorder_folder_path} · daily {fmtHour(t.recorder_sync_hour)}</>
                : 'Folder path not configured'}
            </span>
          </div>

          {t.error && <div style={{ color: '#dc2626', fontSize: 13 }}>Tenant DB error: {t.error}</div>}

          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, margin: '8px 0' }}>
              Devices ({(t.devices ?? []).length})
            </div>
            {(t.devices ?? []).length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                Nothing yet — phones appear here within 15 minutes of updating to app v1.2.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={th}>Phone</th>
                    <th style={th}>Used by</th>
                    <th style={th}>Android</th>
                    <th style={th}>App</th>
                    <th style={th}>Permissions</th>
                    <th style={th}>Last seen</th>
                    <th style={th}>Recordings pull</th>
                  </tr>
                </thead>
                <tbody>
                  {(t.devices ?? []).map((d) => {
                    const stale = isStale(d.last_seen_at);
                    const st = syncState(d);
                    return (
                      <tr key={d.id} style={stale ? { background: '#fffbeb' } : undefined}>
                        <td style={td}>
                          {[d.manufacturer, d.model].filter(Boolean).join(' ') || 'Unknown device'}
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{String(d.device_id).slice(0, 8)}…</div>
                        </td>
                        <td style={td}>
                          {d.user_name || '—'}
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{d.user_phone || ''}</div>
                        </td>
                        <td style={td}>{d.os_version || '—'}</td>
                        <td style={td}>{d.app_version || '—'}</td>
                        <td style={td}>
                          {PERMISSIONS.map((p) => (
                            <span key={p.key} style={chip(d.permissions?.[p.key] === true)}>{p.label}</span>
                          ))}
                        </td>
                        <td style={{ ...td, color: stale ? '#b45309' : undefined, fontWeight: stale ? 600 : undefined }}>
                          {fmtDate(d.last_seen_at)}
                          {stale && <div style={{ fontSize: 11 }}>not checking in</div>}
                        </td>
                        <td style={td}>
                          <button
                            type="button"
                            onClick={() => requestPull(t.tenant_id, d)}
                            disabled={pulling[d.id]}
                            style={{
                              padding: '4px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                              border: '1px solid #cbd5e1', background: '#fff',
                            }}
                          >
                            {pulling[d.id] ? 'Asking…' : 'Pull recordings'}
                          </button>
                          {st && (
                            <div style={{
                              marginTop: 4, display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                              fontSize: 11, fontWeight: 600, background: st.bg, color: st.tone,
                            }}>
                              {st.text}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
            {/* Only worth saying once there's something to say it about. With
                zero devices this was two lines of instructions for a table
                that isn't there. */}
            {(t.devices ?? []).length > 0 && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                Phones have no push channel, so a pull is collected on the device&apos;s next check-in — up to 15 minutes.
                A greyed-out permission is switched off on that handset and has to be re-granted there.
              </div>
            )}
          </div>

          {/* minWidth:0 lets the track actually shrink, and overflowX on each
              child keeps a too-wide table INSIDE its own column. Without the
              second part, th/td being `nowrap` means the table's min-content
              width blows straight past the track and paints over the column
              next to it — which is what made "Uploads by sign-up number" land
              on top of the accounts table. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, marginTop: 16, alignItems: 'start' }}>
            <div style={{ minWidth: 0, overflowX: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 600, margin: '8px 0' }}>
                APK accounts ({t.accounts.length})
              </div>
              {t.accounts.length === 0 ? (
                <div style={{ fontSize: 13, color: '#94a3b8' }}>No app logins yet.</div>
              ) : (
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead><tr><th style={th}>User</th><th style={th}>Phone</th><th style={th}>Role</th><th style={th}>Logins</th><th style={th}>First setup</th><th style={th}>Last login</th></tr></thead>
                  <tbody>
                    {t.accounts.map((a) => (
                      <tr key={a.user_id}>
                        <td style={td}>{a.name}</td>
                        <td style={td}>{a.phone}</td>
                        <td style={td}>{a.role}</td>
                        <td style={td}>{a.logins}</td>
                        <td style={td}>{fmtDate(a.first_login_at)}</td>
                        <td style={td}>{fmtDate(a.last_login_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ minWidth: 0, overflowX: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 600, margin: '8px 0' }}>
                Uploads by sign-up number ({t.uploaders.reduce((s, u) => s + u.rows_inserted, 0)} rows)
              </div>
              {t.uploaders.length === 0 ? (
                <div style={{ fontSize: 13, color: '#94a3b8' }}>No uploads yet.</div>
              ) : (
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead><tr><th style={th}>Number</th><th style={th}>Counsellor</th><th style={th}>Rows</th><th style={th}>Matched</th><th style={th}>Unmatched</th><th style={th}>Multi</th><th style={th}>Last upload</th></tr></thead>
                  <tbody>
                    {t.uploaders.map((u, i) => (
                      <tr key={i}>
                        <td style={td}>{u.uploader_phone}</td>
                        <td style={td}>{u.user_name || '—'}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{u.rows_inserted}</td>
                        <td style={td}>{u.matched}</td>
                        <td style={td}>{u.unmatched}</td>
                        <td style={td}>{u.multi}</td>
                        <td style={td}>{fmtDate(u.last_upload_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {t.daily.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => setOpenDaily((s) => ({ ...s, [t.slug]: !s[t.slug] }))}
                style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: 13 }}
              >
                {openDaily[t.slug] ? '▾ Hide' : '▸ Show'} daily sync log (last 14 days)
              </button>
              {openDaily[t.slug] && (
                <table style={{ borderCollapse: 'collapse', marginTop: 8 }}>
                  <thead><tr><th style={th}>Day</th><th style={th}>Number</th><th style={th}>Rows inserted</th></tr></thead>
                  <tbody>
                    {t.daily.map((d, i) => (
                      <tr key={i}>
                        <td style={td}>{fmtDay(d.day)}</td>
                        <td style={td}>{d.uploader_phone}</td>
                        <td style={td}>{d.rows_inserted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
