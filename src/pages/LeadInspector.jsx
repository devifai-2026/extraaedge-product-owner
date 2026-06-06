import { useEffect, useState } from 'react';
import { tenantsApi, inspectApi } from '../lib/endpoints';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');

const Badge = ({ children, color = '#4338ca', bg = '#eef2ff' }) => (
  <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{children}</span>
);

// Human-readable label for a timeline row, pulling in the backend-resolved
// fields (stage names, assignee + manager, prior owner) that the old UI threw
// away. Falls back to the raw `body` when there's nothing richer.
const timelineLabel = (t) => {
  const m = t.metadata_json || {};
  if (t.kind === 'activity') {
    switch (t.subtype) {
      case 'stage_changed': {
        const from = t.from_stage_name || (m.from ? 'previous stage' : '—');
        const to = t.to_stage_name || '—';
        const sub = t.to_sub_stage_name ? ` (${t.from_sub_stage_name || '—'} → ${t.to_sub_stage_name})` : '';
        const conv = m.converted === true ? ' · 🎉 converted' : m.converted === false ? ' · ↩ reopened' : '';
        return `Stage: ${from} → ${to}${sub}${conv}`;
      }
      case 'assigned':
      case 'auto_assign': {
        const who = t.assignee_name ? `${t.assignee_name}${t.assignee_email ? ` (${t.assignee_email})` : ''}` : '—';
        const mgr = t.assignee_manager_name ? `, reporting to ${t.assignee_manager_name}` : '';
        return `Assigned to ${who}${mgr}`;
      }
      case 'reassign':
      case 'refer': {
        const from = t.from_user_name ? `${t.from_user_name}${t.from_user_email ? ` (${t.from_user_email})` : ''}` : '—';
        const to = t.assignee_name ? `${t.assignee_name}${t.assignee_email ? ` (${t.assignee_email})` : ''}` : '—';
        const reason = m.reason ? ` · ${m.reason}` : '';
        return `${t.subtype === 'refer' ? 'Referred' : 'Reassigned'}: ${from} → ${to}${reason}`;
      }
      default:
        return t.body || t.subtype;
    }
  }
  return t.body || '';
};

