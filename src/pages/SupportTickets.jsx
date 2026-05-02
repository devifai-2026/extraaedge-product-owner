import { useCallback, useEffect, useState } from 'react';
import { supportTicketsApi } from '../lib/endpoints';

const STATUS_COLORS = {
  open: '#ef6c00',
  in_progress: '#2563eb',
  resolved: '#16a34a',
  closed: '#6b7280',
};
const PRIORITY_COLORS = { urgent: '#d32f2f', high: '#f57c00', normal: '#666', low: '#999' };
const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };

export default function SupportTickets() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null); // detail drawer
  const [draftComment, setDraftComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await supportTicketsApi.list({
        status: statusFilter || undefined,
        q: q || undefined,
      });
      setItems(res?.data || []);
    } catch (e) { setError(e.message || 'Failed to load support tickets'); }
    finally { setLoading(false); }
  }, [statusFilter, q]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    try {
      const r = await supportTicketsApi.get(id);
      setActive(r?.data || null);
      setDraftComment('');
    } catch (e) { alert(e.message); }
  };

  const updateStatus = async (id, status) => {
    try {
      await supportTicketsApi.update(id, { status });
      await load();
      if (active?.id === id) await openDetail(id);
    } catch (e) { alert(e.message); }
  };

  const addComment = async () => {
    if (!draftComment.trim() || !active) return;
    try {
      await supportTicketsApi.comment(active.id, { body: draftComment.trim() });
      setDraftComment('');
      await openDetail(active.id);
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>
          Support tickets <span style={{ color: '#888', fontWeight: 400, fontSize: 14 }}>({items.length})</span>
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Search subject / description / email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {error && <div style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>}

      <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={th}>Subject</th>
              <th style={th}>Tenant</th>
              <th style={th}>Raised by</th>
              <th style={th}>Priority</th>
              <th style={th}>Status</th>
              <th style={th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={td}>Loading…</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, color: '#888' }}>No tickets in this view.</td></tr>
            )}
            {items.map((t) => (
              <tr key={t.id} style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => openDetail(t.id)}>
                <td style={td}>
                  <div style={{ fontWeight: 500 }}>{t.subject}</div>
                  {t.description && <div style={{ fontSize: 12, color: '#666' }}>{t.description.slice(0, 80)}{t.description.length > 80 ? '…' : ''}</div>}
                </td>
                <td style={td}>
                  <div>{t.tenant_name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{t.tenant_slug}</div>
                </td>
                <td style={td}>
                  <div>{t.raised_by_name || t.raised_by_email}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{t.raised_by_email}{t.raised_by_phone ? ` · ${t.raised_by_phone}` : ''}</div>
                </td>
                <td style={td}>
                  <span style={{ color: PRIORITY_COLORS[t.priority] || '#666', fontWeight: 600, textTransform: 'capitalize' }}>{t.priority}</span>
                </td>
                <td style={td}>
                  <select
                    value={t.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                    style={{ padding: '4px 8px', border: `1px solid ${STATUS_COLORS[t.status] || '#888'}`, borderRadius: 4, color: STATUS_COLORS[t.status] || '#444', fontWeight: 500 }}
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td style={td}>{t.created_at ? new Date(t.created_at).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && (
        <div style={drawerOverlay} onClick={() => setActive(null)}>
          <div style={drawer} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{active.subject}</h2>
              <button onClick={() => setActive(null)} style={closeBtn}>✕</button>
            </div>
            <div style={metaRow}><b>Tenant:</b> {active.tenant_name} <span style={{ color: '#888' }}>({active.tenant_slug})</span></div>
            <div style={metaRow}><b>Raised by:</b> {active.raised_by_name} · {active.raised_by_email}{active.raised_by_phone ? ` · ${active.raised_by_phone}` : ''}</div>
            <div style={metaRow}><b>Priority:</b> <span style={{ color: PRIORITY_COLORS[active.priority] || '#666', fontWeight: 600, textTransform: 'capitalize' }}>{active.priority}</span></div>
            <div style={metaRow}>
              <b>Status:</b>{' '}
              <select
                value={active.status}
                onChange={(e) => updateStatus(active.id, e.target.value)}
                style={{ padding: '4px 8px', border: `1px solid ${STATUS_COLORS[active.status] || '#888'}`, borderRadius: 4, color: STATUS_COLORS[active.status] || '#444', fontWeight: 500 }}
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {active.description && (
              <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, whiteSpace: 'pre-wrap' }}>{active.description}</div>
            )}

            <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: 14 }}>Conversation</h3>
            <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: 8, background: '#fafafa' }}>
              {(active.comments || []).length === 0 && <div style={{ color: '#888', fontSize: 13 }}>No replies yet.</div>}
              {(active.comments || []).map((c) => (
                <div key={c.id} style={{ borderBottom: '1px solid #eee', padding: '6px 4px' }}>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    <b>{c.platform_user_name ? `${c.platform_user_name} (PO)` : c.author_name || 'Tenant user'}</b>
                    <span style={{ color: '#888', marginLeft: 8 }}>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{c.body}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <textarea
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                rows={3}
                placeholder="Reply to the tenant…"
                style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
              />
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <button onClick={addComment} disabled={!draftComment.trim()} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, opacity: draftComment.trim() ? 1 : 0.5 }}>
                  Send reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { padding: '10px 12px', fontWeight: 600, fontSize: 13, color: '#374151' };
const td = { padding: '10px 12px', verticalAlign: 'top' };
const drawerOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' };
const drawer = { width: 560, maxWidth: '100%', height: '100%', background: '#fff', padding: 24, overflowY: 'auto', boxShadow: '-2px 0 12px rgba(0,0,0,0.1)' };
const closeBtn = { background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' };
const metaRow = { fontSize: 13, marginBottom: 6 };
