import { useEffect, useState } from 'react';
import { feedbackApi } from '../lib/endpoints';

// Cross-tenant user feedback (5-star + comment), grouped tenant-wise. Shows
// each respondent's name / email / phone (phone → "N/A" when absent).
const Stars = ({ n }) => (
  <span style={{ color: '#F5B301', letterSpacing: 1 }} title={`${n} / 5`}>
    {'★'.repeat(n)}<span style={{ color: '#D0D5DD' }}>{'★'.repeat(5 - n)}</span>
  </span>
);

const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

function Feedback() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await feedbackApi.list();
        const data = res?.data ?? res ?? [];
        if (!cancelled) setGroups(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load feedback');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalResponses = groups.reduce((s, g) => s + (g.count || 0), 0);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>User Feedback</h1>
      <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>
        {loading ? 'Loading…' : `${totalResponses} response${totalResponses === 1 ? '' : 's'} across ${groups.length} tenant${groups.length === 1 ? '' : 's'}`}
      </p>

      {error ? <div style={{ color: '#b91c1c', marginBottom: 16 }}>{error}</div> : null}
      {!loading && !error && groups.length === 0 ? (
        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>No feedback submitted yet.</div>
      ) : null}

      {groups.map((g) => (
        <div key={g.tenant_id} style={{ marginBottom: 28, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {g.tenant_name} <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 13 }}>({g.tenant_slug})</span>
            </div>
            <div style={{ fontSize: 13, color: '#374151' }}>
              {g.count} response{g.count === 1 ? '' : 's'} · avg <b>{g.avg_rating}</b> ★
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6b7280', background: '#fff' }}>
                  <th style={th}>User</th>
                  <th style={th}>Email</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Rating</th>
                  <th style={th}>Comment</th>
                  <th style={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {g.responses.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={td}>{r.user_name}</td>
                    <td style={td}>{r.email}</td>
                    <td style={{ ...td, color: r.phone === 'N/A' ? '#9ca3af' : '#111827' }}>{r.phone}</td>
                    <td style={td}><Stars n={r.rating} /></td>
                    <td style={{ ...td, maxWidth: 420, whiteSpace: 'pre-wrap' }}>{r.comment}</td>
                    <td style={{ ...td, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

const th = { padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 };
const td = { padding: '10px 14px', verticalAlign: 'top' };

export default Feedback;