// Generic raw-rows table: renders any array of objects with all columns. Used
// for the "everything else" dump so nothing is hidden from the product_owner.
const RawTable = ({ rows }) => {
  if (!rows || !rows.length) return <div style={{ color: '#9ca3af', fontSize: 12 }}>None</div>;
  const cols = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set()));
  const cell = (v) => {
    if (v == null) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };
  return (
    <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #f3f4f6', borderRadius: 6 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11, width: 'max-content', minWidth: '100%' }}>
        <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
          <tr>{cols.map((c) => <th key={c} style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb' }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid #f3f4f6', verticalAlign: 'top' }}>
              {cols.map((c) => <td key={c} style={{ padding: '4px 8px', whiteSpace: 'pre-wrap', maxWidth: 360, wordBreak: 'break-word' }}>{cell(r[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Collapsible section so the long "everything else" dump stays scannable.
function Section({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: open ? '#f8fafc' : '#fff', border: 0, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
        <span>{open ? '▾' : '▸'} {title}</span>
        {count != null && <Badge bg="#f1f5f9" color="#475569">{count}</Badge>}
      </button>
      {open && <div style={{ padding: 12, borderTop: '1px solid #f3f4f6' }}>{children}</div>}
    </div>
  );
}

function LeadDetail({ tenantId, lead, onOpenLead }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    inspectApi.getLead(tenantId, lead.id)
      .then((r) => setData(r?.data || null))
      .catch((e) => setError(e.message || 'Failed to load lead'))
      .finally(() => setLoading(false));
  }, [tenantId, lead.id]);

  if (loading) return <div style={{ padding: 16, color: '#6b7280' }}>Loading lead…</div>;
  if (error) return <div style={{ padding: 16, color: '#dc2626' }}>{error}</div>;
  if (!data) return null;
  const l = data.lead;
  const o = data.origin || {};
  const owner = l.current_owner;
  const sj = data.stage_journey || {};
  const related = data.related || {};
  const siblings = data.siblings || [];

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 8px' }}>{l.name || l.email || l.phone || 'Unnamed lead'}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#374151', marginBottom: 12 }}>
        <span><b>Email:</b> {l.email || '—'}</span>
        <span><b>Phone:</b> {l.phone || '—'}</span>
        <span><b>WhatsApp:</b> {l.whatsapp_number || '—'}</span>
        <span><b>Current stage:</b> {sj.current_stage?.name
          ? <Badge color="#1e3a8a" bg="#dbeafe">{sj.current_stage.name}{sj.current_stage.is_success ? ' 🎉' : ''}</Badge>
          : '—'}</span>
        <span><b>Current owner:</b> {owner?.assigned_to_name || '—'} {owner?.assigned_to_email ? `(${owner.assigned_to_email})` : ''}</span>
        <span><b>Created:</b> {fmt(l.created_at)}</span>
        <span><b>Lead score:</b> {l.lead_score ?? '—'}</span>
      </div>

      {/* DUPLICATE LEADS — the #1 reason "the owner/stage I remember is gone":
          there's a SECOND lead row for this person, and that history lives on
          the sibling, not this record. Surfaced loud, at the top, clickable. */}
      {siblings.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
            ⚠️ {siblings.length} other lead{siblings.length > 1 ? 's' : ''} for this same person (same phone / email / WhatsApp)
          </div>
          <div style={{ fontSize: 12, color: '#78350f', marginBottom: 8 }}>
            The stage / owner you expect may live on one of these duplicates — a re-import or manual re-create spawns a separate record. Click one to open it.
          </div>
          {siblings.map((s) => (
            <div key={s.id} onClick={() => onOpenLead && onOpenLead(s)}
              style={{ cursor: onOpenLead ? 'pointer' : 'default', background: '#fff', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', marginBottom: 4, fontSize: 12 }}>
              <b>{s.name || '—'}</b>
              {s.deleted_at ? <Badge color="#b91c1c" bg="#fee2e2">deleted</Badge> : null}
              {s.merged_into_id ? <Badge color="#6b7280" bg="#f3f4f6">merged</Badge> : null}
              {' · '}stage: <b>{s.stage_name || '—'}</b>
              {' · '}owner: <b>{s.owner_name || 'unassigned'}</b>{s.owner_email ? ` (${s.owner_email})` : ''}
              {' · '}<span style={{ color: '#9ca3af' }}>{Number(s.assignment_count) || 0} owner change(s) · created {fmt(s.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* STAGE FUNNEL — full pipeline with which stages this lead reached */}
      {(sj.stages || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
          {sj.stages.map((s) => {
            const reached = (sj.journey || []).some((j) => j.stage_id === s.id);
            const current = sj.current_stage?.id === s.id;
            return (
              <span key={s.id} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 4, fontWeight: 600,
                background: current ? '#0f172a' : reached ? '#dbeafe' : '#f3f4f6',
                color: current ? '#fff' : reached ? '#1e3a8a' : '#9ca3af',
                border: current ? '2px solid #0f172a' : '1px solid transparent',
              }}>{reached && !current ? '✓ ' : ''}{s.name}</span>
            );
          })}
        </div>
      )}

      {/* ORIGIN — how & by whom this lead entered the system */}
      <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>How this lead was added</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: '#374151' }}>
          <span><b>Entry method:</b>{' '}
            {o.via === 'bulk_upload'
              ? <Badge color="#9a3412" bg="#ffedd5">📤 Bulk upload</Badge>
              : o.via === 'manual'
                ? <Badge color="#1e40af" bg="#dbeafe">✍️ Manually created</Badge>
                : <Badge color="#6b7280" bg="#f3f4f6">unknown</Badge>}
          </span>
          <span><b>{o.via === 'bulk_upload' ? 'Uploaded by' : 'Created by'}:</b> {o.created_by_name || '—'} {o.created_by_email ? `(${o.created_by_email})` : ''} {o.created_by_role ? `· ${o.created_by_role}` : ''}</span>
          <span><b>First assignment:</b>{' '}
            {o.first_assignment_type
              ? (o.first_assigned_auto
                  ? <Badge color="#5b21b6" bg="#ede9fe">🤖 System auto-assigned (rule)</Badge>
                  : <Badge color="#065f46" bg="#d1fae5">👤 Assigned by a person</Badge>)
              : '—'}
            {o.first_assignment_type ? <span style={{ color: '#9ca3af', marginLeft: 4 }}>({o.first_assignment_type})</span> : null}
          </span>
        </div>
        {/* Explain the (very common, non-contradictory) case the UI was making
            look like a conflict: created by a person but owner picked by rule. */}
        {o.via === 'manual' && o.first_assigned_auto && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', background: '#fff', border: '1px dashed #d1d5db', borderRadius: 6, padding: '6px 10px' }}>
            ℹ️ <b>{o.created_by_name || 'A user'}</b> created this lead without choosing an owner, so the
            assignment <b>rule</b> picked the owner automatically. &ldquo;Manually created&rdquo; and
            &ldquo;auto-assigned&rdquo; both apply — they describe two different steps (who entered the
            lead vs. who chose the owner).
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Ownership history — who assigned, to whom, auto vs manual */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Ownership history (newest first)</div>
          {(l.assignments || []).length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>None</div>}
          {(l.assignments || []).map((a) => {
            const auto = a.assigned_by == null;
            return (
              <div key={a.id} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <Badge color={a.is_active ? '#065f46' : '#6b7280'} bg={a.is_active ? '#d1fae5' : '#f3f4f6'}>{a.assignment_type}</Badge>{' '}
                  {auto
                    ? <Badge color="#5b21b6" bg="#ede9fe">🤖 auto</Badge>
                    : <Badge color="#1e40af" bg="#dbeafe">👤 manual</Badge>}
                  {a.is_active ? <Badge color="#065f46" bg="#d1fae5">active</Badge> : null}
                </div>
                <div style={{ marginTop: 3 }}>
                  {a.from_user_name ? <><b>{a.from_user_name}</b> → </> : ''}
                  <b>{a.assigned_to_name || '—'}</b>
                  {a.assigned_to_email ? <span style={{ color: '#9ca3af' }}> ({a.assigned_to_email})</span> : ''}
                </div>
                <div style={{ color: '#9ca3af', marginTop: 2 }}>
                  {auto ? 'by system' : `by ${a.assigned_by_name || 'unknown'}`} · {fmt(a.created_at)}
                  {a.reason ? ` · ${a.reason}` : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Followups */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Follow-ups</div>
          {(l.followups || []).length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>None</div>}
          {(l.followups || []).map((f) => (
            <div key={f.id} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
              <Badge>{f.status}</Badge> {fmt(f.next_action_datetime)}
              {f.comment ? <div style={{ color: '#6b7280' }}>{f.comment}</div> : null}
            </div>
          ))}
        </div>
      </div>

      {/* STAGE JOURNEY — per stage: when entered/left, who owned it, and how
          reassignment happened while in that stage. */}
      {(sj.journey || []).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Stage journey — owners &amp; reassignments per stage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sj.journey.map((j, i) => (
              <div key={i} style={{ border: '1px solid', borderColor: j.is_current ? '#0f172a' : '#e5e7eb', borderRadius: 8, padding: 10, background: j.is_current ? '#f8fafc' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Badge color={j.is_current ? '#fff' : '#1e3a8a'} bg={j.is_current ? '#0f172a' : '#dbeafe'}>
                    {i + 1}. {j.stage_name || '—'}{j.is_success ? ' 🎉' : ''}{j.is_current ? ' · CURRENT' : ''}
                  </Badge>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>
                    {fmt(j.entered_at)} {j.left_at ? `→ ${fmt(j.left_at)}` : '→ now'}
                  </span>
                  {j.moved_by ? <span style={{ fontSize: 11, color: '#9ca3af' }}>moved here by {j.moved_by}</span> : null}
                  {j.reassignments_in_stage > 0 && <Badge color="#92400e" bg="#fef3c7">{j.reassignments_in_stage} reassignment{j.reassignments_in_stage > 1 ? 's' : ''} in this stage</Badge>}
                </div>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  {(j.owners || []).length === 0 && <span style={{ color: '#9ca3af' }}>No owner recorded for this stage.</span>}
                  {(j.owners || []).map((ow, oi) => (
                    <div key={oi} style={{ padding: '3px 0', color: '#374151' }}>
                      {ow.carried_over
                        ? <Badge color="#475569" bg="#f1f5f9">↪ carried over</Badge>
                        : ow.auto ? <Badge color="#5b21b6" bg="#ede9fe">🤖 auto</Badge> : <Badge color="#1e40af" bg="#dbeafe">👤 reassigned</Badge>}
                      {' '}
                      {ow.from_user_name ? <><b>{ow.from_user_name}</b> → </> : ''}
                      <b>{ow.assigned_to_name || '—'}</b>
                      {ow.assigned_to_email ? <span style={{ color: '#9ca3af' }}> ({ow.assigned_to_email})</span> : ''}
                      {!ow.carried_over && <span style={{ color: '#9ca3af' }}> · {ow.auto ? 'by system' : `by ${ow.assigned_by_name || 'unknown'}`} · {fmt(ow.at)}{ow.reason ? ` · ${ow.reason}` : ''}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline — now with resolved stage/owner labels, not bare subtypes */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Timeline ({data.timeline?.length || 0})</div>
        <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #f3f4f6', borderRadius: 6 }}>
          {(data.timeline || []).map((t) => (
            <div key={`${t.kind}-${t.id}`} style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
              <span style={{ color: '#9ca3af' }}>{fmt(t.created_at)}</span>{' '}
              <Badge bg="#f1f5f9" color="#475569">{t.kind}:{t.subtype}</Badge>{' '}
              {timelineLabel(t)}
              {t.user_name ? <span style={{ color: '#6b7280' }}> — by {t.user_name}</span> : null}
            </div>
          ))}
        </div>
      </div>

      {/* EVERYTHING ELSE — raw per-lead records, nothing hidden. */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Full record (everything on this lead)</div>

        <Section title="Lead — all columns" count={Object.keys(l).length}>
          <RawTable rows={[Object.fromEntries(Object.entries(l).filter(([, v]) => typeof v !== 'object' || v == null))]} />
        </Section>
        <Section title="Family" count={l.family ? 1 : 0}>{l.family ? <RawTable rows={[l.family]} /> : <div style={{ color: '#9ca3af', fontSize: 12 }}>None</div>}</Section>
        <Section title="Source attributions" count={(l.sources || []).length}><RawTable rows={l.sources} /></Section>
        <Section title="Tags" count={(l.tags || []).length}><RawTable rows={l.tags} /></Section>
        <Section title="Custom fields" count={Object.keys(l.custom_values || {}).length}>
          <RawTable rows={Object.entries(l.custom_values || {}).map(([k, v]) => ({ field: k, value: v }))} />
        </Section>
        <Section title="Notes" count={(related.notes || []).length}><RawTable rows={related.notes} /></Section>
        <Section title="Calls" count={(related.calls || []).length}><RawTable rows={related.calls} /></Section>
        <Section title="Call recordings" count={(related.call_recordings || []).length}><RawTable rows={related.call_recordings} /></Section>
        <Section title="Messages (SMS / WhatsApp / Email)" count={(related.messages || []).length}><RawTable rows={related.messages} /></Section>
        <Section title="Message replies" count={(related.message_replies || []).length}><RawTable rows={related.message_replies} /></Section>
        <Section title="Touches" count={(related.touches || []).length}><RawTable rows={related.touches} /></Section>
        <Section title="Opt-ins" count={(related.optins || []).length}><RawTable rows={related.optins} /></Section>
        <Section title="Suppression entries" count={(related.suppressions || []).length}><RawTable rows={related.suppressions} /></Section>
        <Section title="SLA alerts" count={(related.sla_alerts || []).length}><RawTable rows={related.sla_alerts} /></Section>
        <Section title="Payments" count={(related.payments || []).length}><RawTable rows={related.payments} /></Section>
        <Section title="Payment links" count={(related.payment_links || []).length}><RawTable rows={related.payment_links} /></Section>
        <Section title="Payment attributions" count={(related.payment_attributions || []).length}><RawTable rows={related.payment_attributions} /></Section>
        <Section title="Referral codes" count={(related.referral_codes || []).length}><RawTable rows={related.referral_codes} /></Section>
        <Section title="Referral credits" count={(related.referral_credits || []).length}><RawTable rows={related.referral_credits} /></Section>
        <Section title="Fee offer" count={related.fee_offer ? 1 : 0}>{related.fee_offer ? <RawTable rows={[related.fee_offer]} /> : <div style={{ color: '#9ca3af', fontSize: 12 }}>None</div>}</Section>
        <Section title="Admissions" count={(related.admissions || []).length}>
          {(related.admissions || []).length === 0 && <div style={{ color: '#9ca3af', fontSize: 12 }}>None</div>}
          {(related.admissions || []).map((a) => (
            <div key={a.id} style={{ marginBottom: 10 }}>
              <RawTable rows={[Object.fromEntries(Object.entries(a).filter(([k]) => !['receipts', 'fee_schedule', 'education'].includes(k)))]} />
              <div style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 2px' }}>Receipts</div><RawTable rows={a.receipts} />
              <div style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 2px' }}>Fee schedule</div><RawTable rows={a.fee_schedule} />
              <div style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 2px' }}>Education</div><RawTable rows={a.education} />
            </div>
          ))}
        </Section>
        <Section title="Admission events" count={(related.admission_events || []).length}><RawTable rows={related.admission_events} /></Section>
        <Section title="Duplicate matches" count={(related.duplicate_matches || []).length}><RawTable rows={related.duplicate_matches} /></Section>
        <Section title="Merge log" count={(related.merge_log || []).length}><RawTable rows={related.merge_log} /></Section>
        <Section title="Outbound webhook deliveries" count={(related.outbound_webhook_deliveries || []).length}><RawTable rows={related.outbound_webhook_deliveries} /></Section>
      </div>
    </div>
  );
}

function BulkImports({ tenantId }) {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    setLoading(true);
    inspectApi.bulkImports(tenantId, { limit: 100 })
      .then((r) => setImports(r?.data?.imports || []))
      .catch(() => setImports([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const openDetail = async (id) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id); setDetail(null);
    try { const r = await inspectApi.bulkImport(tenantId, id); setDetail(r?.data || null); }
    catch { setDetail({ _error: 'Failed to load' }); }
  };

  if (loading) return <div style={{ color: '#6b7280' }}>Loading imports…</div>;
  if (!imports.length) return <div style={{ color: '#9ca3af' }}>No bulk imports for this tenant.</div>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: '#f9fafb' }}>
        <tr>{['When', 'File', 'Status', 'Total', 'OK', 'Failed', 'Dup', 'By'].map((h) => (
          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#6b7280' }}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {imports.map((bi) => (
          <>
            <tr key={bi.id} onClick={() => openDetail(bi.id)} style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6', background: bi.status === 'failed' ? '#fef2f2' : '#fff' }}>
              <td style={{ padding: '8px 10px', fontSize: 12 }}>{fmt(bi.created_at)}</td>
              <td style={{ padding: '8px 10px', fontSize: 12 }}>{bi.file_name || '—'}</td>
              <td style={{ padding: '8px 10px', fontSize: 12 }}>
                <Badge color={bi.status === 'failed' ? '#b91c1c' : bi.status === 'completed' ? '#065f46' : '#92400e'}
                       bg={bi.status === 'failed' ? '#fee2e2' : bi.status === 'completed' ? '#d1fae5' : '#fef3c7'}>{bi.status}</Badge>
              </td>
              <td style={{ padding: '8px 10px', fontSize: 12 }}>{bi.total_rows}</td>
              <td style={{ padding: '8px 10px', fontSize: 12, color: '#16a34a' }}>{bi.success_rows}</td>
              <td style={{ padding: '8px 10px', fontSize: 12, color: '#dc2626' }}>{bi.failed_rows}</td>
              <td style={{ padding: '8px 10px', fontSize: 12, color: '#6b7280' }}>{bi.duplicate_rows}</td>
              <td style={{ padding: '8px 10px', fontSize: 12 }}>{bi.by_email || '—'}</td>
            </tr>
            {openId === bi.id && (
              <tr>
                <td colSpan={8} style={{ padding: 12, background: '#f8fafc' }}>
                  {!detail && <div style={{ color: '#6b7280' }}>Loading failures…</div>}
                  {detail?._error && <div style={{ color: '#dc2626' }}>{detail._error}</div>}
                  {detail && !detail._error && (
                    <div>
                      <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>
                        <b>{detail.failures?.length || 0}</b> failed rows · handling: {detail.import?.duplicate_handling}
                      </div>
                      {(detail.failures || []).length > 0 && (
                        <div style={{ maxHeight: 320, overflowX: 'auto', overflowY: 'auto' }}>
                          <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 900, width: 'max-content' }}>
                            <thead><tr>{['Row', 'Error', 'Message', 'Raw'].map((h) => <th key={h} style={{ textAlign: 'left', padding: 4, color: '#6b7280', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {detail.failures.map((f, i) => (
                                <tr key={i} style={{ borderTop: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                                  <td style={{ padding: 4, whiteSpace: 'nowrap' }}>{f.row_number}</td>
                                  <td style={{ padding: 4, color: '#b91c1c', whiteSpace: 'nowrap' }}>{f.error_code || '—'}</td>
                                  <td style={{ padding: 4, minWidth: 200 }}>{f.error_message || '—'}</td>
                                  <td style={{ padding: 4 }}>
                                    <code style={{ fontSize: 11, whiteSpace: 'pre', display: 'block' }}>
                                      {f.raw_row_json ? JSON.stringify(f.raw_row_json) : '—'}
                                    </code>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </>
        ))}
      </tbody>
    </table>
  );
}

export default function LeadInspector() {
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState('');
  const [tab, setTab] = useState('leads'); // leads | bulk
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    tenantsApi.list({ limit: 200 }).then((r) => setTenants(r?.data || [])).catch(() => {});
  }, []);

  const search = async () => {
    if (!tenantId) { setError('Pick a tenant first'); return; }
    setSearching(true); setError(''); setSelected(null);
    try { const r = await inspectApi.searchLeads(tenantId, { q: q || undefined, limit: 50 }); setResults(r?.data || []); }
    catch (e) { setError(e.message || 'Search failed'); }
    finally { setSearching(false); }
  };

  const inputStyle = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>🔎 Lead Inspector</h1>
      <p style={{ marginTop: -8, color: '#6b7280', fontSize: 13 }}>Drill into any tenant&apos;s lead — full details, ownership history, follow-ups & timeline — or audit a tenant&apos;s bulk uploads.</p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={tenantId} onChange={(e) => { setTenantId(e.target.value); setResults([]); setSelected(null); }} style={inputStyle}>
          <option value="">Select tenant…</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
        </select>
        <div style={{ display: 'flex', gap: 0, border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
          {['leads', 'bulk'].map((tb) => (
            <button key={tb} onClick={() => setTab(tb)} style={{ padding: '8px 14px', border: 0, cursor: 'pointer', background: tab === tb ? '#0f172a' : '#fff', color: tab === tb ? '#fff' : '#374151', fontSize: 13 }}>
              {tb === 'leads' ? 'Leads' : 'Bulk imports'}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: 12, color: '#dc2626' }}>{error}</div>}
      {!tenantId && <div style={{ color: '#9ca3af', padding: 24, textAlign: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>Select a tenant to begin.</div>}

      {tenantId && tab === 'leads' && (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '340px 1fr' : '1fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="name / email / phone" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={search} style={{ padding: '8px 14px', background: '#0f172a', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Search</button>
            </div>
            {searching && <div style={{ color: '#6b7280' }}>Searching…</div>}
            {!searching && results.map((r) => (
              <div key={r.id} onClick={() => setSelected(r)}
                style={{ padding: 10, borderRadius: 6, cursor: 'pointer', marginBottom: 4, border: '1px solid', borderColor: selected?.id === r.id ? '#0f172a' : '#f3f4f6', background: selected?.id === r.id ? '#f8fafc' : '#fff' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name || r.email || r.phone || 'Unnamed'}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{r.email || r.phone} · {r.stage_name || 'no stage'} · {r.assigned_to_name || 'unassigned'}</div>
              </div>
            ))}
            {!searching && results.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>No results yet — run a search.</div>}
          </div>
          {selected && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <LeadDetail tenantId={tenantId} lead={selected} onOpenLead={(s) => setSelected(s)} />
            </div>
          )}
        </div>
      )}

      {tenantId && tab === 'bulk' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflowX: 'auto', padding: 4 }}>
          <BulkImports tenantId={tenantId} />
        </div>
      )}
    </div>
  );
}
