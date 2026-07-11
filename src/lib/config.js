// Environment toggle for the product-owner portal.
// Set isProd = true to hit the deployed backend, false for local dev.

export const isProd = false;

export const API_BASE = isProd
  ? 'https://extraaedge-server.onrender.com/api/v1'
  : 'http://localhost:4000/api/v1';

// Grafana observability service (embedded in the Analytics page). Override at
// build time with VITE_GRAFANA_URL; falls back to the Render service URL in
// prod and localhost in dev. Empty string → the Analytics page shows a setup
// hint instead of a broken iframe.
export const GRAFANA_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GRAFANA_URL)
  || (isProd ? 'https://extraaedge-grafana.onrender.com' : 'http://localhost:3001');
