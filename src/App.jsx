import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import Tenants from './pages/Tenants.jsx';
import CreateTenant from './pages/CreateTenant.jsx';
import TenantDetails from './pages/TenantDetails.jsx';
import AuditLog from './pages/AuditLog.jsx';
import DangerRequestLog from './pages/DangerRequestLog.jsx';
import LeadInspector from './pages/LeadInspector.jsx';
import PlatformUsers from './pages/PlatformUsers.jsx';
import Plans from './pages/Plans.jsx';
import Profile from './pages/Profile.jsx';
import SupportTickets from './pages/SupportTickets.jsx';
import { auth } from './lib/api';

const Protected = ({ children }) => (auth.isAuthed() ? children : <Navigate to="/login" replace />);

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Layout><Tenants /></Layout></Protected>} />
        <Route path="/tenants" element={<Protected><Layout><Tenants /></Layout></Protected>} />
        <Route path="/tenants/new" element={<Protected><Layout><CreateTenant /></Layout></Protected>} />
        <Route path="/tenants/:id" element={<Protected><Layout><TenantDetails /></Layout></Protected>} />
        <Route path="/audit" element={<Protected><Layout><AuditLog /></Layout></Protected>} />
        <Route path="/request-log" element={<Protected><Layout><DangerRequestLog /></Layout></Protected>} />
        <Route path="/lead-inspector" element={<Protected><Layout><LeadInspector /></Layout></Protected>} />
        <Route path="/platform-users" element={<Protected><Layout><PlatformUsers /></Layout></Protected>} />
        <Route path="/plans" element={<Protected><Layout><Plans /></Layout></Protected>} />
        <Route path="/support-tickets" element={<Protected><Layout><SupportTickets /></Layout></Protected>} />
        <Route path="/profile" element={<Protected><Layout><Profile /></Layout></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
