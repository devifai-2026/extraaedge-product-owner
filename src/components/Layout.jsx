import { NavLink, useNavigate } from 'react-router-dom';
import { auth, authApi } from '../lib/endpoints';

const sidebarItems = [
  { to: '/analytics', label: 'Analytics', icon: '📊' },
  { to: '/tenants', label: 'Tenants', icon: '🏢' },
  { to: '/platform-users', label: 'Platform users', icon: '👤' },
  { to: '/support-tickets', label: 'Support tickets', icon: '🎫' },
  { to: '/audit', label: 'Audit log', icon: '📋' },
  { to: '/request-log', label: 'Danger Request Log', icon: '🚨' },
  { to: '/lead-inspector', label: 'Lead Inspector', icon: '🔎' },
  { to: '/plans', label: 'Plans', icon: '💼' },
  { to: '/profile', label: 'My profile', icon: '⚙️' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const user = auth.getUser();

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    auth.clear();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, background: '#0f172a', color: '#cbd5e1', padding: 20, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 24 }}>
          ExtraEdge<span style={{ color: '#60a5fa' }}> · PO</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sidebarItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              style={({ isActive }) => ({
                display: 'block', padding: '10px 12px', borderRadius: 6,
                background: isActive ? '#1e293b' : 'transparent',
                color: isActive ? '#fff' : '#cbd5e1',
              })}
            >
              <span style={{ marginRight: 8 }}>{it.icon}</span>{it.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid #1e293b', fontSize: 12 }}>
          <div style={{ color: '#fff', fontWeight: 600 }}>{user?.name || user?.email}</div>
          <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}>{user?.role}</div>
          <button onClick={logout} style={{ background: 'transparent', color: '#f87171', border: '1px solid #1e293b', padding: '6px 10px', borderRadius: 4, cursor: 'pointer', width: '100%' }}>Log out</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
