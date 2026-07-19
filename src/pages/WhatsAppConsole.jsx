// PO WhatsApp console — pick any tenant, then: view its conversations
// (read-only, incoming + outgoing), edit its WhatsApp config/webhook, and
// manage its message templates. PRODUCT_OWNER only (backend-gated).
import { useEffect, useState } from 'react';
import { tenantsApi, platformWhatsappApi } from '../lib/endpoints';

const inputStyle = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 };
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 };
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '');

function Messages({ tenantId }) {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); setActive(null); setMessages([]);
    platformWhatsappApi.chats(tenantId).then((r) => setChats(r?.data || [])).catch(() => setChats([])).finally(() => setLoading(false));
  }, [tenantId]);

  const open = (c) => { setActive(c); platformWhatsappApi.messages(tenantId, c.phone).then((r) => setMessages(r?.data || [])).catch(() => setMessages([])); };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      <div style={{ ...card, padding: 8, maxHeight: 560, overflowY: 'auto' }}>
        {loading ? <div style={{ padding: 16, color: '#9ca3af' }}>Loading…</div>
          : chats.length === 0 ? <div style={{ padding: 16, color: '#9ca3af' }}>No conversations.</div>
          : chats.map((c) => (
            <div key={c.phone} onClick={() => open(c)} style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', background: active?.phone === c.phone ? '#eef2ff' : 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b style={{ fontSize: 13 }}>{c.name || c.phone}{c.lead_id ? <span style={{ marginLeft: 6, fontSize: 10, background: '#25D366', color: '#fff', padding: '0 5px', borderRadius: 3 }}>LEAD</span> : null}</b>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(c.last_at)}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last_body}</div>
              {c.lead_owner_name && <div style={{ fontSize: 11, color: '#94a3b8' }}>👤 {c.lead_owner_name}</div>}
            </div>
          ))}
      </div>
      <div style={{ ...card, padding: 16, minHeight: 300, background: '#efeae2', maxHeight: 560, overflowY: 'auto' }}>
        {!active ? <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: 120 }}>Select a conversation</div>
          : messages.length === 0 ? <div style={{ color: '#8696a0', textAlign: 'center', marginTop: 120 }}>No messages.</div>
          : messages.map((m) => (
            <div key={`${m.direction}-${m.id}`} style={{
              maxWidth: '70%', margin: '4px 0', padding: '6px 10px', borderRadius: 8, fontSize: 14,
              alignSelf: m.direction === 'out' ? 'flex-end' : 'flex-start',
              marginLeft: m.direction === 'out' ? 'auto' : 0,
              background: m.direction === 'out' ? '#d9fdd3' : '#fff',
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
              <div style={{ fontSize: 10, color: '#667781', textAlign: 'right' }}>{fmt(m.at)}{m.direction === 'out' && m.status ? ` · ${m.status}` : ''}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

function Config({ tenantId }) {
  const [form, setForm] = useState(null);
  const [webhook, setWebhook] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    platformWhatsappApi.settings(tenantId).then((r) => {
      const d = r?.data || {};
      setForm({ enabled: !!d.enabled, app_key: d.app_key || '', auth_key: d.auth_key || '', device_id: d.device_id || '', business_phone: d.business_phone || '' });
      setWebhook(d.webhook_url || '');
    }).catch(() => setForm({ enabled: false, app_key: '', auth_key: '', device_id: '', business_phone: '' }));
  }, [tenantId]);

  const save = async () => {
    setBusy(true); setMsg('');
    try { await platformWhatsappApi.saveSettings(tenantId, form); setMsg('Saved ✓'); }
    catch (e) { setMsg(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  if (!form) return <div style={{ color: '#9ca3af' }}>Loading…</div>;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div style={{ ...card, padding: 20, maxWidth: 640 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 12 }}>
        <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} /> WhatsApp enabled
      </label>
      <div style={{ display: 'grid', gap: 10 }}>
        <input style={inputStyle} placeholder="WABridge App Key" value={form.app_key} onChange={set('app_key')} />
        <input style={inputStyle} placeholder="WABridge Auth Key (leave •••• to keep)" value={form.auth_key} onChange={set('auth_key')} />
        <input style={inputStyle} placeholder="WABridge Device ID" value={form.device_id} onChange={set('device_id')} />
        <input style={inputStyle} placeholder="Business WhatsApp number (91…)" value={form.business_phone} onChange={set('business_phone')} />
      </div>
      <div style={{ marginTop: 14 }}>
        <button onClick={save} disabled={busy} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{busy ? 'Saving…' : 'Save config'}</button>
        {msg && <span style={{ marginLeft: 12, fontSize: 13, color: '#16a34a' }}>{msg}</span>}
      </div>
      {webhook && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Incoming webhook URL (paste into this tenant's WABridge portal):</div>
          <input style={{ ...inputStyle, width: '100%' }} readOnly value={webhook} onFocus={(e) => e.target.select()} />
        </div>
      )}
    </div>
  );
}

function Templates({ tenantId }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ template_id: '', label: '', body: '', category: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => platformWhatsappApi.templates(tenantId).then((r) => setRows(r?.data || [])).catch(() => setRows([]));
  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!form.template_id.trim() || !form.label.trim() || !form.body.trim()) { setMsg('Template id, label and body required'); return; }
    setBusy(true); setMsg('');
    try { await platformWhatsappApi.addTemplate(tenantId, form); setForm({ template_id: '', label: '', body: '', category: '' }); load(); }
    catch (e) { setMsg(e.message || 'Failed'); }
    finally { setBusy(false); }
  };
  const remove = async (id) => { await platformWhatsappApi.deleteTemplate(tenantId, id).catch(() => {}); load(); };
  const varCount = (form.body.match(/\{\{\d+\}\}/g) || []).length;

  return (
    <div style={{ ...card, padding: 20, maxWidth: 720 }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Register WABridge-approved templates (portal id + body + variables). Use {'{{1}}'}, {'{{2}}'}… for variables.</div>
      {msg && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{msg}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input style={inputStyle} placeholder="Template ID" value={form.template_id} onChange={(e) => setForm((f) => ({ ...f, template_id: e.target.value }))} />
        <input style={inputStyle} placeholder="Label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
      </div>
      <textarea style={{ ...inputStyle, width: '100%', marginTop: 10, minHeight: 60 }} placeholder="Message body with {{1}}, {{2}}…" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
      <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input style={{ ...inputStyle, width: 200 }} placeholder="Category (optional)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{varCount} vars</span>
        <button onClick={add} disabled={busy} style={{ padding: '8px 14px', background: '#0f172a', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{busy ? 'Saving…' : 'Add template'}</button>
      </div>
      <div style={{ marginTop: 16 }}>
        {rows.length === 0 ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No templates.</div> : rows.map((t) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid #eef2f6' }}>
            <div style={{ paddingRight: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· id {t.template_id} · {t.variable_count} vars</span></div>
              <div style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{t.body}</div>
            </div>
            <button onClick={() => remove(t.id)} style={{ border: 0, background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WhatsAppConsole() {
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState('');
  const [tab, setTab] = useState('messages'); // messages | config | templates

  useEffect(() => { tenantsApi.list({ limit: 200 }).then((r) => setTenants(r?.data || [])).catch(() => {}); }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>💬 WhatsApp</h1>
      <p style={{ marginTop: -8, color: '#6b7280', fontSize: 13 }}>Monitor any tenant&apos;s WhatsApp conversations, edit its WABridge config &amp; webhook, and manage its templates.</p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={inputStyle}>
          <option value="">Select tenant…</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
        </select>
        {tenantId && (
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
            {['messages', 'config', 'templates'].map((tb) => (
              <button key={tb} onClick={() => setTab(tb)} style={{ padding: '8px 14px', border: 0, cursor: 'pointer', background: tab === tb ? '#0f172a' : '#fff', color: tab === tb ? '#fff' : '#374151', fontSize: 13, textTransform: 'capitalize' }}>{tb}</button>
            ))}
          </div>
        )}
      </div>

      {!tenantId && <div style={{ color: '#9ca3af', padding: 24, textAlign: 'center', ...card }}>Select a tenant to begin.</div>}
      {tenantId && tab === 'messages' && <Messages tenantId={tenantId} />}
      {tenantId && tab === 'config' && <Config tenantId={tenantId} />}
      {tenantId && tab === 'templates' && <Templates tenantId={tenantId} />}
    </div>
  );
}
