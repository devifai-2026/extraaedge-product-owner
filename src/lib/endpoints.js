import { api, auth } from './api';

export const authApi = {
  login: ({ email, password }) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Platform-level (product_owner / support_admin scope)
export const tenantsApi = {
  list: (params) => api.get('/platform/tenants', params),
  get: (id) => api.get(`/platform/tenants/${id}`),
  create: (body) => api.post('/platform/tenants', body),
  update: (id, body) => api.put(`/platform/tenants/${id}`, body),
  suspend: (id) => api.post(`/platform/tenants/${id}/suspend`),
  resume: (id) => api.post(`/platform/tenants/${id}/resume`),
  // Soft-delete: marks deleted_at + status='cancelled'. The underlying
  // tenant_<slug> database is preserved for audit / recovery.
  delete: (id) => api.delete(`/platform/tenants/${id}`),
  // Org hierarchy of the tenant — owner → managers → counsellors as a tree.
  orgTree: (id) => api.get(`/platform/tenants/${id}/org-tree`),
};

export const platformUsersApi = {
  list: (params) => api.get('/platform/users', params),
  create: (body) => api.post('/platform/users', body),
  update: (id, body) => api.put(`/platform/users/${id}`, body),
};

export const auditLogApi = {
  list: (params) => api.get('/platform/audit-log', params),
};

// Danger Request Log — full cross-tenant API activity (product_owner only).
export const requestLogApi = {
  list: (params) => api.get('/platform/request-log', params),
  get: (id) => api.get(`/platform/request-log/${id}`),
  facets: () => api.get('/platform/request-log/facets'),
  // Cross-tenant API activity metrics for the live graphs.
  metrics: (window) => api.get('/platform/request-log/metrics', window ? { window } : undefined),
};

// Cross-tenant lead inspector.
export const inspectApi = {
  searchLeads: (tenantId, params) => api.get(`/platform/inspect/${tenantId}/leads`, params),
  getLead: (tenantId, leadId) => api.get(`/platform/inspect/${tenantId}/leads/${leadId}`),
  bulkImports: (tenantId, params) => api.get(`/platform/inspect/${tenantId}/bulk-imports`, params),
  bulkImport: (tenantId, importId) => api.get(`/platform/inspect/${tenantId}/bulk-imports/${importId}`),
  // Restore a soft-deleted/merged-away lead, retiring the live duplicate that
  // blocks the phone-unique index. Returns { restored_lead_id, retired_lead_ids }.
  restoreLead: (tenantId, leadId) => api.post(`/platform/inspect/${tenantId}/leads/${leadId}/restore`),
};

export const plansApi = {
  list: () => api.get('/platform/plans'),
};

export const supportTicketsApi = {
  list: (params) => api.get('/platform/tickets', params),
  get: (id) => api.get(`/platform/tickets/${id}`),
  update: (id, body) => api.patch(`/platform/tickets/${id}`, body),
  comment: (id, body) => api.post(`/platform/tickets/${id}/comments`, body),
};

export { auth };
